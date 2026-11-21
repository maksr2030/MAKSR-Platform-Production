import {
  constants,
  createPublicKey,
  createHash,
  randomBytes,
  verify as cryptoVerify
} from 'node:crypto';
import {
  authenticationError,
  configurationError,
  validationError
} from './errors.mjs';

const discoveryCache = new Map();
const jwksCache = new Map();
const DEFAULT_CACHE_MILLISECONDS = 5 * 60 * 1000;

function decodeBase64UrlJson(value, label) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw authenticationError(`Malformed ${label}`);
  }
}

function configuredIssuer() {
  const issuer = process.env.OIDC_ISSUER?.trim().replace(/\/+$/, '');
  if (!issuer) throw configurationError('OIDC_ISSUER is not configured');
  const url = new URL(issuer);
  const allowInsecure = process.env.OIDC_ALLOW_INSECURE_ISSUER === 'true';
  if (url.protocol !== 'https:' && !allowInsecure) {
    throw configurationError('OIDC_ISSUER must use HTTPS');
  }
  return issuer;
}

function configuredAudience() {
  const audience = (process.env.OIDC_AUDIENCE || process.env.OIDC_CLIENT_ID || '').trim();
  if (!audience) throw configurationError('OIDC_AUDIENCE or OIDC_CLIENT_ID is required');
  return audience;
}

function allowedAlgorithms() {
  return new Set(
    (process.env.OIDC_ALLOWED_ALGORITHMS || 'RS256,PS256,ES256')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function assertAudience(claimAudience, expectedAudience) {
  if (typeof claimAudience === 'string' && claimAudience === expectedAudience) return;
  if (Array.isArray(claimAudience) && claimAudience.includes(expectedAudience)) return;
  throw authenticationError('Token audience is not accepted');
}

function assertTemporalClaims(payload, nowSeconds, skewSeconds) {
  if (!Number.isFinite(payload.exp)) {
    throw authenticationError('Token expiration is required');
  }
  if (payload.exp + skewSeconds < nowSeconds) {
    throw authenticationError('Token has expired');
  }
  if (Number.isFinite(payload.nbf) && payload.nbf - skewSeconds > nowSeconds) {
    throw authenticationError('Token is not active yet');
  }
  if (Number.isFinite(payload.iat) && payload.iat - skewSeconds > nowSeconds) {
    throw authenticationError('Token issued-at time is invalid');
  }
}

async function cachedJson(cache, key, loader, maxAge = DEFAULT_CACHE_MILLISECONDS) {
  const current = cache.get(key);
  if (current && current.expiresAt > Date.now()) return current.value;
  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + maxAge });
  return value;
}

export async function discoverOpenIdConfiguration({ fetchImpl = fetch } = {}) {
  const issuer = configuredIssuer();
  return cachedJson(discoveryCache, issuer, async () => {
    const response = await fetchImpl(`${issuer}/.well-known/openid-configuration`, {
      headers: { accept: 'application/json' },
      redirect: 'error'
    });
    if (!response.ok) {
      throw authenticationError('Unable to validate identity provider metadata');
    }
    const metadata = await response.json();
    if (metadata.issuer?.replace(/\/+$/, '') !== issuer) {
      throw authenticationError('Identity provider issuer mismatch');
    }
    if (!metadata.jwks_uri) {
      throw authenticationError('Identity provider metadata does not include jwks_uri');
    }
    return metadata;
  });
}

async function loadSigningKey({ kid, fetchImpl = fetch }) {
  const metadata = await discoverOpenIdConfiguration({ fetchImpl });
  const jwks = await cachedJson(jwksCache, metadata.jwks_uri, async () => {
    const response = await fetchImpl(metadata.jwks_uri, {
      headers: { accept: 'application/json' },
      redirect: 'error'
    });
    if (!response.ok) throw authenticationError('Unable to retrieve signing keys');
    return response.json();
  });
  const key = Array.isArray(jwks.keys)
    ? jwks.keys.find((candidate) => candidate.kid === kid && candidate.use !== 'enc')
    : undefined;
  if (!key) throw authenticationError('No accepted signing key is available');
  return createPublicKey({ key, format: 'jwk' });
}

function verifySignature(algorithm, key, data, signature) {
  if (algorithm === 'RS256') {
    return cryptoVerify('RSA-SHA256', data, key, signature);
  }
  if (algorithm === 'PS256') {
    return cryptoVerify(
      'RSA-SHA256',
      data,
      {
        key,
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32
      },
      signature
    );
  }
  if (algorithm === 'ES256') {
    return cryptoVerify(
      'sha256',
      data,
      { key, dsaEncoding: 'ieee-p1363' },
      signature
    );
  }
  return false;
}

