# MAKSR Design System v2 — Product Architecture Baseline

Status: Preview-only design baseline. Production must not be changed without explicit owner approval.

## 1. Final Information Architecture

MAKSR is structured as four distinct product environments:

1. Public MAKSR
   - Home
   - Explore Opportunities
   - Opportunity Detail
   - Acquire
   - Invest
   - Build for Equity
   - Strategic Partnerships
   - Licensing
   - Technology Transfer
   - Institutional Mandates
   - Intelligence
   - Trust & Verification
   - How MAKSR Works
   - Audience pages
   - List an Asset
   - About
   - Contact
   - Help Center
   - Legal

2. MAKSR Exchange
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
   - Settings
   - Help

3. MAKSR Deal Workspace
   - Overview
   - Participants
   - Confidentiality
   - Data Room
   - Due Diligence
   - Evaluation
   - Added Value
   - Risk
   - Offers
   - Negotiation
   - Term Sheet
   - Contracts
   - Closing
   - Transition
   - Audit Trail

4. MAKSR Sovereign Administration
   - Organization
   - Users
   - Roles
   - Permissions
   - Verification
   - Policies
   - Models
   - Audit
   - Security
   - Data Sovereignty
   - Incident Management

## 2. Sitemap

/
├── /opportunities/
│   └── /opportunities/preview/
├── /acquire/
├── /invest/
├── /build-for-equity/
├── /partnerships/
├── /licensing/
├── /technology-transfer/
├── /mandates/
├── /intelligence/
├── /trust/
├── /how-it-works/
├── /for-sellers/
├── /for-buyers/
├── /for-investors/
├── /for-corporates/
├── /for-advisors/
├── /list/
├── /about/
├── /contact/
├── /help/
├── /legal/
└── /admin/

The first implementation release intentionally builds only Home, Explore Opportunities, Opportunity Detail, the global design system, global navigation and footer. Remaining public pages stay in the roadmap until visual language is approved.

## 3. Navigation Architecture

Public desktop:
- Explore
- Transaction Paths
- Intelligence
- Resources
- Search
- Language
- Sign in
- List an Asset

Public mobile:
- Compact brand bar
- Search
- Language
- Menu
- One primary List an Asset action inside menu

Authenticated navigation:
- Dedicated application shell, not the public marketing navigation.

Deal navigation:
- Dedicated deal-side navigation plus persistent stage indicator.

## 4. Design System Specification

Principle: Confidence through restraint.

Color tokens:
- Background: #0A0A09
- Surface: #11110F
- Surface Elevated: #171714
- Border: #2A2924
- Text Primary: #F2F0EA
- Text Secondary: #C2BEB4
- Muted: #8C887F
- Accent: #BCA46A
- Accent Strong: #D2BA7C
- Success: #7BA88B
- Warning: #C6A15A
- Critical: #C77E78
- Information: #7E96B3

Typography:
- English: Inter/system sans stack.
- Arabic: Tajawal / IBM Plex Sans Arabic / system fallback.
- Display: clamp(3.5rem, 7vw, 7.5rem)
- H1: clamp(2.6rem, 5vw, 5rem)
- H2: clamp(2rem, 3.6vw, 3.5rem)
- H3: 1.5–2rem
- Body Large: 1.125rem
- Body: 1rem
- Small: .875rem
- Caption: .75rem

Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
Corner radii stay restrained: 4, 8, 12, 18.
Shadows are minimal and never used as glow effects.

Interaction:
- 150–260ms standard motion.
- Opacity, border, and 2px translate only.
- Full prefers-reduced-motion support.

## 5. Homepage Section Blueprint

1. Hero
2. Four transaction paths
3. Public opportunity area
4. Why MAKSR is structurally different
5. Transaction Intelligence
6. Transaction lifecycle
7. Institutional mandates
8. Trust infrastructure
9. Final call to action

No invented deal counts, success rates, logos or testimonials.

## 6. Explore Opportunities Blueprint

Desktop:
- Search and view controls
- Left filter rail
- Results area
- Card / compact list toggle
- Compare action
- Saved-search placeholder

Mobile:
- Search
- Filter bottom sheet
- Sort and view controls
- Full-width opportunity rows

No public opportunity is fabricated. If none are approved, the interface shows a deliberate institutional empty state.

## 7. Opportunity Detail Blueprint

Header:
- Breadcrumb
- Confidentiality label
- Title
- Transaction objective
- Verification state
- Save / Share / Request Access

Tabs:
- Overview
- Business
- Technology
- Financials
- Ownership & Intellectual Property
- Transaction
- Evaluation
- Documents
- Activity

Public preview uses withheld values rather than invented transaction data.

## 8. Mobile Navigation Model

Public:
- Header: brand, search, language, menu
- Menu drawer: Explore, Transaction Paths, Intelligence, Resources, Sign in, List an Asset

Authenticated:
- Bottom navigation: Home, Discover, Deals, Inbox, Profile

Deal:
- Bottom navigation: Overview, Activity, Tasks, More

## 9. Responsive Behavior Specification

Breakpoints:
- Mobile: 0–479px
- Large Mobile: 480–767px
- Tablet: 768–1023px
- Laptop: 1024–1279px
- Desktop: 1280–1599px
- Wide Desktop: 1600px+

Rules:
- No page-level horizontal overflow.
- Filter rail becomes modal/bottom sheet below tablet.
- Tables become internally scrollable or convert to stacked rows.
- Navigation collapses before link wrapping occurs.
- Typography scales down independently from container width.
- Touch targets remain at least 44px.

## 10. Implementation Plan

Phase A — Visual baseline
- Design tokens
- Accessibility foundation
- Global header
- Global footer
- Home
- Explore
- Opportunity detail

Phase B — Public transaction paths
- Acquire
- Invest
- Build for Equity
- Partnerships
- Licensing
- Technology Transfer

Phase C — Intake and institutional discovery
- List an Asset
- Mandates
- Trust
- Intelligence
- Audience pages

Phase D — Exchange application shell
- Discover
- Saved
- Compare
- Mandates
- Notifications

Phase E — Deal Workspace
- Due diligence
- Data room
- Evaluation
- Added Value
- Risk
- Offers
- Contracts
- Closing

Phase F — Sovereign Administration visual integration
- Preserve existing runtime controls and backend contracts.
- Re-skin only after public visual language is approved.

## Production Safety Rule

This branch is Preview only. Do not merge to main, assign production aliases, alter DNS, or publish to maksr.com without explicit owner approval.
