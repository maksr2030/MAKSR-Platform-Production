# MAKSR Runtime Production Layer

This document defines the runtime completion package for the fixed features:

- MKSR-F061 Sovereign Security Architecture
- MKSR-F064 Tenant Isolation and Key Management foundation
- MKSR-F066 Audit Immutability and Evidence Architecture
- MKSR-F001 Identity and Institutional Account Management
- MKSR-F002 Organization, Role, and Permission Management

## Runtime controls implemented

1. PostgreSQL operational connection pool with explicit Secure Sockets Layer mode.
2. Tenant-bound database transactions using PostgreSQL row-level security context.
3. Provider-neutral OpenID Connect discovery and JSON Web Token signature verification.
4. OpenID Connect Authorization Code flow with Proof Key for Code Exchange.
5. Encrypted, Hypertext Transfer Protocol-only secure session cookies.
6. Unified Request Security Context binding identity, organization, membership, roles, and permissions.
7. Database-backed role and permission evaluation that fails closed.
8. Audited organization, membership, role, permission, and role-assignment mutations.
9. Runtime health endpoint that reports configuration state without exposing secrets.
10. Initial organization, member, and role administration interface.

## Required Preview environment values

No secret is stored in this repository.

- DATABASE_URL
- DATABASE_SSL_MODE: `verify-full`, `require`, or `disable` for local testing only
- DATABASE_POOL_MAX: optional, default `5`
- OIDC_ISSUER
- OIDC_AUDIENCE
- OIDC_CLIENT_ID
- OIDC_CLIENT_SECRET: optional when the provider requires a confidential client
- OIDC_REDIRECT_URI
- OIDC_ALLOWED_ALGORITHMS: optional, default `RS256,PS256,ES256`
- OIDC_SCOPES: optional, default `openid profile email`
- SESSION_SECRET: minimum 32 characters
- SESSION_MAX_AGE_SECONDS: optional, default `3600`

## Promotion gate

The branch must not be merged into `main` until:

1. GitHub unit tests pass.
2. PostgreSQL migration 001 and 002 apply cleanly to a fresh PostgreSQL 16 instance.
3. Runtime database integration tests pass.
4. Tenant row-level security behavior is tested with a non-owner runtime role.
5. Audit update and delete attempts are rejected.
6. Vercel Preview build succeeds.
7. Preview homepage remains unchanged from the verified production baseline.
8. Runtime health endpoint is checked.
9. OpenID Connect provider configuration is completed in Preview.
10. The administration interface is exercised through a real authenticated Preview session.

Production remains unchanged until the final promotion gate is explicitly approved.

## One-time organization bootstrap

The first institutional owner is not provisioned through an unauthenticated web endpoint. This is intentional.

After the Preview PostgreSQL database and OpenID Connect provider are configured, run the controlled operator command:

`npm run bootstrap:organization`

The command requires the `BOOTSTRAP_*` environment values shown in `.env.example`. It creates or binds the verified identity, creates the organization, activates membership, assigns the `sovereign_owner` role, and emits audit evidence. No bootstrap secret or bypass endpoint is exposed through the public application.
