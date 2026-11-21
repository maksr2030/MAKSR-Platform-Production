import { randomUUID } from 'node:crypto';
import { extractBearerToken, verifyOpenIdToken } from './oidc.mjs';
import { readSessionPrincipal } from './session.mjs';
import {
  loadOrganizationSecurityContext,
  resolveOrCreateIdentity
} from './repositories.mjs';
import {
  authenticationError,
  authorizationError,
  validationError
} from './errors.mjs';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function organizationIdFromRequest(request) {
  const raw =
    request?.headers?.['x-maksr-organization-id'] ||
    request?.headers?.['X-MAKSR-Organization-Id'] ||
    request?.query?.organization_id;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !UUID_PATTERN.test(String(value))) {
    throw validationError('A valid MAKSR organization identifier is required');
  }
  return String(value);
}

async function resolvePrincipal(request, { verifyToken, fetchImpl }) {
  const sessionPrincipal = readSessionPrincipal(request);
  if (sessionPrincipal) return sessionPrincipal;

  const token = extractBearerToken(request);
  return verifyToken(token, { fetchImpl });
}

export async function buildRequestSecurityContext(
  request,
  {
    verifyToken = verifyOpenIdToken,
    resolveIdentity = resolveOrCreateIdentity,
    loadSecurityContext = loadOrganizationSecurityContext,
    fetchImpl = fetch
  } = {}
) {
  const requestId = String(
    request?.headers?.['x-request-id'] ||
    request?.headers?.['X-Request-Id'] ||
    randomUUID()
  ).slice(0, 128);

  const principal = await resolvePrincipal(request, { verifyToken, fetchImpl });
  if (!principal?.issuer || !principal?.subject) {
    throw authenticationError();
  }

  const identity = await resolveIdentity(principal);
  if (!identity || identity.status !== 'ACTIVE') {
    throw authorizationError('Identity is not operational');
  }

  const organizationId = organizationIdFromRequest(request);
  const authorization = await loadSecurityContext({
    organizationId,
    identityId: identity.identity_id
  });

  return Object.freeze({
    requestId,
    principal: Object.freeze({
      issuer: principal.issuer,
      subject: principal.subject,
      email: principal.email || null,
      emailVerified: principal.emailVerified === true
    }),
    identity: Object.freeze(authorization.identity),
    organization: Object.freeze(authorization.organization),
    membershipStatus: authorization.membershipStatus,
    roles: Object.freeze(authorization.roles.map(Object.freeze)),
    permissions: Object.freeze([...authorization.permissions])
  });
}

export function assertPermission(context, permissionKey) {
  if (!context?.permissions?.includes(permissionKey)) {
    throw authorizationError('Required permission is not granted');
  }
  return true;
}
