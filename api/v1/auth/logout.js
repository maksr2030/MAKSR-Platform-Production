import { clearSessionCookie } from '../../../src/runtime/session.mjs';
import { sendJson } from '../../../src/runtime/http.mjs';

export default function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
  }
  response.setHeader('Set-Cookie', clearSessionCookie());
  return sendJson(response, 200, { status: 'SIGNED_OUT' });
}
