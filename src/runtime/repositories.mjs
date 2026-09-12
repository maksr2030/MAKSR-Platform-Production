import { withTenantTransaction, withTransaction } from './database.mjs';
import { authorizationError, validationError } from './errors.mjs';

function externalSubjectId(principal) {
  return `${principal.issuer}|${principal.subject}`;
}

export async function resolveOrCreateIdentity(principal) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT ia.identity_id, i.subject_type, i.display_name, i.status
       FROM identity_authenticators ia
       JOIN identities i ON i.identity_id = ia.identity_id
       WHERE ia.issuer = $1 AND ia.subject = $2
       LIMIT 1`,
      [principal.issuer, principal.subject]
    );

    if (existing.rowCount === 1) {
      await client.query(
        `UPDATE identity_authenticators
         SET email = $3, email_verified = $4, last_authenticated_at = now()
         WHERE issuer = $1 AND subject = $2`,
        [principal.issuer, principal.subject, principal.email, principal.emailVerified === true]
      );
      return existing.rows[0];
    }

    const created = await client.query(
      `INSERT INTO identities(external_subject_id, subject_type, display_name)
       VALUES ($1, 'PERSON', $2)
       ON CONFLICT (external_subject_id)
       DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()
       RETURNING identity_id, subject_type, display_name, status`,
      [externalSubjectId(principal), principal.displayName]
    );
    const identity = created.rows[0];

    const bound = await client.query(
      `INSERT INTO identity_authenticators(
         identity_id, issuer, subject, email, email_verified, last_authenticated_at
       )
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (issuer, subject)
       DO UPDATE SET
         email = EXCLUDED.email,
         email_verified = EXCLUDED.email_verified,
         last_authenticated_at = now()
       RETURNING identity_id`,
      [
        identity.identity_id,
        principal.issuer,
        principal.subject,
        principal.email,
        principal.emailVerified === true
      ]
    );

    if (bound.rows[0].identity_id !== identity.identity_id) {
      await client.query('DELETE FROM identities WHERE identity_id = $1', [identity.identity_id]);
      const winner = await client.query(
        `SELECT i.identity_id, i.subject_type, i.display_name, i.status
         FROM identities i
         WHERE i.identity_id = $1`,
        [bound.rows[0].identity_id]
      );
      return winner.rows[0];
    }

    return identity;
  });
}

export async function loadOrganizationSecurityContext({ organizationId, identityId }) {
  return withTenantTransaction(organizationId, async (client) => {
    const base = await client.query(
      `SELECT
         o.organization_id,
         o.legal_name,
         o.display_name AS organization_display_name,
         o.status AS organization_status,
         i.identity_id,
         i.display_name AS identity_display_name,
         i.subject_type,
         i.status AS identity_status,
         m.membership_status
       FROM organizations o
       JOIN organization_memberships m
         ON m.organization_id = o.organization_id
       JOIN identities i
         ON i.identity_id = m.identity_id
       WHERE o.organization_id = $1
         AND i.identity_id = $2
       LIMIT 1`,
      [organizationId, identityId]
    );

    if (base.rowCount !== 1) {
      throw authorizationError('Identity is not a member of this organization');
    }
    const row = base.rows[0];
    if (
      row.organization_status !== 'ACTIVE' ||
      row.identity_status !== 'ACTIVE' ||
      row.membership_status !== 'ACTIVE'
    ) {
      throw authorizationError('Organization membership is not operational');
    }

    const grants = await client.query(
      `SELECT DISTINCT r.role_key, r.display_name, rp.permission_key
       FROM membership_roles mr
       JOIN roles r
         ON r.role_id = mr.role_id
        AND r.organization_id = mr.organization_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.role_id
       WHERE mr.organization_id = $1 AND mr.identity_id = $2
       ORDER BY r.role_key, rp.permission_key`,
      [organizationId, identityId]
    );

    const roles = new Map();
    const permissions = new Set();
    for (const grant of grants.rows) {
      if (!roles.has(grant.role_key)) {
        roles.set(grant.role_key, {
          roleKey: grant.role_key,
          displayName: grant.display_name
        });
      }
      if (grant.permission_key) permissions.add(grant.permission_key);
    }

    return {
      organization: {
        organizationId: row.organization_id,
        legalName: row.legal_name,
        displayName: row.organization_display_name,
        status: row.organization_status
      },
      identity: {
        identityId: row.identity_id,
        displayName: row.identity_display_name,
        subjectType: row.subject_type,
        status: row.identity_status
      },
      membershipStatus: row.membership_status,
      roles: [...roles.values()],
      permissions: [...permissions].sort()
    };
  });
}

export async function getOrganization(organizationId) {
  return withTenantTransaction(organizationId, async (client) => {
    const result = await client.query(
      `SELECT organization_id, legal_name, display_name, status, created_at, updated_at
       FROM organizations
       WHERE organization_id = $1`,
      [organizationId]
    );
    return result.rows[0] || null;
  });
}

export async function updateOrganization({
  organizationId,
  actorIdentityId,
  legalName,
  displayName
}) {
  if (!legalName?.trim() || !displayName?.trim()) {
    throw validationError('legalName and displayName are required');
  }
  return withTenantTransaction(organizationId, async (client) => {
    const result = await client.query(
      `UPDATE organizations
       SET legal_name = $2, display_name = $3, updated_at = now()
       WHERE organization_id = $1
       RETURNING organization_id, legal_name, display_name, status, created_at, updated_at`,
      [organizationId, legalName.trim(), displayName.trim()]
    );
    if (result.rowCount !== 1) throw authorizationError();
    await appendAuditEvent(client, {
      organizationId,
      actorIdentityId,
      action: 'ORGANIZATION_UPDATED',
      objectType: 'ORGANIZATION',
      objectId: organizationId,
      evidence: { legalName: legalName.trim(), displayName: displayName.trim() }
    });
    return result.rows[0];
  });
}

export async function listMembers(organizationId) {
  return withTenantTransaction(organizationId, async (client) => {
    const result = await client.query(
      `SELECT
         m.identity_id,
         i.display_name,
         i.status AS identity_status,
         m.membership_status,
         COALESCE(
           jsonb_agg(
             DISTINCT jsonb_build_object('roleKey', r.role_key, 'displayName', r.display_name)
           ) FILTER (WHERE r.role_id IS NOT NULL),
           '[]'::jsonb
         ) AS roles
       FROM organization_memberships m
       JOIN identities i ON i.identity_id = m.identity_id
       LEFT JOIN membership_roles mr
         ON mr.organization_id = m.organization_id
        AND mr.identity_id = m.identity_id
       LEFT JOIN roles r
         ON r.role_id = mr.role_id
        AND r.organization_id = m.organization_id
       WHERE m.organization_id = $1
       GROUP BY m.identity_id, i.display_name, i.status, m.membership_status
       ORDER BY i.display_name`,
      [organizationId]
    );
    return result.rows;
  });
}

export async function setMembershipStatus({
  organizationId,
  actorIdentityId,
  identityId,
  status
}) {
  const accepted = new Set(['ACTIVE', 'SUSPENDED', 'REVOKED']);
  if (!accepted.has(status)) throw validationError('Unsupported membership status');
  return withTenantTransaction(organizationId, async (client) => {
    const result = await client.query(
      `UPDATE organization_memberships
       SET membership_status = $3
       WHERE organization_id = $1 AND identity_id = $2
       RETURNING organization_id, identity_id, membership_status`,
      [organizationId, identityId, status]
    );
    if (result.rowCount !== 1) throw validationError('Membership was not found');
    await appendAuditEvent(client, {
      organizationId,
      actorIdentityId,
      action: 'MEMBERSHIP_STATUS_CHANGED',
      objectType: 'MEMBERSHIP',
      objectId: identityId,
      evidence: { status }
    });
    return result.rows[0];
  });
}

export async function listRoles(organizationId) {
  return withTenantTransaction(organizationId, async (client) => {
    const result = await client.query(
      `SELECT
         r.role_id,
         r.role_key,
         r.display_name,
         COALESCE(
           array_agg(rp.permission_key ORDER BY rp.permission_key)
             FILTER (WHERE rp.permission_key IS NOT NULL),
           ARRAY[]::text[]
         ) AS permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.role_id
       WHERE r.organization_id = $1
       GROUP BY r.role_id, r.role_key, r.display_name
       ORDER BY r.role_key`,
      [organizationId]
    );
    return result.rows;
  });
}

export async function listPermissions() {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT permission_key, description
       FROM permissions
       ORDER BY permission_key`
    );
    return result.rows;
  });
}