export function extractBearerToken(request) {
  const header = request?.headers?.authorization || request?.headers?.Authorization;
  if (!header || typeof header !== 'string') {
    throw authenticationError();
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw authenticationError('Bearer authentication is required');
  return match[1];
}

export async function verifyOpenIdToken(token, { fetchImpl = fetch, expectedNonce, expectedAudience } = {}) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw authenticationError('Malformed JSON Web Token');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeBase64UrlJson(encodedHeader, 'token header');
  const payload = decodeBase64UrlJson(encodedPayload, 'token payload');

  if (!header.alg || header.alg === 'none' || !allowedAlgorithms().has(header.alg)) {
    throw authenticationError('Token signature algorithm is not accepted');
  }
  if (!header.kid) throw authenticationError('Token key identifier is required');

  const key = await loadSigningKey({ kid: header.kid, fetchImpl });
  const verified = verifySignature(
    header.alg,
    key,
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    Buffer.from(encodedSignature, 'base64url')
  );
  if (!verified) throw authenticationError('Token signature verification failed');

  const issuer = configuredIssuer();
  if (payload.iss?.replace(/\/+$/, '') !== issuer) {
    throw authenticationError('Token issuer is not accepted');
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw authenticationError('Token subject is required');
  }

  assertAudience(payload.aud, expectedAudience || configuredAudience());
  const nowSeconds = Math.floor(Date.now() / 1000);
  const skewSeconds = Number.parseInt(process.env.OIDC_CLOCK_SKEW_SECONDS || '60', 10);
  assertTemporalClaims(payload, nowSeconds, Number.isFinite(skewSeconds) ? skewSeconds : 60);

  if (expectedNonce !== undefined && payload.nonce !== expectedNonce) {
    throw authenticationError('OpenID Connect nonce mismatch');
  }

  return Object.freeze({
    issuer,
    subject: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: payload.email_verified === true,
    displayName:
      (typeof payload.name === 'string' && payload.name.trim()) ||
      (typeof payload.preferred_username === 'string' && payload.preferred_username.trim()) ||
      (typeof payload.email === 'string' && payload.email.trim()) ||
      payload.sub,
    expiresAt: payload.exp,
    claims: payload
  });
}

export function createPkcePair() {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export async function buildAuthorizationUrl({
  redirectUri,
  state,
  nonce,
  codeChallenge,
  returnTo = '/admin/',
  fetchImpl = fetch
}) {
  if (!redirectUri || !state || !nonce || !codeChallenge) {
    throw validationError('Authorization request is incomplete');
  }
  const clientId = process.env.OIDC_CLIENT_ID?.trim();
  if (!clientId) throw configurationError('OIDC_CLIENT_ID is not configured');
  const metadata = await discoverOpenIdConfiguration({ fetchImpl });
  if (!metadata.authorization_endpoint) {
    throw authenticationError('Identity provider does not expose an authorization endpoint');
  }
  const url = new URL(metadata.authorization_endpoint);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', process.env.OIDC_SCOPES || 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function exchangeAuthorizationCode({
  code,
  redirectUri,
  codeVerifier,
  fetchImpl = fetch
}) {
  if (!code || !redirectUri || !codeVerifier) {
    throw validationError('Authorization code exchange is incomplete');
  }
  const clientId = process.env.OIDC_CLIENT_ID?.trim();
  if (!clientId) throw configurationError('OIDC_CLIENT_ID is not configured');
  const metadata = await discoverOpenIdConfiguration({ fetchImpl });
  if (!metadata.token_endpoint) {
    throw authenticationError('Identity provider does not expose a token endpoint');
  }

  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier
  });

  const clientSecret = process.env.OIDC_CLIENT_SECRET?.trim();
  if (clientSecret) form.set('client_secret', clientSecret);

  const response = await fetchImpl(metadata.token_endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json'
    },
    body: form.toString(),
    redirect: 'error'
  });

  if (!response.ok) throw authenticationError('Authorization code exchange failed');
  const result = await response.json();
  if (!result.id_token) throw authenticationError('Identity token was not returned');
  return result;
}

export function clearOpenIdCachesForTests() {
  discoveryCache.clear();
  jwksCache.clear();
}
