import { randomBytes } from 'node:crypto';
import {
  buildAuthorizationUrl,
  createPkcePair
} from '../../../src/runtime/oidc.mjs';
import {
  createTransientFlowCookie
} from '../../../src/runtime/session.mjs';
import { errorToResponse, sendJson } from '../../../src/runtime/http.mjs';

function safeReturnTo(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/admin/';
  }
  return raw.slice(0, 512);
}

export default async function handler(request, response) {
  try {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
    }
    const redirectUri =
      process.env.OIDC_REDIRECT_URI ||
      `${request.headers['x-forwarded-proto'] || 'https'}://${request.headers.host}/api/v1/auth/callback`;
    const state = randomBytes(24).toString('base64url');
    const nonce = randomBytes(24).toString('base64url');
    const { verifier, challenge } = createPkcePair();
    const returnTo = safeReturnTo(request.query?.return_to);
    const authorizationUrl = await buildAuthorizationUrl({
      redirectUri,
      state,
      nonce,
      codeChallenge: challenge,
      returnTo
    });

    response.setHeader(
      'Set-Cookie',
      createTransientFlowCookie({
        state,
        nonce,
        codeVerifier: verifier,
        redirectUri,
        returnTo,
        createdAt: Date.now()
      })
    );
    response.setHeader('Cache-Control', 'no-store');
    return response.redirect(302, authorizationUrl);
  } catch (error) {
    const mapped = errorToResponse(error);
    return sendJson(response, mapped.status, mapped.body);
  }
}