export async function createRole({
  organizationId,
  actorIdentityId,
  roleKey,
  displayName,
  permissions = []
}) {
  if (!/^[a-z][a-z0-9._-]{2,63}$/i.test(roleKey || '')) {
    throw validationError('roleKey format is invalid');
  }
  if (!displayName?.trim()) throw validationError('displayName is required');

  return withTenantTransaction(organizationId, async (client) => {
    const role = await client.query(
      `INSERT INTO roles(organization_id, role_key, display_name)
       VALUES ($1, $2, $3)
       RETURNING role_id, role_key, display_name`,
      [organizationId, roleKey.toLowerCase(), displayName.trim()]
    );
    if (permissions.length) {
      await client.query(
        `INSERT INTO role_permissions(role_id, permission_key)
         SELECT $1, p.permission_key
         FROM permissions p
         WHERE p.permission_key = ANY($2::text[])
         ON CONFLICT DO NOTHING`,
        [role.rows[0].role_id, permissions]
      );
    }
    await appendAuditEvent(client, {
      organizationId,
      actorIdentityId,
      action: 'ROLE_CREATED',
      objectType: 'ROLE',
      objectId: role.rows[0].role_id,
      evidence: { roleKey: role.rows[0].role_key, permissions }
    });
    return role.rows[0];
  });
}

