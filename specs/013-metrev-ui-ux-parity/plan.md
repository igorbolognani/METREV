# Implementation Plan — Analytical Workspace Refactor

Execution note: 013 remains the historical UI refactor pack. The active local-first execution plan moved to [014-local-first-professional-workspace](../014-local-first-professional-workspace/plan.md) and later follow-through UI slices.

## Summary

Keep `specs/013-metrev-ui-ux-parity/` as the antecedent design record for the broader analytical-workspace refactor that informed 014 and later UI follow-through: decision workspace first, then input, comparison, history/audit, and evidence review, with explicit output-side presentation mappers separating product composition from the raw runtime payload.

## Source-of-truth files

- `apps/web-ui/src/app/page.tsx`
- `apps/web-ui/src/components/case-form.tsx`
- `apps/web-ui/src/components/evaluation-cockpit.tsx`
- `apps/web-ui/src/components/external-evidence-review-board.tsx`
- `apps/web-ui/src/app/globals.css`
- `apps/web-ui/src/lib/evaluation-workbench.ts`
- `apps/web-ui/src/lib/case-intake.ts`

## Affected layers and areas

- decision-workspace hierarchy, top fold, and progressive disclosure
- presentation-layer mapping above the existing evaluation response
- input-deck follow-through, comparison/history promotion, and evidence-review alignment

## Required durable artifacts

- `spec.md`: define the analytical-workspace target and non-goals
- `plan.md`: map the decision-first rollout onto current runtime surfaces
- `tasks.md`: sequence mapper work, page refactors, and validation
- `quickstart.md`: document manual validation for decision, input, comparison, and audit flows
- `research.md`: record benchmark patterns plus the view-model seam and route-order decisions

## Research inputs

- current METREV workbench and route structure
- the approved UI benchmark repository and screenshots
- existing UX packs 007, 011, and the current session-level analytical-workspace plan

## Contracts and canonical owner files

- contracts affected: none by default
- canonical owner files: `apps/web-ui/src/**/*`, `packages/domain-contracts/src/schemas.ts`
- planning-only contract notes: not required unless parity reveals a real summary-shape gap

## Data model or boundary changes

Frontend and presentation-model changes come first. Small runtime summary enrichments are allowed only when the product refactor is clearly blocked by missing data rather than composition.

## Implementation steps

1. Recast 013 as an antecedent reference pack while keeping the benchmark as a composition reference surface.
2. Introduce explicit decision presentation mappers in `evaluation-workbench.ts` and refactor the decision workspace top fold first.
3. Follow through on input workspace, comparison/history, and evidence review using the same workspace language.
4. Add targeted tests and validate the refactor incrementally through the local analyst flow.

## Validation strategy

- unit: add or update SSR-safe web tests for decision mappers, dashboard, input deck, and decision-workspace states
- integration: run `pnpm run lint`, `pnpm run test:js`, and `pnpm run build`
- e2e/manual: compare local behavior against the benchmark across dashboard, input deck, decision workspace, comparison/history, and evidence review
- docs/contracts: keep the 013 umbrella aligned with the implemented decision-first slices and follow-through plan

## Critique summary

The benchmark is useful because it raises the density and clarity bar, but the refactor must not stop at styling. The real measure of success is whether the product tells the analyst what to do, how ready the case is, and what still blocks confidence.

## Refined final plan

Treat the benchmark as a composition reference and keep 013 as the historical design record that fed the active successor packs. Preserve METREV's semantics and deterministic logic, and treat any remaining follow-through as successor-pack work instead of reopening 013 as a live umbrella.

## Rollback / safety

If a route-level uplift underperforms, revert the composition or mapper layer for that slice without touching the runtime decision path.
