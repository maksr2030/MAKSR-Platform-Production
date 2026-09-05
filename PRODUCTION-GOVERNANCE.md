# MAKSR Production Governance

## Authoritative repository
This private repository is the controlled source of truth for MAKSR production code.

## Production domain
- https://maksr.com

## Deployment policy
- Production changes must originate from the default branch `main` after review.
- Preview deployments must not be treated as production evidence.
- Domain configuration, deployment state, and source state must remain traceable.

## Source integrity
- Do not replace the current production website with an approximation reconstructed from screenshots.
- Preserve the currently deployed production implementation until its exact source has been recovered or verified.
- Any migration to Git-based production deployment must verify visual and functional parity before cutover.

## Protected operational data
- Secrets, credentials, tokens, environment variables, and private keys must never be committed to this repository.
