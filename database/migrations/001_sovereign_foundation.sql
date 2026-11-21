BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  organization_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','DISABLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identities (
  identity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_subject_id text UNIQUE,
  subject_type text NOT NULL CHECK (subject_type IN ('PERSON','SERVICE')),
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','DISABLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id uuid NOT NULL REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  identity_id uuid NOT NULL REFERENCES identities(identity_id) ON DELETE RESTRICT,
  membership_status text NOT NULL DEFAULT 'ACTIVE' CHECK (membership_status IN ('ACTIVE','SUSPENDED','REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, identity_id)
);

CREATE TABLE IF NOT EXISTS roles (
  role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  role_key text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, role_key),
  UNIQUE (role_id, organization_id)
);

CREATE TABLE IF NOT EXISTS permissions (
  permission_key text PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES permissions(permission_key) ON DELETE RESTRICT,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS membership_roles (
  organization_id uuid NOT NULL,
  identity_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, identity_id, role_id),
  FOREIGN KEY (organization_id, identity_id)
    REFERENCES organization_memberships(organization_id, identity_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id, organization_id)
    REFERENCES roles(role_id, organization_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  sequence_number bigint NOT NULL,
  actor_identity_id uuid NOT NULL REFERENCES identities(identity_id) ON DELETE RESTRICT,
  action text NOT NULL,
  object_type text NOT NULL,
  object_id text NOT NULL,
  evidence jsonb,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  previous_hash char(64),
  event_hash char(64) NOT NULL,
  UNIQUE (organization_id, sequence_number),
  UNIQUE (event_hash)
);

CREATE OR REPLACE FUNCTION current_maksr_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_tenant_policy ON organizations;
CREATE POLICY organizations_tenant_policy ON organizations
  USING (organization_id = current_maksr_organization_id())
  WITH CHECK (organization_id = current_maksr_organization_id());

DROP POLICY IF EXISTS memberships_tenant_policy ON organization_memberships;
CREATE POLICY memberships_tenant_policy ON organization_memberships
  USING (organization_id = current_maksr_organization_id())
  WITH CHECK (organization_id = current_maksr_organization_id());

DROP POLICY IF EXISTS roles_tenant_policy ON roles;
CREATE POLICY roles_tenant_policy ON roles
  USING (organization_id = current_maksr_organization_id())
  WITH CHECK (organization_id = current_maksr_organization_id());

DROP POLICY IF EXISTS role_permissions_tenant_policy ON role_permissions;
CREATE POLICY role_permissions_tenant_policy ON role_permissions
  USING (EXISTS (
    SELECT 1 FROM roles r
    WHERE r.role_id = role_permissions.role_id
      AND r.organization_id = current_maksr_organization_id()
  ));

DROP POLICY IF EXISTS membership_roles_tenant_policy ON membership_roles;
CREATE POLICY membership_roles_tenant_policy ON membership_roles
  USING (organization_id = current_maksr_organization_id())
  WITH CHECK (organization_id = current_maksr_organization_id());

DROP POLICY IF EXISTS audit_events_tenant_policy ON audit_events;
CREATE POLICY audit_events_tenant_policy ON audit_events
  USING (organization_id = current_maksr_organization_id())
  WITH CHECK (organization_id = current_maksr_organization_id());

CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are immutable';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_immutable_update ON audit_events;
CREATE TRIGGER audit_events_immutable_update
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

CREATE OR REPLACE FUNCTION append_audit_event(
  p_organization_id uuid,
  p_actor_identity_id uuid,
  p_action text,
  p_object_type text,
  p_object_id text,
  p_evidence jsonb DEFAULT NULL
)
RETURNS audit_events
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous audit_events;
  v_sequence bigint;
  v_previous_hash char(64);
  v_occurred_at timestamptz := clock_timestamp();
  v_event_hash char(64);
  v_result audit_events;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_organization_id::text)::bigint);

  SELECT * INTO v_previous
  FROM audit_events
  WHERE organization_id = p_organization_id
  ORDER BY sequence_number DESC
  LIMIT 1;

  v_sequence := COALESCE(v_previous.sequence_number, 0) + 1;
  v_previous_hash := v_previous.event_hash;
  v_event_hash := encode(
    digest(
      concat_ws('|',
        v_sequence::text,
        p_organization_id::text,
        p_actor_identity_id::text,
        p_action,
        p_object_type,
        p_object_id,
        v_occurred_at::text,
        COALESCE(v_previous_hash::text, ''),
        COALESCE(p_evidence::text, '')
      ),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO audit_events (
    organization_id, sequence_number, actor_identity_id, action,
    object_type, object_id, evidence, occurred_at, previous_hash, event_hash
  ) VALUES (
    p_organization_id, v_sequence, p_actor_identity_id, p_action,
    p_object_type, p_object_id, p_evidence, v_occurred_at, v_previous_hash, v_event_hash
  ) RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

INSERT INTO permissions(permission_key, description) VALUES
  ('organization.read', 'Read organization information'),
  ('organization.members.read', 'Read organization membership information'),
  ('organization.members.manage', 'Create, suspend, or revoke organization memberships'),
  ('organization.roles.manage', 'Create roles and manage role permissions'),
  ('audit.read', 'Read organization audit evidence'),
  ('security.events.read', 'Read organization security events')
ON CONFLICT (permission_key) DO NOTHING;

COMMIT;
