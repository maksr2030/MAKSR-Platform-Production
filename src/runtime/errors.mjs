export class RuntimeError extends Error {
  constructor(message, { code = 'RUNTIME_ERROR', status = 500, expose = false, cause } = {}) {
    super(message, { cause });
    this.name = 'RuntimeError';
    this.code = code;
    this.status = status;
    this.expose = expose;
  }
}

export function configurationError(message) {
  return new RuntimeError(message, {
    code: 'RUNTIME_CONFIGURATION_REQUIRED',
    status: 503,
    expose: true
  });
}

export function authenticationError(message = 'Authentication required') {
  return new RuntimeError(message, {
    code: 'AUTHENTICATION_REQUIRED',
    status: 401,
    expose: true
  });
}

export function authorizationError(message = 'Access denied') {
  return new RuntimeError(message, {
    code: 'ACCESS_DENIED',
    status: 403,
    expose: true
  });
}

export function validationError(message) {
  return new RuntimeError(message, {
    code: 'INVALID_REQUEST',
    status: 400,
    expose: true
  });
}
