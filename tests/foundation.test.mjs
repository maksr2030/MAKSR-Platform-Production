import test from 'node:test';
import assert from 'node:assert/strict';

import { buildIdentity, assertIdentityOperational, IdentityState } from '../src/foundation/identity.mjs';
import { assertTenantAccess, scopedRecord } from '../src/foundation/tenant-isolation.mjs';
import { evaluatePermission, assertPermission } from '../src/foundation/role-permission-policy.mjs';
import { appendAuditEvent, verifyAuditChain } from '../src/foundation/audit-chain.mjs';
import { evaluateSecurityContext } from '../src/foundation/security-policy.mjs';

test('MKSR-F001 builds active identities and rejects suspended identities', () => {
  const active = buildIdentity({ identityId: 'id-1', subjectType: 'PERSON', displayName: 'User One' });
  assert.equal(assertIdentityOperational(active), true);

  const suspended = buildIdentity({ identityId: 'id-2', subjectType: 'PERSON', displayName: 'User Two', state: IdentityState.SUSPENDED });
  assert.throws(() => assertIdentityOperational(suspended), /not operational/);
});

test('MKSR-F064 denies cross-tenant access and keeps records tenant scoped', () => {
  assert.equal(assertTenantAccess({ actorOrganizationIds: ['org-a'], requestedOrganizationId: 'org-a' }), true);
  assert.throws(
    () => assertTenantAccess({ actorOrganizationIds: ['org-a'], requestedOrganizationId: 'org-b' }),
    /Cross-tenant access denied/
  );
  assert.equal(scopedRecord({ organizationId: 'org-a', value: 1 }, 'org-b'), null);
});

test('MKSR-F002 permissions are explicit and fail closed', () => {
  const allowed = evaluatePermission({ assignedPermissions: ['organization.read'], requiredPermission: 'organization.read' });
  assert.equal(allowed.allowed, true);
  const denied = evaluatePermission({ assignedPermissions: ['organization.read'], requiredPermission: 'organization.roles.manage' });
  assert.equal(denied.allowed, false);
  assert.throws(
    () => assertPermission({ assignedPermissions: [], requiredPermission: 'audit.read' }),
    /Permission denied/
  );
});

test('MKSR-F066 produces a tamper-evident audit chain', () => {
  const first = appendAuditEvent(null, {
    organizationId: 'org-a', actorIdentityId: 'id-1', action: 'ORGANIZATION_CREATED',
    objectType: 'ORGANIZATION', objectId: 'org-a', occurredAt: '2026-09-12T00:00:00.000Z'
  });
  const second = appendAuditEvent(first, {
    organizationId: 'org-a', actorIdentityId: 'id-1', action: 'ROLE_ASSIGNED',
    objectType: 'MEMBERSHIP', objectId: 'm-1', occurredAt: '2026-09-12T00:01:00.000Z', evidence: { role: 'admin' }
  });
  assert.equal(verifyAuditChain([first, second]), true);
  assert.equal(verifyAuditChain([first, { ...second, action: 'TAMPERED' }]), false);
});

test('MKSR-F061 security context fails closed when sovereign context is incomplete', () => {
  const denied = evaluateSecurityContext({ protocol: 'http', organizationId: '', identity: null, correlationId: '' });
  assert.equal(denied.allowed, false);
  assert.deepEqual(denied.failures.sort(), [
    'CORRELATION_ID_REQUIRED', 'HTTPS_REQUIRED', 'IDENTITY_REQUIRED', 'ORGANIZATION_CONTEXT_REQUIRED'
  ].sort());

  const allowed = evaluateSecurityContext({
    protocol: 'https', organizationId: 'org-a', identity: { identityId: 'id-1' }, correlationId: 'corr-1'
  });
  assert.equal(allowed.allowed, true);
});
