import {
  exchangeAuthorizationCode,
  verifyOpenIdToken
} from '../../../src/runtime/oidc.mjs';
import {
  clearTransientFlowCookie,
  createSessionCookie,
  readTransientFlow
} from '../../../src/runtime/session.mjs';
import { errorToResponse, sendJson } from '../../../src/runtime/http.mjs';
import { authenticationError } from '../../../src/runtime/errors.mjs';

export default async function handler(request, response) {
  try {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
    }

    const flow = readTransientFlow(request);
    if (!request.query?.state || request.query.state !== flow.state) {
      throw authenticationError('OpenID Connect state mismatch');
    }
    if (!request.query?.code) {
      throw authenticationError('Authorization code is missing');
    }

    const tokens = await exchangeAuthorizationCode({
      code: request.query.code,
      redirectUri: flow.redirectUri,
      codeVerifier: flow.codeVerifier
    });
    const principal = await verifyOpenIdToken(tokens.id_token, {
      expectedNonce: flow.nonce,
      expectedAudience: process.env.OIDC_CLIENT_ID
    });

    response.setHeader('Set-Cookie', [
      createSessionCookie(principal),
      clearTransientFlowCookie()
    ]);
    response.setHeader('Cache-Control', 'no-store');
    return response.redirect(302, flow.returnTo || '/admin/');
  } catch (error) {
    response.setHeader('Set-Cookie', clearTransientFlowCookie());
    const mapped = errorToResponse(error);
    return sendJson(response, mapped.status, mapped.body);
  }
}
