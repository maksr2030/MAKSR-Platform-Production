# MAKSR Preview Sovereign Boundary

The Preview environment is a non-production security boundary.

## In Scope

- Preview database
- Preview Identity Domain
- Preview runtime secrets
- Preview callback addresses
- Preview users
- Preview audit logs
- Preview backup and recovery policies

## Out of Scope

- Production database
- Production Identity Domain
- Production user population
- Production secrets
- Production callback addresses
- Production backup or disaster-recovery policy

## Non-Negotiable Controls

1. No shared credential with Production.
2. No public PostgreSQL endpoint.
3. No browser access to database credentials.
4. No cross-environment user or session trust by default.
5. No merge to `main` before real Preview authentication and database evidence pass.
6. All administrative data changes remain tenant-bound and auditable.
