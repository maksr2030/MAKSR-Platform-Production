# MAKSR Design System v2 — Public Audience, Legal Architecture, and Exchange Shell

Status: Preview-only. No production promotion is authorized.

Added public audience pages:
- How MAKSR Works
- For Sellers
- For Buyers
- For Investors
- For Corporates
- For Advisors
- About
- Help Center

Added legal information architecture:
- Terms
- Privacy
- Confidentiality
- Marketplace Rules
- Transaction Disclaimer
- Intellectual Property
- Data Processing

Legal pages are structural drafts only and require qualified legal review before production.

Added authenticated Exchange visual shell:
- Home
- Discover
- Saved
- Compare
- Mandates
- Deals
- Messages
- Data Rooms
- Notifications
- Organization

The Exchange shell is static and Preview-only. It does not create sessions, bypass OpenID Connect, read live PostgreSQL data, upload evidence, create deals, save mandates or expose confidential information.

The existing sovereign runtime remains authoritative for identity, tenant isolation, roles, permissions and audit.

Promotion blockers:
1. Explicit owner approval.
2. Real Preview PostgreSQL and OpenID Connect.
3. Request Security Context wired into the Exchange.
4. Authorization mapped to runtime permissions.
5. Qualified legal review.
6. Accessibility and mobile visual review.
7. noindex removed only during an approved production cutover.
