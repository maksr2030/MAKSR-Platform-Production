# MAKSR Preview Provider Scorecard

Date: 2026-09-13
Environment: Preview

## Weighting

| Criterion | Weight |
|---|---:|
| Data location and jurisdiction | 20 |
| Encryption at rest and in transit | 10 |
| Managed backups | 10 |
| Point-in-Time Recovery | 10 |
| Network isolation | 15 |
| Key and secret management | 10 |
| Audit and database logging | 10 |
| Vercel compatibility | 15 |
| Total | 100 |

## Decision Matrix

Scores are architecture-fit scores for MAKSR Preview, not general product rankings.

| Provider | Data Location | Encryption | Backups | Point-in-Time Recovery | Network Isolation | Key and Secret Management | Audit and Logging | Vercel Compatibility | Weighted Result |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Oracle Cloud Infrastructure Database with PostgreSQL, Saudi Arabia West | 20/20 | 10/10 | 10/10 | 10/10 | 15/15 | 8/10 | 10/10 | 9/15 | 92/100 |
| Amazon Relational Database Service for PostgreSQL, Middle East | 8/20 | 10/10 | 10/10 | 10/10 | 15/15 | 10/10 | 10/10 | 15/15 | 88/100 |
| Microsoft Azure Database for PostgreSQL Flexible Server, nearby Middle East | 8/20 | 10/10 | 10/10 | 10/10 | 14/15 | 10/10 | 9/10 | 12/15 | 83/100 |
| Supabase Managed PostgreSQL | 2/20 | 8/10 | 8/10 | 7/10 | 8/15 | 6/10 | 7/10 | 15/15 | 61/100 |
| Neon PostgreSQL | 2/20 | 8/10 | 8/10 | 8/10 | 7/15 | 6/10 | 7/10 | 15/15 | 61/100 |

## Interpretation

Oracle Cloud Infrastructure wins because in-country Saudi data location and a private-only managed PostgreSQL endpoint outweigh its weaker direct Vercel private-network path on the current account plan.

Amazon Relational Database Service would become a stronger candidate when the announced Amazon Web Services Saudi Arabia Region is generally available and the required PostgreSQL services are confirmed there.

Vercel compatibility is deliberately scored lower for Oracle Cloud Infrastructure because the sovereign database must remain private. The architecture therefore does not authorize a direct browser or public-database path. A Saudi-hosted runtime access layer or an approved private Vercel connectivity mechanism must mediate database access.

## Identity Provider Scorecard

| Provider | Saudi Home Region Control | OpenID Connect | Multi-Factor Authentication | Enterprise Federation | Lifecycle Provisioning | Operational Burden | MAKSR Fit |
|---|---:|---:|---:|---:|---:|---:|---:|
| Oracle Cloud Infrastructure Identity and Access Management Identity Domain | High | High | High | High | High | Low | SELECTED |
| Self-hosted Keycloak in Saudi Arabia | High | High | High | High | High | High | Reserve option |
| Microsoft Entra ID | Medium | High | High | High | High | Low | Federation target, not Preview authority |
| Auth0 | Low for Saudi residency objective | High | High | High | High | Low | Not selected |
| Amazon Cognito | Low until Saudi region availability is confirmed | High | High | Medium | Medium | Low | Not selected |

## Final Selection

Database: Oracle Cloud Infrastructure Database with PostgreSQL in Saudi Arabia West (Jeddah).

Identity: dedicated non-default Oracle Cloud Infrastructure Identity and Access Management Identity Domain homed in Saudi Arabia West (Jeddah), with replication disabled unless separately approved.
