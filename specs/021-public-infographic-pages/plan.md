# Implementation Plan - Public Infographic Pages

## Summary

Create a new public-route layer under `/learn/*` while keeping `/` as an overview hub. Replace the current abstract landing visuals with reusable infographic boards that use one central BES/system graphic and six numbered explanatory panels per topic page.

## Source-of-truth files

- `specs/020-metrev-three-phase-product-plan/`
- `apps/web-ui/src/app/page.tsx`
- `apps/web-ui/src/components/`
- `apps/web-ui/src/app/globals.css`
- `tests/web-ui/`

## Affected layers and areas

- public route entrypoints and routing
- public-route UI composition and infographic visuals
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
- current implementation: `apps/web-ui/src/app/page.tsx`, `apps/web-ui/src/components/public-landing.tsx`, and `apps/web-ui/src/app/globals.css`

## Contracts and canonical owner files

- contracts affected: none
- canonical owner files: `specs/020-metrev-three-phase-product-plan/`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No domain, persistence, or API boundary changes. The main shape change is public-route composition in the Next.js web app.

## Implementation steps

1. Create the 021 feature pack and record the new public-route structure.
2. Add shared public topic config, public navigation, infographic-board components, and topic-page composition.
3. Rework `/` into an overview hub and add `/learn/[topic]` routes.
4. Treat `/learn/*` as a public surface in the app shell even when a session exists.
5. Update focused tests and validate with lint, JS tests, and build-safe checks.

## Validation strategy

- unit: focused render tests for the overview hub and topic page composition
- integration: route-aware nav behavior and signed-in app-shell bypass for `/learn/*`
- e2e/manual: browser checks for `/` plus all six topic routes on desktop and mobile
- docs/contracts: feature pack created; no contract-owner changes needed

## Critique summary

The main risk is building a second oversized landing surface spread across routes. The design must keep one teaching question per topic page and avoid turning each infographic into a second dense essay.

## Refined final plan

Use a reusable infographic-board primitive and a typed topic-content map so the public routes are data-driven, route-safe, and easy to refine without duplicating page structure.

## Rollback / safety

The route split is additive. If needed, `/` can temporarily continue to serve the new overview hub while `/learn/*` routes are hidden from public nav or reverted without affecting signed-in workspace routes.
