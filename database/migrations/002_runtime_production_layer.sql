BEGIN;

CREATE TABLE IF NOT EXISTS identity_authenticators (
  authenticator_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES identities(identity_id) ON DELETE CASCADE,
  issuer text NOT NULL,
  subject text NOT NULL,
  email text,
  email_verified boolean NOT NULL DEFAULT false,
  last_authenticated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issuer, subject)
);

CREATE INDEX IF NOT EXISTS identity_authenticators_identity_idx
  ON identity_authenticators(identity_id);

ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE membership_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

INSERT INTO permissions(permission_key, description) VALUES
  ('organization.manage', 'Update organization profile and operating state'),
  ('organization.roles.read', 'Read organization roles and permission grants'),
  ('organization.permissions.read', 'Read available permission definitions')
ON CONFLICT (permission_key) DO UPDATE
SET description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION verify_maksr_audit_chain(p_organization_id uuid)
RETURNS TABLE (
  is_valid boolean,
  broken_sequence bigint,
  reason text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_row audit_events;
  v_previous_hash char(64);
  v_expected_hash char(64);
  v_expected_sequence bigint := 1;
BEGIN
  FOR v_row IN
    SELECT *
    FROM audit_events
    WHERE organization_id = p_organization_id
    ORDER BY sequence_number
  LOOP
    IF v_row.sequence_number <> v_expected_sequence THEN
      RETURN QUERY SELECT false, v_expected_sequence, 'SEQUENCE_GAP';
      RETURN;
    END IF;

    IF COALESCE(v_row.previous_hash::text, '') <> COALESCE(v_previous_hash::text, '') THEN
      RETURN QUERY SELECT false, v_row.sequence_number, 'PREVIOUS_HASH_MISMATCH';
      RETURN;
    END IF;

    v_expected_hash := encode(
      digest(
        concat_ws('|',
          v_row.sequence_number::text,
          v_row.organization_id::text,
          v_row.actor_identity_id::text,
          v_row.action,
          v_row.object_type,
          v_row.object_id,
          v_row.occurred_at::text,
          COALESCE(v_row.previous_hash::text, ''),
          COALESCE(v_row.evidence::text, '')
        ),
        'sha256'
      ),
      'hex'
    );

    IF v_expected_hash <> v_row.event_hash THEN
      RETURN QUERY SELECT false, v_row.sequence_number, 'EVENT_HASH_MISMATCH';
      RETURN;
    END IF;

    v_previous_hash := v_row.event_hash;
    v_expected_sequence := v_expected_sequence + 1;
  END LOOP;

  RETURN QUERY SELECT true, NULL::bigint, NULL::text;
END;
$$;

COMMIT;
