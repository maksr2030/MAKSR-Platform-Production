import { RuntimeError, validationError } from './errors.mjs';
import {
  assertPermission,
  buildRequestSecurityContext
} from './request-security-context.mjs';

export function sendJson(response, status, body, requestId) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (requestId) response.setHeader('X-Request-Id', requestId);
  return response.status(status).json(body);
}

export async function readJsonBody(request, { maximumBytes = 64_000 } = {}) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    if (Buffer.byteLength(request.body) > maximumBytes) {
      throw validationError('Request body is too large');
    }
    try {
      return JSON.parse(request.body);
    } catch {
      throw validationError('Request body must contain valid JSON');
    }
  }
  return {};
}

export function errorToResponse(error, requestId) {
  if (error instanceof RuntimeError) {
    return {
      status: error.status,
      body: {
        error: error.code,
        message: error.expose ? error.message : 'Request could not be completed',
        requestId
      }
    };
  }
  return {
    status: 500,
    body: {
      error: 'INTERNAL_ERROR',
      message: 'Request could not be completed',
      requestId
    }
  };
}

export function secureHandler({
  methods = ['GET'],
  permission,
  execute,
  buildContext = buildRequestSecurityContext
}) {
  const accepted = new Set(methods);
  return async function handler(request, response) {
    let context;
    try {
      if (!accepted.has(request.method)) {
        response.setHeader('Allow', [...accepted].join(', '));
        return sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
      }
      context = await buildContext(request);
      if (permission) assertPermission(context, permission);
      const result = await execute({ request, response, context });
      if (response.headersSent) return;
      return sendJson(response, result?.status || 200, result?.body ?? result, context.requestId);
    } catch (error) {
      const requestId = context?.requestId || request.headers?.['x-request-id'];
      const mapped = errorToResponse(error, requestId);
      return sendJson(response, mapped.status, mapped.body, requestId);
    }
  };
}
