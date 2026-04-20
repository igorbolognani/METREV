# Implementation Plan — Analyst UX System

## Summary

Build a reusable METREV analyst workbench language on the existing Next.js and custom CSS stack, then apply it first to evaluation detail, case history comparison, and evidence review while preserving current runtime response shapes and business-rule ownership.

## Source-of-truth files

- `apps/web-ui/src/components/evaluation-cockpit.tsx`
- `apps/web-ui/src/components/external-evidence-review-board.tsx`
- `apps/web-ui/src/components/case-form.tsx`
- `apps/web-ui/src/app/globals.css`
- `apps/web-ui/src/lib/evaluation-workbench.ts`
- `packages/domain-contracts/src/schemas.ts`

## Affected layers and areas

- analyst-facing route hierarchy and visual language
- workbench presentation helpers and chart primitives
- SSR-safe UI validation

## Required durable artifacts

- `spec.md`: define the UX problem and acceptance criteria
- `plan.md`: map the workbench language onto the current runtime shape
- `tasks.md`: sequence primitives, route updates, and validation
- `quickstart.md`: document analyst validation for summary, evidence, modeling, and compare views
- `research.md`: capture the decision to stay on custom CSS and the explicit handling of simulation status
- `contracts/`: not needed because no new internal API boundary is introduced in this slice

## Research inputs

- current evaluation cockpit and evidence-review components
- the accepted simulation-enrichment runtime path and audit behavior
- existing web tests and route protections

## Contracts and canonical owner files

- contracts affected: no canonical boundary change intended
- canonical owner files: `packages/domain-contracts/src/schemas.ts`, `apps/web-ui/src/**/*`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No new backend boundary is required. The workbench consumes the existing evaluation and history responses.

## Implementation steps

1. Introduce reusable workbench primitives and visual tokens for comparison, signal labeling, and model-state framing.
2. Apply that system to the evaluation workbench, history rail, and comparison dock while preserving route and persistence behavior.
3. Reuse the same language across evidence-review surfaces and document the validation path.

## Validation strategy

- unit: keep SSR-safe workbench rendering covered in the web Vitest suite
- integration: run `pnpm run test`, `pnpm run lint`, and `pnpm run build`
- e2e/manual: sign in, submit a case, inspect summary, evidence, modeling, audit, and compare views, then confirm evidence review remains consistent
- docs/contracts: document the visual system and explicitly note that no API contract changed

## Critique summary

The main risk is over-designing the surface without improving analyst comprehension. The workbench must prioritize decision signals and traceability over decorative complexity.

## Refined final plan

Keep the UX slice rooted in the current runtime. Reuse the existing response shape, expose model state and provenance explicitly, and let shared CSS plus focused client components carry the visual upgrade.

## Rollback / safety

If the workbench language underperforms, revert the web-only primitives and route composition while keeping the stable simulation and persistence behavior intact.
