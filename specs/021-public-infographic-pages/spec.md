# Feature Specification - Public Infographic Pages

## Objective

Redesign the current public overview hub and six dedicated educational topic pages into a higher-contrast, linear infographic experience with fixed route navigation and floating explanatory detail panels.

## Why

The first public-route pass created the correct route split, but the landing page still feels visually dense and the infographic treatment is harder to read than it should be. The redesign should make the public layer easier to scan, more interactive, and closer to the linear board composition shown in the design references without turning the shipped UI into static image slices.

## Primary users

- prospective clients and stakeholders evaluating the product before login
- engineers and analysts who need a clean public explanation of the BES context covered by METREV

## Affected layers

- domain semantics: no canonical domain changes
- contract boundary: no contract changes
- runtime adapters: none
- UI: public web routes, public navigation, infographic components, tests, and styles
- infrastructure: none
- docs and workflow: new feature pack and quickstart for the public-route redesign

## Scope

### In

- keep `/` as a public overview hub
- keep six public topic routes for Problem, Technology, Stack, Comparison, ODS/Impact, and METREV workflow
- redesign the landing page upper section for stronger readability and contrast
- replace the current radial/orbit infographic treatment with linear, code-built infographic boards
- keep the public navigation fixed, compact, and route-aware across `/` and `/learn/*`
- make the six landing boards open floating explanatory windows instead of navigating on primary click
- keep the dedicated `/learn/*` topic routes as the primary route destinations via the fixed navigation
- make each topic page render a descriptive explanation above a smaller interactive six-point linear infographic
- make each topic-page infographic point open a floating explanatory window with fuller copy
- use the attached PNG references only as design/composition guidance for the code-built UI
- keep the signed-in redirect on `/` to `/dashboard`
- keep public educational pages outside the signed-in workspace chrome

### Out

- changes to signed-in dashboard, evaluation, or report IA
- domain or contract vocabulary changes
- external image-generation pipeline or remote asset dependency

## Functional requirements

1. Anonymous visitors must see `/` as an overview hub with links to the six topic pages.
2. The landing page must render one readable overview section plus six linear boards that open floating explanatory windows on click.
3. Each topic page must render a descriptive intro plus one smaller linear infographic board with six interactive points tied to the BES context discussed by that page.
4. Public navigation must be fixed, compact, and route-aware across `/` and `/learn/*`.
5. Signed-in users must still be redirected from `/` to `/dashboard`.
6. `/learn/*` pages must remain public and must not render the signed-in app sidebar when a session exists.

## Acceptance criteria

- [ ] `specs/021-public-infographic-pages/` contains `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md`
- [ ] `/` renders a public overview hub instead of the old long single-topic landing composition
- [ ] `/` uses a higher-contrast upper composition and a lower linear infographic section with six modal-opening boards
- [ ] `/learn/problem`, `/learn/technology`, `/learn/stack`, `/learn/comparison`, `/learn/impact`, and `/learn/metrev` render topic-specific infographic pages
- [ ] topic-page visuals are code-built, linear, interactive, and include fuller floating detail panels
- [ ] the fixed public header remains readable on desktop and mobile without overlapping page content
- [ ] focused public-route tests cover the overview hub and at least one topic page

## Clarifications and open questions

- `specs/020-metrev-three-phase-product-plan/` remains the product-positioning owner; 021 is the public-route execution slice.
- Keep `/learn/*` public for both anonymous and signed-in viewers so the educational pages remain shareable.
- Keep the current ODS page slug as `/learn/impact`; only the visible labeling needs to reflect ODS.
- The chat-provided PNG files are design references, not runtime-rendered production assets.

## Risks / unknowns

- public-route visual density can become noisy if the linear boards still carry too much copy before the modal opens
- public-route IA and signed-in app-shell behavior can drift if `/learn/*` is not explicitly treated as a public surface
