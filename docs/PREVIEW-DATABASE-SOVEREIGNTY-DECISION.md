# MAKSR Preview Database Sovereignty Decision

Status: Selected for Preview implementation, pending external account provisioning.

## Selected database profile

MAKSR Preview will target Google Cloud SQL for PostgreSQL in the Google Cloud Dammam region `me-central2`, Kingdom of Saudi Arabia.

The application runtime keeps a provider adapter so the platform is not structurally locked to one database vendor, while the sovereign production profile enforces:

- `DATABASE_PROVIDER=gcp-cloud-sql`
- `CLOUD_SQL_EXPECTED_REGION=me-central2`
- `DATABASE_RESIDENCY_COUNTRY=SA`
- failure on region drift
- failure on non-Saudi residency declaration

## Authentication model

The selected model is:

Vercel OpenID Connect federation
→ Google Cloud Workload Identity Federation
→ short-lived Google Cloud credentials
→ Cloud SQL Node.js Connector
→ automatic Identity and Access Management database authentication
→ PostgreSQL

No Google Cloud service-account private key is stored in the repository or required as a long-lived Vercel secret.

The institutional user OpenID Connect provider is separate from this infrastructure federation. User identity and cloud infrastructure identity must never share credentials or trust configuration.

## Required Google Cloud controls

1. Google Cloud project dedicated to MAKSR Preview.
2. Cloud SQL for PostgreSQL instance in `me-central2`.
3. Cloud SQL Identity and Access Management database authentication enabled.
4. Cloud SQL Admin Application Programming Interface enabled.
5. Dedicated service account for Vercel Preview only.
6. Service account receives only the minimum Cloud SQL Client and Cloud SQL Instance User permissions required for runtime access.
7. Vercel Preview subject is bound through Google Cloud Workload Identity Federation.
8. Production receives a separate subject binding and a separate database later.
9. Backups and point-in-time recovery enabled before any non-test transaction data is stored.
10. No production data may be copied into Preview.

## Promotion gate

This decision is not considered operationally closed until:

- the Dammam instance exists;
- Vercel Preview federation is accepted by Google Cloud;
- an Identity and Access Management database login succeeds;
- migrations 001 and 002 apply successfully;
- `/api/v1/runtime/health` reports READY;
- tenant isolation, forced row-level security, and audit immutability pass against the real Preview instance.
