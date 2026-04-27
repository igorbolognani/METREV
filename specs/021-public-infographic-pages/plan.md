# Implementation Plan - Public Infographic Pages

## Summary

Redesign the existing public-route layer under `/learn/*` while keeping `/` as an overview hub. Replace the current abstract radial/orbit visuals with reusable linear infographic boards, a fixed compact public header, landing-board detail dialogs, and smaller topic-page infographic flows that open fuller explanations.

## Source-of-truth files

- `specs/020-metrev-three-phase-product-plan/`
- `specs/021-public-infographic-pages/`
- `apps/web-ui/src/app/page.tsx`
- `apps/web-ui/src/components/`
- `apps/web-ui/src/app/globals.css`
- `tests/web-ui/`

## Affected layers and areas

- public route entrypoints, layout offsets, and routing
- public-route UI composition, infographic visuals, and dialog interactions
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

No domain, persistence, or API boundary changes. The main shape change is public-route composition in the Next.js web app.

## Implementation steps

1. Update the 021 feature pack to own the redesign behavior and constraints.
2. Extend the shared public topic config so the same typed source drives landing boards, topic-page boards, and dialog content.
3. Replace the current radial/orbit infographic implementation with reusable linear infographic-board primitives.
4. Rework the public header and shared public-route styling so the navigation is fixed, slimmer, and offset safely from page content.
5. Rework `/` into a higher-contrast overview hub with six modal-opening landing boards.
6. Rework `/learn/[topic]` pages into descriptive intros plus smaller modal-opening infographic flows.
7. Keep `/learn/*` public in the app shell and update focused tests plus validation.

## Validation strategy

- unit: focused render tests for the overview hub and topic page composition
- integration: route-aware nav behavior, dialog-trigger structure, and signed-in app-shell bypass for `/learn/*`
- e2e/manual: browser checks for `/` plus all six topic routes on desktop and mobile, including modal open/close behavior
- docs/contracts: feature pack created; no contract-owner changes needed

## Critique summary

The main risk is replacing one hard-to-read layout with another one that still tries to teach everything at once. The linear board system should keep the visible layer short and move the fuller explanation into dialogs.

## Refined final plan

Use a reusable linear infographic-board primitive plus typed dialog content so the public routes stay data-driven, route-safe, and easier to refine without duplicating page structure.

## Rollback / safety

The route split is additive. If needed, `/` can temporarily continue to serve the new overview hub while `/learn/*` routes are hidden from public nav or reverted without affecting signed-in workspace routes.
