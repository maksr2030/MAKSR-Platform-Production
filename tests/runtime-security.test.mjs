import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSign,
  generateKeyPairSync
} from 'node:crypto';

import {
  clearOpenIdCachesForTests,
  verifyOpenIdToken
} from '../src/runtime/oidc.mjs';
import {
  assertPermission,
  buildRequestSecurityContext
} from '../src/runtime/request-security-context.mjs';

function jsonResponse(body) {
  return {
    ok: true,
    async json() {
      return body;
    }
  };
}

function signRs256(payload, privateKey, kid = 'test-key') {
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${header}.${body}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .end()
    .sign(privateKey)
    .toString('base64url');
  return `${signingInput}.${signature}`;
}

test('provider-neutral OpenID Connect verifier validates issuer, audience, signature and expiry', async () => {
  process.env.OIDC_ISSUER = 'https://identity.example.test';
  process.env.OIDC_AUDIENCE = 'maksr-runtime';
  process.env.OIDC_ALLOWED_ALGORITHMS = 'RS256';
  clearOpenIdCachesForTests();

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const jwk = publicKey.export({ format: 'jwk' });
  jwk.kid = 'test-key';
  jwk.use = 'sig';
  jwk.alg = 'RS256';

  const now = Math.floor(Date.now() / 1000);
  const token = signRs256(
    {
      iss: process.env.OIDC_ISSUER,
      sub: 'subject-123',
      aud: process.env.OIDC_AUDIENCE,
      exp: now + 300,
      iat: now,
      email: 'person@example.test',
      email_verified: true,
      name: 'MAKSR Test User'
    },
    privateKey
  );

  const fetchImpl = async (url) => {
    if (url.endsWith('/.well-known/openid-configuration')) {
      return jsonResponse({
        issuer: process.env.OIDC_ISSUER,
        jwks_uri: `${process.env.OIDC_ISSUER}/jwks`
      });
    }
    if (url.endsWith('/jwks')) return jsonResponse({ keys: [jwk] });
    throw new Error(`Unexpected URL ${url}`);
  };

  const principal = await verifyOpenIdToken(token, { fetchImpl });
  assert.equal(principal.subject, 'subject-123');
  assert.equal(principal.emailVerified, true);
  assert.equal(principal.displayName, 'MAKSR Test User');
});

test('unified request security context binds verified identity to active tenant membership', async () => {
  process.env.SESSION_SECRET = 'test-only-session-secret-that-is-long-enough-12345';

  const context = await buildRequestSecurityContext(
    {
      headers: {
        authorization: 'Bearer placeholder',
        'x-maksr-organization-id': '11111111-1111-4111-8111-111111111111'
      }
    },
    {
      verifyToken: async () => ({
        issuer: 'https://identity.example.test',
        subject: 'subject-123',
        email: 'person@example.test',
        emailVerified: true
      }),
      resolveIdentity: async () => ({
        identity_id: '22222222-2222-4222-8222-222222222222',
        status: 'ACTIVE'
      }),
      loadSecurityContext: async () => ({
        organization: {
          organizationId: '11111111-1111-4111-8111-111111111111',
          legalName: 'MAKSR Test Organization',
          displayName: 'MAKSR Test',
          status: 'ACTIVE'
        },
        identity: {
          identityId: '22222222-2222-4222-8222-222222222222',
          displayName: 'Test User',
          subjectType: 'PERSON',
          status: 'ACTIVE'
        },
        membershipStatus: 'ACTIVE',
        roles: [{ roleKey: 'admin', displayName: 'Administrator' }],
        permissions: ['organization.read']
      })
    }
  );

  assert.equal(context.organization.organizationId, '11111111-1111-4111-8111-111111111111');
  assert.equal(context.identity.identityId, '22222222-2222-4222-8222-222222222222');
  assert.doesNotThrow(() => assertPermission(context, 'organization.read'));
  assert.throws(
    () => assertPermission(context, 'organization.manage'),
    /Required permission is not granted/
  );
});
