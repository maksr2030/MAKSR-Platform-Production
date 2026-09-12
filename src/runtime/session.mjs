import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from 'node:crypto';
import { authenticationError, configurationError } from './errors.mjs';

const SESSION_COOKIE = '__Host-maksr_session';
const TRANSIENT_COOKIE = '__Host-maksr_oidc_flow';

function sessionKey() {
  const secret = process.env.SESSION_SECRET || '';
  if (secret.length < 32) {
    throw configurationError('SESSION_SECRET must contain at least 32 characters');
  }
  return createHash('sha256').update(secret).digest();
}

function encryptObject(value) {
  const key = sessionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
}

function decryptObject(value) {
  try {
    const packed = Buffer.from(value, 'base64url');
    if (packed.length < 29) throw new Error('short payload');
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', sessionKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    throw authenticationError('Session is invalid');
  }
}

export function parseCookies(request) {
  const raw = request?.headers?.cookie || request?.headers?.Cookie || '';
  return Object.fromEntries(
    raw
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [decodeURIComponent(part), ''];
        return [
          decodeURIComponent(part.slice(0, index)),
          decodeURIComponent(part.slice(index + 1))
        ];
      })
  );
}

function secureCookie(name, value, {
  maxAge,
  sameSite = 'Lax',
  path = '/',
  httpOnly = true
} = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    'Secure',
    `SameSite=${sameSite}`
  ];
  if (httpOnly) parts.push('HttpOnly');
  if (Number.isFinite(maxAge)) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return parts.join('; ');
}

export function createTransientFlowCookie(flow) {
  return secureCookie(TRANSIENT_COOKIE, encryptObject(flow), {
    maxAge: 600,
    sameSite: 'Lax'
  });
}

export function readTransientFlow(request) {
  const value = parseCookies(request)[TRANSIENT_COOKIE];
  if (!value) throw authenticationError('OpenID Connect flow state is missing');
  const flow = decryptObject(value);
  if (!flow?.state || !flow?.nonce || !flow?.codeVerifier || !flow?.createdAt) {
    throw authenticationError('OpenID Connect flow state is invalid');
  }
  if (Date.now() - flow.createdAt > 10 * 60 * 1000) {
    throw authenticationError('OpenID Connect flow state has expired');
  }
  return flow;
}

export function clearTransientFlowCookie() {
  return secureCookie(TRANSIENT_COOKIE, '', { maxAge: 0 });
}

export function createSessionCookie(principal) {
  const now = Math.floor(Date.now() / 1000);
  const maximumLifetime = Number.parseInt(process.env.SESSION_MAX_AGE_SECONDS || '3600', 10);
  const expiresAt = Math.min(
    Number.isFinite(principal.expiresAt) ? principal.expiresAt : now + maximumLifetime,
    now + maximumLifetime
  );
  const payload = {
    issuer: principal.issuer,
    subject: principal.subject,
    email: principal.email,
    emailVerified: principal.emailVerified === true,
    displayName: principal.displayName,
    issuedAt: now,
    expiresAt
  };
  return secureCookie(SESSION_COOKIE, encryptObject(payload), {
    maxAge: Math.max(1, expiresAt - now),
    sameSite: 'Lax'
  });
}

export function readSessionPrincipal(request) {
  const value = parseCookies(request)[SESSION_COOKIE];
  if (!value) return null;
  const principal = decryptObject(value);
  const now = Math.floor(Date.now() / 1000);
  if (!principal?.issuer || !principal?.subject || !Number.isFinite(principal.expiresAt)) {
    throw authenticationError('Session is invalid');
  }
  if (principal.expiresAt <= now) {
    throw authenticationError('Session has expired');
  }
  return Object.freeze(principal);
}

export function clearSessionCookie() {
  return secureCookie(SESSION_COOKIE, '', { maxAge: 0 });
}
