# Implementation Plan - Public Infographic Pages

## Summary

Keep the redesigned overview hub as the public-route reference and bring the six `/learn/*` pages into the same infographic-first HTML language. Replace the current extra topic-page hero/support chrome with themed PNG-style infographic cards, preserve the fixed compact public header, and keep the existing landing-board plus topic-board dialog interactions while enlarging the shared floating dialog shell and upgrading it to a four-card technical brief.

The current refinement pass also moves the overview explanatory paragraph into the hero, promotes a larger right-side CTA, replaces the earlier green-forward palette with the requested red/yellow/blue family mapping, propagates the same readability and board-fit standards across the overview plus all six topic pages, and rewrites the shared public copy module so dialogs and detail panels explain BES decisions through explicit wastewater, stack, evidence, and uncertainty variables.

## Source-of-truth files

- `specs/020-metrev-three-phase-product-plan/`
- `specs/021-public-infographic-pages/`
- `apps/web-ui/src/app/page.tsx`
- `apps/web-ui/src/components/`
- `apps/web-ui/src/app/globals.css`
- `tests/web-ui/`

## Affected layers and areas

- public route entrypoints, layout offsets, and routing
- public-route UI composition, infographic visuals, dialog interactions, and public authored BES explanatory copy
- signed-in app-shell bypass rules for public educational routes
- focused web UI tests and quickstart guidance

## Required durable artifacts

- `spec.md`: defines the route split and infographic scope
- `plan.md`: captures route and component strategy
- `tasks.md`: tracks implementation and validation
- `quickstart.md`: records verification and route behavior
- `research.md`: not needed
- `contracts/`: not needed

## Research inputs

- current owner: `specs/020-metrev-three-phase-product-plan/`
- current implementation: `apps/web-ui/src/app/page.tsx`, `apps/web-ui/src/components/public-overview-hub.tsx`, `apps/web-ui/src/components/public-topic-page.tsx`, `apps/web-ui/src/components/public-topic-infographics.tsx`, and `apps/web-ui/src/app/globals.css`

## Contracts and canonical owner files

- contracts affected: none
- canonical owner files: `specs/020-metrev-three-phase-product-plan/`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No domain, persistence, or API boundary changes. The main shape change is public-route composition plus the shared public dialog content model in the Next.js web app.

## Implementation steps

1. Reconcile the 021 feature pack so it explicitly covers the second-pass topic-page redesign rather than claiming the six topic pages are already finished.
2. Extend or repurpose the shared public topic config so one typed source drives the topic-page header band, node labels, bottom tag pills, and dialog content.
3. Rework the topic branch of the public infographic renderer into a themed six-node strip that matches the PNG composition while preserving the modal-opening interaction model.
4. Simplify the shared topic-page shell so the infographic card becomes the primary page body and the remaining explanatory copy becomes secondary supporting context.
5. Keep the fixed public nav and `/learn/*` public-shell behavior unchanged while tuning shared CSS for the six topic themes and responsive breakpoints.
6. Expand the shared public dialog renderer so landing-board and topic-board dialogs use one larger floating shell and one four-card technical briefing structure.
7. Rewrite the six landing lens dialogs and the default topic-board dialog builder with citation-light, authority-grounded engineering copy.
8. Update focused tests and route validation so the new topic-page composition and dialog structure are covered without reopening unrelated signed-in workspace surfaces.
9. Apply the requested public palette remap across landing boards, topic-page headers, topic-board strips, tags, pager controls, and active route states while preserving readable contrast.
10. Rebalance hero and board typography so explanatory text is justified where appropriate, the overview CTA is more prominent, and landing/topic board labels fit within their cards without cross-column spill.
11. Propagate richer BES-specific copy through `public-topic-content.ts`, `public-overview-hub.tsx`, and the shared panel dialog builder while preserving the short visible labels that protect layout fit.

## Validation strategy

- unit: focused render tests for the overview hub and topic page composition
- integration: route-aware nav behavior, dialog-trigger structure, shared dialog section labels, and signed-in app-shell bypass for `/learn/*`
- e2e/manual: browser checks for `/` plus all six topic routes on desktop and mobile, including modal open/close behavior and larger desktop dialog sizing
- docs/contracts: feature pack created; no contract-owner changes needed

## Critique summary

The main risk is recreating the PNG composition too literally and losing route clarity or click affordance. The second risk is widening the dialogs without giving them a stronger structure, which would waste the extra space. The safer path is one shared HTML infographic card and one shared technical dialog model that preserve the public-route navigation semantics.

The additional risk in the palette parity pass is letting theme changes drift into six separate page-specific CSS branches. The safer path is to keep theme assignment in the shared page and infographic layers so hero, nav, strip, tags, and detail cards all inherit one topic-level palette family.

The additional risk in the copy-propagation pass is letting longer scientific prose spill back into the compact board layout. The safer path is to keep visible route markers, board titles, and preview chips short while moving the denser explanation into shared summaries, rationale panels, and dialog sections.

## Refined final plan

Use a reusable topic-card infographic primitive plus typed dialog content so all six topic pages stay data-driven, route-safe, and visually aligned without branching into six independent page implementations. Keep the public copy module as the authored assembly layer, but ground the stronger technical language in the active domain, contract, and product-plan owners while preserving the current UI geometry.

## Rollback / safety

The route split is additive. If needed, `/` can temporarily continue to serve the new overview hub while `/learn/*` routes are hidden from public nav or reverted without affecting signed-in workspace routes.