export async function setRolePermissions({
  organizationId,
  actorIdentityId,
  roleId,
  permissions
}) {
  if (!Array.isArray(permissions)) throw validationError('permissions must be an array');
  return withTenantTransaction(organizationId, async (client) => {
    const role = await client.query(
      `SELECT role_id, role_key FROM roles
       WHERE organization_id = $1 AND role_id = $2`,
      [organizationId, roleId]
    );
    if (role.rowCount !== 1) throw validationError('Role was not found');

    const known = await client.query(
      `SELECT permission_key FROM permissions WHERE permission_key = ANY($1::text[])`,
      [permissions]
    );
    if (known.rowCount !== new Set(permissions).size) {
      throw validationError('One or more permissions are unknown');
    }

    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
    if (permissions.length) {
      await client.query(
        `INSERT INTO role_permissions(role_id, permission_key)
         SELECT $1, unnest($2::text[])`,
        [roleId, [...new Set(permissions)]]
      );
    }
    await appendAuditEvent(client, {
      organizationId,
      actorIdentityId,
      action: 'ROLE_PERMISSIONS_CHANGED',
      objectType: 'ROLE',
      objectId: roleId,
      evidence: { permissions: [...new Set(permissions)].sort() }
    });
    return { roleId, permissions: [...new Set(permissions)].sort() };
  });
}

export async function setMemberRole({
  organizationId,
  actorIdentityId,
  identityId,
  roleId,
  assigned
}) {
  return withTenantTransaction(organizationId, async (client) => {
    if (assigned) {
      await client.query(
        `INSERT INTO membership_roles(organization_id, identity_id, role_id)
         SELECT $1, $2, r.role_id
         FROM roles r
         JOIN organization_memberships m
           ON m.organization_id = r.organization_id
          AND m.identity_id = $2
         WHERE r.organization_id = $1 AND r.role_id = $3
         ON CONFLICT DO NOTHING`,
        [organizationId, identityId, roleId]
      );
    } else {
      await client.query(
        `DELETE FROM membership_roles
         WHERE organization_id = $1 AND identity_id = $2 AND role_id = $3`,
        [organizationId, identityId, roleId]
      );
    }
    await appendAuditEvent(client, {
      organizationId,
      actorIdentityId,
      action: assigned ? 'MEMBER_ROLE_ASSIGNED' : 'MEMBER_ROLE_REMOVED',
      objectType: 'MEMBERSHIP_ROLE',
      objectId: `${identityId}:${roleId}`,
      evidence: { identityId, roleId, assigned: Boolean(assigned) }
    });
    return { identityId, roleId, assigned: Boolean(assigned) };
  });
}

async function appendAuditEvent(client, {
  organizationId,
  actorIdentityId,
  action,
  objectType,
  objectId,
  evidence
}) {
  await client.query(
    `SELECT event_id
     FROM append_audit_event($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb)`,
    [
      organizationId,
      actorIdentityId,
      action,
      objectType,
      String(objectId),
      JSON.stringify(evidence || {})
    ]
  );
}
