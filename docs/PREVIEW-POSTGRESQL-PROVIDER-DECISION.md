# MAKSR Preview PostgreSQL Provider Decision

Date: 2026-09-12
Scope: Preview only
Production impact: None

## Decision

Use Amazon Aurora PostgreSQL through the Vercel native AWS integration for the MAKSR Preview runtime database.

Target region: AWS Middle East (Bahrain), `me-south-1`, subject to availability in the Vercel provisioning flow.

Authentication target: Vercel OpenID Connect federation with Amazon Relational Database Service Identity and Access Management database authentication. No long-lived database password is to be stored in application source code or committed configuration.

## Sovereign evaluation criteria

1. Data location
2. Encryption at rest and in transit
3. Automated backups
4. Point-in-Time Recovery
5. Network isolation
6. Customer-controlled key management
7. Database and platform audit logging
8. Vercel compatibility

## Why this provider for Preview

Amazon Aurora PostgreSQL is selected for Preview because it offers PostgreSQL compatibility, Amazon Web Services Key Management Service encryption, automated recovery capabilities, Virtual Private Cloud network controls, Identity and Access Management authentication, PostgreSQL Audit support, database activity streams, and a first-party Vercel native integration using OpenID Connect federation.

The current AWS Saudi Arabia Region is not yet generally available at this decision date. Therefore the Preview environment may use Bahrain only under the Preview data policy below. This decision does not authorize Production data to leave the Kingdom of Saudi Arabia.

## Preview data policy

The Preview database MUST NOT contain:

- real customer records
- real seller or buyer personal information
- production credentials or secrets
- production transaction documents
- confidential due diligence material
- regulated production datasets
- copied production database snapshots

Preview must use synthetic, generated, or deliberately anonymized test data only.

## Network policy

Preview database access must be restricted to the application runtime and approved administrative paths. Transport Layer Security is mandatory. Public unrestricted database access is prohibited.

If a stable source Internet Protocol allowlist is required, Vercel Static IPs on the current Pro plan are the preferred bridge. Production-grade private connectivity will be re-evaluated before production promotion.

## Backup and recovery policy

Point-in-Time Recovery must be enabled before Preview is considered promotion-eligible. Recovery settings must be tested by restoring to a non-production recovery target and recording the result.

## Key management policy

Encryption at rest must use Amazon Web Services Key Management Service. Production will require an explicit customer-managed key decision and key-rotation policy before promotion.

## Audit policy

Preview must enable database-level auditing sufficient to record security-relevant role, schema, and write activity. PostgreSQL Audit is preferred for SQL-level evidence. AWS control-plane actions must remain auditable through the cloud provider audit trail.

## Promotion blockers

The following remain mandatory before this branch can be promoted:

1. Provision the Preview Aurora PostgreSQL resource.
2. Confirm the actual region is `me-south-1`.
3. Connect only the Preview environment.
4. Configure OpenID Connect and Identity and Access Management database authentication.
5. Apply migrations `001_sovereign_foundation.sql` and `002_runtime_production_layer.sql`.
6. Run the controlled bootstrap for the first Preview organization.
7. Validate `/api/v1/runtime/health` against the real Preview database.
8. Execute authenticated organization, membership, role, and permission flows.
9. Test tenant isolation against the real managed database.
10. Test Point-in-Time Recovery and retain evidence.
11. Reconfirm production homepage parity.

## Deferred Production decision

Production database hosting is not selected by this Preview decision. The production provider must be re-evaluated for Saudi data residency. Oracle Cloud Infrastructure currently exposes managed PostgreSQL service endpoints in Jeddah and Riyadh, while the announced AWS Saudi Arabia Region remains a future option. Production selection requires a separate sovereignty and connectivity review.
