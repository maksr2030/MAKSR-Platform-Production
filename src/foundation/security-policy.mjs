export function evaluateSecurityContext({ protocol, organizationId, identity, correlationId }) {
  const failures = [];
  if (protocol !== 'https') failures.push('HTTPS_REQUIRED');
  if (!organizationId) failures.push('ORGANIZATION_CONTEXT_REQUIRED');
  if (!identity?.identityId) failures.push('IDENTITY_REQUIRED');
  if (!correlationId) failures.push('CORRELATION_ID_REQUIRED');

  return {
    allowed: failures.length === 0,
    decision: failures.length === 0 ? 'ALLOW' : 'DENY',
    failures
  };
}

export const productionSecurityHeaders = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none'
});
