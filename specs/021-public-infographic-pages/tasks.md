# Tasks - Public Infographic Pages

## Workstream 1 - Artifacts and scope reconciliation

- [x] T1 Create the 021 feature pack for the public-route infographic redesign.
- [x] T2 Define the initial public-route IA, topic config, and infographic-board structure.
- [x] T3 Redefine the 021 scope for the fixed-nav, linear-infographic, modal-detail redesign.
- [x] T4 Reopen 021 for the second-pass topic-page PNG-to-HTML redesign.

## Workstream 2 - Topic-page implementation

- [x] T5 Extend the shared public topic renderer so the six `/learn/*` pages can reuse one infographic-first HTML card.
- [x] T6 Simplify the shared topic-page shell so the infographic becomes the primary page body.
- [x] T7 Add PNG-style topic themes, node spacing, and bottom tag pills for Problem, Technology, Stack, Comparison, ODS, and METREV.
- [x] T8 Keep landing behavior stable while preserving the same floating dialog model on the topic-page nodes.
- [x] T9 Keep `/learn/*` outside the signed-in app shell.

## Workstream 3 - Validation and follow-through

- [x] T10 Update focused web UI and Playwright coverage for the new interaction model.
- [x] T11 Update focused SSR coverage for the infographic-first topic-page layout.
- [x] T12 Run lint, build, and public-route interaction validation for the second-pass topic-page redesign.
- [x] T13 Record verification and route behavior in quickstart.

## Workstream 4 - Shared public-dialog refinement

- [x] T14 Expand the shared public dialog model beyond the previous three-card layout.
- [x] T15 Apply a larger floating dialog shell across landing-board and topic-board dialogs.
- [x] T16 Rewrite the six landing lens dialogs with stronger engineering and uncertainty framing.
- [x] T17 Propagate the same four-card technical structure through the default topic-board dialogs and regression coverage.

## Workstream 5 - Palette and readability parity

- [x] T18 Move the overview explanatory text into the hero and promote the primary CTA into a larger right-side action surface.
- [x] T19 Remap the public overview boards to the requested red, light red, yellow, light yellow, blue, and light blue family.
- [x] T20 Apply the same page-level palette family to each `/learn/*` route and its internal infographic strip.
- [x] T21 Propagate readability and fit refinements across overview and topic pages so headings, chips, and board labels stay inside their cards without degraded contrast.

## Workstream 6 - BES copy propagation

- [x] T22 Propagate richer BES-specific copy through the shared overview hero, topic rationale panels, landing dialogs, and topic-board dialogs without changing the current public layout model.
- [x] T23 Update focused SSR and desktop Playwright regression coverage so the richer public copy is verified in both static render output and live dialog interactions.

## Dependencies

- `specs/020-metrev-three-phase-product-plan/` remains the positioning owner.
- Public-route implementation depends only on `apps/web-ui` and focused web UI tests.

## Parallelizable

- [x] P1 Fixed header styling and responsive spacing.
- [x] P2 Topic-copy refinement for landing dialogs and per-page detail panels.
- [x] P3 Shared public-dialog shell and technical-brief structure.
- [x] P4 Authored BES-copy propagation through shared topic content and overview copy owners.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
