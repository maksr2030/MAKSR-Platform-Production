# MAKSR Oracle Cloud Infrastructure Preview Provisioning Runbook

Status: READY FOR OPERATOR EXECUTION
Environment: Preview only
Region: Saudi Arabia West (Jeddah), `me-jeddah-1`

## Objective

Provision a sovereign Preview data and identity plane for MAKSR without changing Production.

## Phase A — Oracle Cloud Infrastructure Preview Boundary

Create or confirm a dedicated compartment named:

`maksr-preview`

Do not place Preview resources in any Production compartment.

Use defined tags where available:

- `Application = MAKSR`
- `Environment = Preview`
- `DataClass = Confidential`
- `Owner = MAKSR`

## Phase B — Network

Create a dedicated Virtual Cloud Network:

`maksr-preview-vcn`

Recommended address space:

`10.62.0.0/16`

Create at minimum:

1. Private application subnet: `10.62.10.0/24`
2. Private database subnet: `10.62.20.0/24`

The database subnet must not have a public Internet Protocol address assignment path.

Create Network Security Groups:

- `maksr-preview-runtime-nsg`
- `maksr-preview-postgres-nsg`

Database ingress rule:

- Source: runtime Network Security Group only
- Protocol: Transmission Control Protocol
- Port: 5432

Do not create `0.0.0.0/0` ingress to PostgreSQL.

## Phase C — Vault and Secrets

Create or select a dedicated Preview Oracle Cloud Infrastructure Vault.

Create a Preview database administrator credential secret.

Requirements:

- Random password generated outside source control
- Minimum 32 characters
- Unique to Preview
- No reuse in Production
- Store only in Oracle Cloud Infrastructure Vault
- Never paste into GitHub, Vercel configuration files, issue comments, or documentation

Create a separate Preview session encryption secret for MAKSR.

Do not reuse the database credential as the session secret.

## Phase D — PostgreSQL Database System

Create Oracle Cloud Infrastructure Database with PostgreSQL with the following target baseline:

- Display name: `maksr-preview-postgres`
- Region: Saudi Arabia West (Jeddah)
- PostgreSQL version: 17
- Network: private database subnet
- Database public exposure: disabled
- Database administrator credential: Oracle Cloud Infrastructure Vault secret
- Storage durability: regional when supported by the selected configuration
- Automated backups: enabled
- Point-in-Time Recovery: enabled
- Point-in-Time Recovery retention: 14 days for Preview
- Maintenance window: explicitly scheduled

Record after creation:

- Database System Oracle Cloud Identifier
- Private endpoint Fully Qualified Domain Name
- Certificate Authority certificate location
- Database name
- Administrative user name

Do not record the password in this repository.

## Phase E — Database Logging and Audit

Enable Oracle Cloud Infrastructure PostgreSQL service logs.

Enable the PostgreSQL Audit Extension before the first authenticated administration test.

Export database logs to Oracle Cloud Infrastructure Logging or Object Storage under the Preview compartment.

Audit requirements:

- Administrative connection events
- Data Definition Language changes
- Role and permission changes
- Authentication failures where supported
- MAKSR application audit chain remains independently active in `audit_events`

## Phase F — Schema Installation

Apply migrations in this exact order:

1. `database/migrations/001_sovereign_foundation.sql`
2. `database/migrations/002_runtime_production_layer.sql`

Run with stop-on-error behavior.

After migrations, verify:

- organizations
- identities
- identity_authenticators
- organization_memberships
- roles
- permissions
- role_permissions
- membership_roles
- audit_events
- row-level security enabled and forced on tenant-bound tables
- `verify_maksr_audit_chain` function exists

## Phase G — Oracle Cloud Infrastructure Identity Domain

Create a dedicated non-default Identity Domain for Preview.

Recommended name:

`MAKSR Preview Identity`

Required settings:

- Home region: Saudi Arabia West (Jeddah)
- Replication: do not enable additional regions at this stage
- Multi-Factor Authentication: required for administrative users
- Separate Preview user population

Register a confidential Web application for MAKSR Preview.

OpenID Connect requirements:

- Authorization Code flow enabled
- Proof Key for Code Exchange required
- Exact redirect address only
- Exact logout redirect address only
- Scopes: `openid profile email`
- Client secret stored only as a protected Preview environment secret

Record:

- Issuer
- Client identifier
- Client secret reference
- Discovery endpoint

Do not store the client secret in the repository.

## Phase H — MAKSR Runtime Configuration

Set Preview-only values for:

- `DATABASE_URL`
- `DATABASE_SSL_MODE=verify-full`
- `OIDC_ISSUER`
- `OIDC_AUDIENCE`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OIDC_REDIRECT_URI`
- `OIDC_SCOPES=openid profile email`
- `SESSION_SECRET`

The database Uniform Resource Locator must resolve only from the approved Preview runtime path.

## Phase I — First Institutional Bootstrap

Run the repository bootstrap command from a controlled operator environment only.

The first organization must be created as Preview-only.

The first identity must map to the authenticated OpenID Connect subject.

Create the first organization-owner role and bind only the required permissions.

After bootstrap, disable or remove any temporary operator access that is no longer required.

## Phase J — Runtime Verification

Verify the Preview runtime health endpoint:

`/api/v1/runtime/health`

Expected behavior:

- Database component ready
- OpenID Connect configuration ready
- No credential or secret values exposed

Perform a real sign-in.

Then verify:

1. Organization read
2. Membership read
3. Role read
4. Permission read
5. Allowed administrative mutation
6. Denied mutation without permission
7. Cross-organization read rejected
8. Audit event appended
9. Audit chain verifies successfully
10. Audit event modification rejected

## Phase K — Separation Evidence

Before marking Preview ready, record evidence that:

- Preview database is not Production database
- Preview Identity Domain is not Production Identity Domain
- Preview client secret is unique
- Preview session secret is unique
- Preview database credential is unique
- Preview backup policy is independent
- Preview logs are independent
- Preview callback addresses contain only Preview deployment addresses

## Stop Conditions

Stop provisioning immediately if any of the following becomes necessary:

- Public PostgreSQL exposure
- Shared Production credential
- Shared Production user population
- Disabling encrypted transport
- Disabling tenant isolation
- Disabling audit-chain protection
- Committing a real secret to GitHub
- Merging Preview configuration to `main` before the promotion gates pass
