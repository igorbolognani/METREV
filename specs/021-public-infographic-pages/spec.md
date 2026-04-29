# Feature Specification - Public Infographic Pages

## Objective

Bring the six dedicated public topic pages and the shared public dialogs into the same higher-contrast, linear infographic language as the redesigned overview hub, using the supplied PNGs as HTML composition targets while keeping fixed route navigation, larger floating explanatory detail panels, and richer BES-specific technical-scientific copy across the overview, topic pages, and dialogs.

## Why

The overview hub now follows the intended linear-board direction, but the `/learn/*` pages initially carried extra hero/support chrome, a more generic infographic treatment than the supplied PNG references, and thinner explanatory copy than the engineering workflow it needed to communicate. This pass should make each topic route read like those references without turning the shipped UI into static image slices or flattening the BES narrative into generic marketing language.

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
- keep the redesigned landing overview hub as the visual reference for the public route system
- replace the current topic-page compact infographic treatment with infographic-first HTML cards that match the PNG composition more closely
- keep the public navigation fixed, compact, and route-aware across `/` and `/learn/*`
- make the six landing boards open floating explanatory windows instead of navigating on primary click
- make all public dialogs use the same larger floating shell on desktop while remaining modal, rounded, and dismissible
- make the landing-board and topic-board dialogs use the same citation-light four-card technical brief structure with explicit risk and check framing
- keep the dedicated `/learn/*` topic routes as the primary route destinations via the fixed navigation
- make each topic page render a themed infographic-first card with a six-point linear strip, page-level route marker, and bottom tag pills
- propagate overview readability, spacing, and palette standards across the overview hub and all six topic routes
- move the overview explanatory paragraph into the hero and promote the primary CTA into a larger right-side action block on desktop
- make each topic-page infographic point open a floating explanatory window with fuller copy
- propagate richer BES-specific explanatory copy across the overview hero, per-page rationale cards, landing dialogs, and topic-board dialogs without changing the current public UI structure
- use the attached PNG references only as design/composition guidance for the code-built UI
- keep the signed-in redirect on `/` to `/dashboard`
- keep public educational pages outside the signed-in workspace chrome

### Out

- changes to signed-in dashboard, evaluation, or report IA
- domain or contract vocabulary changes
- external image-generation pipeline or remote asset dependency

## Functional requirements

1. Anonymous visitors must see `/` as an overview hub with links to the six topic pages.
2. The landing page must render one readable overview section plus six linear boards that open larger floating explanatory windows on click.
3. Each topic page must render one infographic-first HTML card with a themed header band, a six-node linear strip, bottom tag pills, and floating detail dialogs tied to the BES context discussed by that page.
4. Landing-board dialogs and topic-board dialogs must share one technical briefing structure so the public educational layer stays consistent across routes.
5. Public navigation must be fixed, compact, and route-aware across `/` and `/learn/*`.
6. Signed-in users must still be redirected from `/` to `/dashboard`.
7. `/learn/*` pages must remain public and must not render the signed-in app sidebar when a session exists.
8. Public overview, topic-detail panels, landing dialogs, and topic-board dialogs must explain BES decisions through explicit wastewater, stack, evidence, uncertainty, and workflow variables rather than generic sustainability or innovation copy.

## Acceptance criteria

- [x] `specs/021-public-infographic-pages/` contains `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md`
- [x] `/` renders a public overview hub instead of the old long single-topic landing composition
- [x] `/` uses a higher-contrast upper composition and a lower linear infographic section with six modal-opening boards
- [x] `/learn/problem`, `/learn/technology`, `/learn/stack`, `/learn/comparison`, `/learn/impact`, and `/learn/metrev` render topic-specific infographic-first pages
- [x] topic-page visuals are code-built, linear, interactive, and include fuller floating detail panels
- [x] landing-board and topic-board dialogs use the same larger floating shell on desktop
- [x] public dialogs use a shared four-card technical brief structure with stronger engineering and uncertainty framing
- [x] public overview copy, topic-detail panels, landing dialogs, and topic dialogs now use richer BES-specific language tied to operating variables, evidence posture, and uncertainty framing
- [x] the fixed public header remains readable on desktop and mobile without overlapping page content
- [x] the overview hero keeps the explanatory paragraph under the subtitle while the CTA remains large, centered, and visually distinct on the right at desktop widths
- [x] landing boards and topic routes follow the requested red, light red, yellow, light yellow, blue, and light blue palette families with readable contrast
- [x] focused public-route tests cover the overview hub and at least one topic page

## Clarifications and open questions

- `specs/020-metrev-three-phase-product-plan/` remains the product-positioning owner; 021 is the public-route execution slice.
- Keep `/learn/*` public for both anonymous and signed-in viewers so the educational pages remain shareable.
- Keep the current ODS page slug as `/learn/impact`; only the visible labeling needs to reflect ODS.
- The chat-provided PNG files are design references, not runtime-rendered production assets.

## Risks / unknowns

- public-route visual density can become noisy if the linear boards still carry too much copy before the modal opens
- denser scientific copy can reintroduce dialog or board-fit regressions if the shared authored strings stop respecting the short-label and longer-dialog split
- public-route IA and signed-in app-shell behavior can drift if `/learn/*` is not explicitly treated as a public surface
