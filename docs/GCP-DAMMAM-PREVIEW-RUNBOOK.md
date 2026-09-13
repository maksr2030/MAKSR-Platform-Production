# MAKSR Google Cloud SQL Dammam Preview Runbook

This runbook intentionally contains no secrets.

## External provisioning sequence

### 1. Establish the Saudi Google Cloud commercial account

For a Kingdom of Saudi Arabia billing address, Dammam Google Cloud regional access is purchased through CNTXT. Complete the commercial account setup before creating the database project.

### 2. Create a dedicated Preview project

Suggested project label: `MAKSR Preview`

Do not place Production resources in the same project.

Record these non-secret identifiers:
- Google Cloud Project ID
- Google Cloud Project Number

### 3. Create Cloud SQL for PostgreSQL

Region: `me-central2` Dammam

Database: `maksr_preview`

Enable automated backups, point-in-time recovery, Identity and Access Management database authentication, and deletion protection after configuration is validated. High availability should be enabled if the selected Preview tier supports it and cost is acceptable.

The MAKSR application checks the region at runtime and refuses a non-Dammam instance when the sovereign profile is active.

### 4. Enable required Google Cloud Application Programming Interfaces

Enable Cloud SQL Admin Application Programming Interface, Identity and Access Management Service Account Credentials Application Programming Interface, and Security Token Service as required by Workload Identity Federation.

### 5. Create a dedicated Vercel Preview service account

Suggested account identifier: `maksr-vercel-preview`

Grant only Cloud SQL Client and Cloud SQL Instance User. Do not issue a service-account private key.

### 6. Configure Google Cloud Workload Identity Federation

Create a pool named `vercel` and an OpenID Connect provider named `vercel`.

Recommended Vercel issuer mode: Team issuer.

The Google Cloud provider must trust only the Vercel team and the exact MAKSR project environment subject for Preview.

Expected Vercel subject shape:

`owner:<VERCEL_TEAM_SLUG>:project:maksr-mvp:environment:preview`

Map `google.subject = assertion.sub`.

Allowed audience:

`https://vercel.com/<VERCEL_TEAM_SLUG>`

Grant the Preview subject permission to impersonate the dedicated Preview service account.

### 7. Add the service account as a Cloud SQL Identity and Access Management database user

Use the service account identity as the database login identity and grant only the PostgreSQL privileges needed by the MAKSR runtime role.

### 8. Configure Vercel Preview environment identifiers

Add only to the Preview environment:

`DATABASE_PROVIDER=gcp-cloud-sql`
`DATABASE_POOL_MAX=5`
`DATABASE_RESIDENCY_COUNTRY=SA`
`CLOUD_SQL_EXPECTED_REGION=me-central2`
`CLOUD_SQL_INSTANCE_CONNECTION_NAME=<project:me-central2:instance>`
`CLOUD_SQL_DATABASE=maksr_preview`
`GCP_PROJECT_ID=<project-id>`
`GCP_PROJECT_NUMBER=<project-number>`
`GCP_SERVICE_ACCOUNT_EMAIL=<preview-service-account-email>`
`GCP_WORKLOAD_IDENTITY_POOL_ID=vercel`
`GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel`

`CLOUD_SQL_IAM_DATABASE_USER` may be set explicitly. If omitted, MAKSR derives the PostgreSQL Identity and Access Management username from the configured service-account email.

Do not set a Google Cloud private key.

### 9. Apply MAKSR migrations

Apply in order:

`database/migrations/001_sovereign_foundation.sql`
`database/migrations/002_runtime_production_layer.sql`

Stop immediately on any error.

### 10. Validate the real Preview runtime

Required evidence:
- `/api/v1/runtime/health` returns database READY;
- reported provider is `gcp-cloud-sql`;
- expected region is `me-central2`;
- residency country is `SA`;
- organization bootstrap completes once;
- authenticated user session completes;
- organization, member, role, and permission views load;
- cross-tenant reads are denied;
- audit chain validation succeeds;
- audit UPDATE and DELETE attempts are rejected.

## Separation rule

Preview and Production must have separate Google Cloud projects or equivalent hard isolation, Cloud SQL instances, Vercel environment bindings, service accounts, Workload Identity Federation subjects, institutional OpenID Connect client registrations, and session secrets.

A successful Preview validation does not authorize Production promotion by itself.
