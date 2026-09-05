# MAKSR Platform Production

Authoritative private production repository for MAKSR.

Primary production domain: https://maksr.com

Purpose: controlled production source for MAKSR digital asset acquisition, early investment, build-for-equity, and strategic technology transactions.

## Production state

The live MAKSR interface remains in service. Git-based production cutover is intentionally blocked until the exact production source is recovered and verified.

Current recovery controls:

- `PRODUCTION-GOVERNANCE.md` — production source and deployment control policy.
- `SOURCE-RECOVERY.md` — exact-source recovery requirement.
- `recovery/PRODUCTION-SOURCE-MANIFEST.json` — authoritative recovery metadata and known domain set.
- `recovery/CUTOVER-GATE.md` — mandatory acceptance gates before production alias movement.
- `recovery/verify_recovered_source.py` — deterministic SHA-256 source-integrity manifest generator.
- Issue #1 — exact production source recovery and cutover closure record.

## Mandatory principle

The current production implementation must not be replaced by an approximation reconstructed from screenshots. Screenshots may be used only as comparison evidence after the authoritative source is recovered.

Status: `SOURCE_RECOVERY_IN_PROGRESS`.
