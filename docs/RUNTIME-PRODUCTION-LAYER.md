# MAKSR Runtime Production Layer

This document defines the operational runtime boundary for the first sovereign foundation package.

## Fixed features in scope

- MKSR-F061 Sovereign Security Architecture
- MKSR-F064 Tenant Isolation and Key Management foundation
- MKSR-F066 Audit Immutability and Evidence Architecture
- MKSR-F001 Identity and Institutional Account Management
- MKSR-F002 Organization, Role, and Permission Management

## Runtime boundary

The runtime layer includes PostgreSQL connectivity through a provider adapter; tenant-bound database transactions; forced PostgreSQL row-level security; provider-neutral institutional OpenID Connect login; encrypted Secure and HttpOnly sessions; unified Request Security Context; database-backed authorization; audited organization, membership, role, permission, and role-assignment mutations; runtime health; bilingual sovereign administration; and controlled bootstrap.

## Sovereign Preview database profile

The selected Preview target is Google Cloud SQL for PostgreSQL in `me-central2` Dammam, Kingdom of Saudi Arabia.

The infrastructure authentication path is:

Vercel OpenID Connect federation → Google Cloud Workload Identity Federation → short-lived Google Cloud credentials → Cloud SQL Node.js Connector → Identity and Access Management database authentication → PostgreSQL.

No Google Cloud service-account private key is required in the repository or as a long-lived Vercel secret.

When `DATABASE_PROVIDER=gcp-cloud-sql`, the runtime enforces:

- `CLOUD_SQL_EXPECTED_REGION=me-central2`
- `DATABASE_RESIDENCY_COUNTRY=SA`
- fail-closed behavior on region drift
- fail-closed behavior on residency declaration drift
- Cloud SQL instance project consistency with the configured Google Cloud project

The institutional user OpenID Connect provider remains separate from infrastructure federation.

## Required Preview environment values

No secret is stored in this repository.

### Database and residency

- DATABASE_PROVIDER: `gcp-cloud-sql`
- DATABASE_POOL_MAX: optional, default `5`
- DATABASE_RESIDENCY_COUNTRY: `SA`
- CLOUD_SQL_EXPECTED_REGION: `me-central2`
- CLOUD_SQL_INSTANCE_CONNECTION_NAME
- CLOUD_SQL_DATABASE
- CLOUD_SQL_IAM_DATABASE_USER: optional when derived from service-account email

### Google Cloud Workload Identity Federation

- GCP_PROJECT_ID
- GCP_PROJECT_NUMBER
- GCP_SERVICE_ACCOUNT_EMAIL
- GCP_WORKLOAD_IDENTITY_POOL_ID
- GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID

### Institutional OpenID Connect

- OIDC_ISSUER
- OIDC_AUDIENCE
- OIDC_CLIENT_ID
- OIDC_CLIENT_SECRET: optional when the provider requires a confidential client
- OIDC_REDIRECT_URI
- OIDC_ALLOWED_ALGORITHMS: optional, default `RS256,PS256,ES256`
- OIDC_SCOPES: optional, default `openid profile email`
- SESSION_SECRET: minimum 32 characters
- SESSION_MAX_AGE_SECONDS: optional, default `3600`

## Separation rule

Preview and Production must use separate database instances, Vercel environment bindings, service accounts, Workload Identity Federation subjects, institutional OpenID Connect client registrations, and session secrets.

## Promotion gate

No merge to `main` is authorized until all of the following are evidenced on the real Preview environment:

1. A Dammam Cloud SQL for PostgreSQL instance exists.
2. Vercel Preview successfully exchanges its OpenID Connect token through Google Cloud Workload Identity Federation.
3. Cloud SQL Identity and Access Management database authentication succeeds without a stored Google Cloud service-account private key.
4. Migrations 001 and 002 apply successfully to the real Preview database.
5. `/api/v1/runtime/health` reports database READY with provider `gcp-cloud-sql`, region `me-central2`, and residency country `SA`.
6. The first organization bootstrap completes through the controlled operator path.
7. A real institutional OpenID Connect user session is completed.
8. Organization, members, roles, and permissions are exercised through the administration interface.
9. Cross-tenant access is denied on the real Preview database.
10. Audit chain verification succeeds and UPDATE or DELETE mutation attempts are rejected.
11. Homepage parity is reconfirmed against the verified Production baseline.

Production remains unchanged until every gate is closed.

## One-time organization bootstrap

The first institutional owner is not provisioned through an unauthenticated web endpoint. After the Preview PostgreSQL database and institutional OpenID Connect provider are configured, run:

`npm run bootstrap:organization`

The command requires the `BOOTSTRAP_*` environment values shown in `.env.example`. It creates or binds the verified identity, creates the organization, activates membership, assigns the `sovereign_owner` role, and emits audit evidence. No bootstrap secret or bypass endpoint is exposed through the public application.
