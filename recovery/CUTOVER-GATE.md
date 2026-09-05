# MAKSR Production Cutover Gate

No production cutover is authorized until every gate below is closed.

## Gate 1 — Exact source recovery
- Recover the exact source that generated the currently approved MAKSR production interface.
- Acceptable evidence: original source repository, verified Vercel source export, or source package proven to generate the same production output.
- Screenshots are evidence for comparison only and must not be used as the implementation source.

## Gate 2 — Build reproducibility
- Install dependencies from a committed lockfile.
- Build from a clean environment without local-only files.
- Record framework version, runtime version, package manager, build command, output directory, and environment-variable names.
- Do not commit secrets or secret values.

## Gate 3 — Visual parity
- Compare production and recovered build at mobile and desktop viewport sizes.
- Verify typography, spacing, breakpoints, navigation, language switch, cards, calls to action, footer, and responsive behavior.
- Any unexplained visual divergence blocks cutover.

## Gate 4 — Functional parity
- Verify every visible navigation target and user action.
- Verify Arabic and English routes or state changes.
- Verify all forms, submissions, redirects, and asset links that are intended to function in the current production release.
- Any broken or missing current-production behavior blocks cutover.

## Gate 5 — Domain and routing parity
- Primary production domain: https://maksr.com
- Confirm canonical host policy.
- Confirm apex and www behavior for every attached MAKSR domain.
- Confirm permanent redirects for secondary domains where intended.
- Confirm TLS certificate readiness before traffic switch.

## Gate 6 — Integrity evidence
- Generate SHA-256 hashes for source-critical files and production build artifacts.
- Record the exact Git commit SHA accepted for production.
- Record the exact Vercel deployment ID and production alias after deployment.
- Preserve the evidence record in the private repository.

## Gate 7 — Controlled cutover
- Create a preview deployment from the candidate Git commit.
- Complete visual and functional parity verification against the live site.
- Only after approval may the candidate deployment receive the production alias.
- Do not delete the last known-good deployment during cutover.

## Gate 8 — Post-cutover validation
- Verify https://maksr.com over HTTPS.
- Verify redirects and secondary domains.
- Verify there are no unexpected client or server errors.
- Record final production commit SHA, deployment ID, timestamp, and domain state.

Current state: BLOCKED AT GATE 1 pending exact production source recovery or authoritative source access.
