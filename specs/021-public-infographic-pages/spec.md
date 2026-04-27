# Feature Specification - Public Infographic Pages

## Objective

Split the current single public landing into a public overview hub plus six dedicated educational topic pages with code-built infographic boards that explain METREV's bioelectrochemical system context more clearly.

## Why

The current one-page landing compresses too many ideas into one long scroll and the visuals do not explain the science or workflow with enough structure. Separate topic pages allow each concept to be taught with one clear infographic.

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
- add six public topic routes for Problem, Technology, Stack, Comparison, ODS/Impact, and METREV workflow
- replace the current public visuals with infographic-style, code-built route visuals
- keep the signed-in redirect on `/` to `/dashboard`
- keep public educational pages outside the signed-in workspace chrome

### Out

- changes to signed-in dashboard, evaluation, or report IA
- domain or contract vocabulary changes
- external image-generation pipeline or remote asset dependency

## Functional requirements

1. Anonymous visitors must see `/` as an overview hub with links to the six topic pages.
2. Each topic page must have one structured infographic board with numbered explanatory panels tied to the BES context discussed by that page.
3. Public navigation must be route-aware across `/` and `/learn/*`.
4. Signed-in users must still be redirected from `/` to `/dashboard`.
5. `/learn/*` pages must remain public and must not render the signed-in app sidebar when a session exists.

## Acceptance criteria

- [ ] `specs/021-public-infographic-pages/` contains `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md`
- [ ] `/` renders a public overview hub instead of the old long single-topic landing composition
- [ ] `/learn/problem`, `/learn/technology`, `/learn/stack`, `/learn/comparison`, `/learn/impact`, and `/learn/metrev` render topic-specific infographic pages
- [ ] topic-page visuals are code-built and include readable panel text, legends, and explanatory notes
- [ ] focused public-route tests cover the overview hub and at least one topic page

## Clarifications and open questions

- `specs/020-metrev-three-phase-product-plan/` remains the product-positioning owner; 021 is the public-route execution slice.
- Keep `/learn/*` public for both anonymous and signed-in viewers so the educational pages remain shareable.

## Risks / unknowns

- public-route visual density can become noisy if each infographic tries to explain too many concepts at once
- public-route IA and signed-in app-shell behavior can drift if `/learn/*` is not explicitly treated as a public surface
