import test from 'node:test';
import assert from 'node:assert/strict';

import {
  closeDatabasePool,
  withTenantTransaction
} from '../src/runtime/database.mjs';
import {
  createRole,
  getOrganization,
  listMembers,
  listRoles,
  loadOrganizationSecurityContext,
  resolveOrCreateIdentity,
  setMemberRole
} from '../src/runtime/repositories.mjs';

test.after(async () => {
  await closeDatabasePool();
});

test('runtime PostgreSQL layer resolves identity, enforces tenant scope, and loads database-backed permissions', async () => {
  const principal = {
    issuer: 'https://identity.integration.test',
    subject: 'runtime-user',
    email: 'runtime@example.test',
    emailVerified: true,
    displayName: 'Runtime User'
  };

  const identity = await resolveOrCreateIdentity(principal);
  assert.equal(identity.status, 'ACTIVE');

  const organizationId = '33333333-3333-4333-8333-333333333333';
  const organization = await withTenantTransaction(organizationId, async (client) => {
    const result = await client.query(
      `INSERT INTO organizations(organization_id, legal_name, display_name)
       VALUES ($1, 'Runtime Integration Ltd', 'Runtime Integration')
       RETURNING organization_id, legal_name, display_name`,
      [organizationId]
    );
    return result.rows[0];
  });

  await withTenantTransaction(organization.organization_id, async (client) => {
    await client.query(
      `INSERT INTO organization_memberships(organization_id, identity_id)
       VALUES ($1, $2)`,
      [organization.organization_id, identity.identity_id]
    );
  });

  const role = await createRole({
    organizationId: organization.organization_id,
    actorIdentityId: identity.identity_id,
    roleKey: 'runtime_admin',
    displayName: 'Runtime Administrator',
    permissions: [
      'organization.read',
      'organization.members.read',
      'organization.roles.read'
    ]
  });

  await setMemberRole({
    organizationId: organization.organization_id,
    actorIdentityId: identity.identity_id,
    identityId: identity.identity_id,
    roleId: role.role_id,
    assigned: true
  });

  const securityContext = await loadOrganizationSecurityContext({
    organizationId: organization.organization_id,
    identityId: identity.identity_id
  });
  assert.ok(securityContext.permissions.includes('organization.read'));
  assert.ok(securityContext.permissions.includes('organization.roles.read'));

  const dbOrganization = await getOrganization(organization.organization_id);
  assert.equal(dbOrganization.display_name, 'Runtime Integration');

  const members = await listMembers(organization.organization_id);
  assert.equal(members.length, 1);
  assert.equal(members[0].display_name, 'Runtime User');

  const roles = await listRoles(organization.organization_id);
  assert.equal(roles.length, 1);
  assert.equal(roles[0].role_key, 'runtime_admin');
});
