# MAKSR Preview Provisioning Checklist

This checklist is intentionally separate from Production.

## Oracle Cloud Infrastructure Database with PostgreSQL

- [ ] Oracle Cloud Infrastructure tenancy available
- [ ] Saudi Arabia West (Jeddah) region subscribed
- [ ] `maksr-preview` compartment created
- [ ] `maksr-preview-vcn` Virtual Cloud Network created
- [ ] private runtime subnet created
- [ ] private database subnet created
- [ ] runtime Network Security Group created
- [ ] PostgreSQL Network Security Group created
- [ ] PostgreSQL ingress restricted to approved runtime source on port 5432
- [ ] Oracle Cloud Infrastructure Vault created or selected
- [ ] unique Preview database administrator secret created
- [ ] PostgreSQL 17 database system provisioned
- [ ] database public exposure confirmed absent
- [ ] encrypted transport certificate recorded
- [ ] automated backups enabled
- [ ] Point-in-Time Recovery enabled for 14 days
- [ ] PostgreSQL service logging enabled
- [ ] PostgreSQL Audit Extension enabled
- [ ] migration 001 applied
- [ ] migration 002 applied
- [ ] tenant isolation verified
- [ ] audit chain verified

## Oracle Cloud Infrastructure Identity and Access Management Identity Domain

- [ ] dedicated non-default Preview Identity Domain created
- [ ] home region is Saudi Arabia West (Jeddah)
- [ ] additional region replication disabled
- [ ] administrative Multi-Factor Authentication required
- [ ] confidential MAKSR Preview Web application registered
- [ ] Authorization Code flow enabled
- [ ] Proof Key for Code Exchange required
- [ ] exact redirect address allowlisted
- [ ] exact logout redirect address allowlisted
- [ ] OpenID Connect issuer recorded
- [ ] client identifier recorded
- [ ] client secret stored only as protected Preview secret
- [ ] separate Preview users created

## MAKSR Preview Runtime

- [ ] Preview `DATABASE_URL` configured only in protected runtime secret storage
- [ ] certificate-validated encrypted database connection enabled
- [ ] Preview OpenID Connect values configured
- [ ] independent Preview session secret configured
- [ ] first organization bootstrap completed
- [ ] real authenticated login completed
- [ ] `/api/v1/runtime/health` reports database ready
- [ ] `/api/v1/runtime/health` reports OpenID Connect ready
- [ ] administration interface loads authenticated organization
- [ ] member read tested
- [ ] role read tested
- [ ] permission read tested
- [ ] authorized mutation tested
- [ ] unauthorized mutation rejected
- [ ] cross-organization access rejected
- [ ] audit event written
- [ ] audit event chain validates
- [ ] audit mutation rejected
- [ ] production homepage remains unchanged

## Promotion Rule

Do not merge the Runtime Production Layer into `main` until every required Preview item above is evidenced or an explicit sovereign exception is approved and recorded.
