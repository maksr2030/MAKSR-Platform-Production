import {
  closeDatabasePool,
  withTenantTransaction
} from '../src/runtime/database.mjs';
import {
  createRole,
  resolveOrCreateIdentity,
  setMemberRole
} from '../src/runtime/repositories.mjs';

const required = [
  'BOOTSTRAP_ORGANIZATION_ID',
  'BOOTSTRAP_LEGAL_NAME',
  'BOOTSTRAP_DISPLAY_NAME',
  'BOOTSTRAP_OIDC_ISSUER',
  'BOOTSTRAP_OIDC_SUBJECT',
  'BOOTSTRAP_IDENTITY_DISPLAY_NAME'
];

for (const name of required) {
  if (!process.env[name]?.trim()) {
    throw new Error(`${name} is required`);
  }
}

const organizationId = process.env.BOOTSTRAP_ORGANIZATION_ID.trim();
const principal = {
  issuer: process.env.BOOTSTRAP_OIDC_ISSUER.trim().replace(/\/+$/, ''),
  subject: process.env.BOOTSTRAP_OIDC_SUBJECT.trim(),
  email: process.env.BOOTSTRAP_EMAIL?.trim() || null,
  emailVerified: process.env.BOOTSTRAP_EMAIL_VERIFIED === 'true',
  displayName: process.env.BOOTSTRAP_IDENTITY_DISPLAY_NAME.trim()
};

try {
  const identity = await resolveOrCreateIdentity(principal);

  await withTenantTransaction(organizationId, async (client) => {
    await client.query(
      `INSERT INTO organizations(organization_id, legal_name, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id) DO NOTHING`,
      [
        organizationId,
        process.env.BOOTSTRAP_LEGAL_NAME.trim(),
        process.env.BOOTSTRAP_DISPLAY_NAME.trim()
      ]
    );
    await client.query(
      `INSERT INTO organization_memberships(organization_id, identity_id)
       VALUES ($1, $2)
       ON CONFLICT (organization_id, identity_id)
       DO UPDATE SET membership_status = 'ACTIVE'`,
      [organizationId, identity.identity_id]
    );
  });

  const role = await createRole({
    organizationId,
    actorIdentityId: identity.identity_id,
    roleKey: 'sovereign_owner',
    displayName: 'Sovereign Owner',
    permissions: [
      'organization.read',
      'organization.manage',
      'organization.members.read',
      'organization.members.manage',
      'organization.roles.read',
      'organization.roles.manage',
      'organization.permissions.read',
      'audit.read',
      'security.events.read'
    ]
  }).catch(async (error) => {
    if (error?.code !== '23505') throw error;
    return withTenantTransaction(organizationId, async (client) => {
      const result = await client.query(
        `SELECT role_id, role_key, display_name
         FROM roles
         WHERE organization_id = $1 AND role_key = 'sovereign_owner'`,
        [organizationId]
      );
      return result.rows[0];
    });
  });

  await setMemberRole({
    organizationId,
    actorIdentityId: identity.identity_id,
    identityId: identity.identity_id,
    roleId: role.role_id,
    assigned: true
  });

  console.log(JSON.stringify({
    status: 'BOOTSTRAPPED',
    organizationId,
    identityId: identity.identity_id,
    roleKey: role.role_key
  }));
} finally {
  await closeDatabasePool();
}
