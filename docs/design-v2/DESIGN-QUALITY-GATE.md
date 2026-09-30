# MAKSR Design System v2 — Quality Gate

Status: active on the Preview-only `design-system-v2` branch.

## Acceptance intent

The first visual release is not accepted merely because Vercel builds it. It must also preserve the product-design constraints that make MAKSR look institutional rather than generated.

The automated gate checks:

1. All first-release pages are explicitly excluded from indexing while they are Preview-only.
2. All first-release pages use the shared design system and bilingual localization markers.
3. Gradients and glowing text are absent from the design system.
4. Visible keyboard focus and reduced-motion support exist.
5. Public copy does not introduce fabricated success rates, transaction volume, investor counts, trust logos, or similar unsupported claims.
6. Illustrative evaluation bars are explicitly labeled as illustrative.
7. Opportunity Detail states that it contains no live listing, valuation, ownership or transaction data.
8. The architecture document explicitly prohibits merge to `main` without owner approval.

## Manual review still required

Automated tests do not replace human visual review. Before any production promotion, review must cover:

- desktop information hierarchy;
- mobile navigation and touch targets;
- Arabic Right-to-Left composition;
- English composition;
- accessibility and contrast;
- visual restraint;
- no template-like repetition;
- clarity of public versus confidential data;
- navigation coherence;
- opportunity information density;
- overall institutional credibility.

## Production rule

Passing this quality gate does not authorize production. The branch remains Preview-only until the owner explicitly approves promotion.
