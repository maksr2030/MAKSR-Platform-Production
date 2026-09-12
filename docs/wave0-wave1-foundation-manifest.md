# MAKSR Wave 0 and Wave 1 Sovereign Foundation Manifest

## Scope

This branch implements the first integrated production foundation package before asset listing or marketplace user interfaces.

Included fixed feature identifiers:

- MKSR-F061 — Sovereign Security Architecture
- MKSR-F064 — Tenant Isolation and Key Management foundation
- MKSR-F066 — Audit Immutability and Evidence Architecture
- MKSR-F001 — Identity and Institutional Account Management foundation
- MKSR-F002 — Organization, Role, and Permission Management foundation

## Current implementation state

The package is implemented on the development branch `wave0-wave1-sovereign-foundation` only. It is not approved for production promotion yet.

Implemented controls:

1. Fail-closed security-context evaluation.
2. Hardened security response headers for the preview deployment.
3. Identity state contract and operational-state enforcement.
4. Explicit organization membership and tenant-scoped data model.
5. PostgreSQL row-level tenant-isolation policies.
6. Organization-scoped roles and explicit permissions.
7. Tamper-evident SHA-256 audit-chain implementation.
8. Immutable database audit-event protection against update and delete.
9. Atomic database audit append function with per-organization serialization.
10. Automated Node.js tests for identity, tenant isolation, permissions, audit integrity, and security context.
11. Automated PostgreSQL migration and policy verification in GitHub Actions.
12. Vercel preview health function exposing only non-sensitive implementation status.

## Deliberately not implemented in this package

The following belong to later fixed features or require explicit provider and regulatory decisions:

- Identity proofing and business verification under MKSR-F016.
- Threshold-based transaction authority under MKSR-F040 beyond basic role and permission enforcement.
- Production key-management provider integration.
- Production identity-provider integration.
- Production regional database provider and final data-residency selection.
- Production security-event collection and Security Information and Event Management integration.
- Asset listing, deal rooms, due diligence, valuation, and transaction workflows.

## Production promotion gate

Promotion to `main` is blocked until all of the following are complete:

- GitHub Actions foundation gate passes.
- Vercel Preview deployment completes successfully.
- Existing MAKSR public homepage remains visually and functionally unchanged.
- `/api/v1/foundation/health` returns a successful response on Preview.
- Database migration has been validated against PostgreSQL 16.
- Tenant-isolation policies are enabled and verified.
- Audit immutability trigger is present and verified.
- No secret values are committed.
- No new external provider assumption is silently introduced.

## REDS v2.1 implementation principle

Every material foundation control must have an executable implementation, an evidence-producing test, an explicit failure mode, and a traceable feature identifier.
