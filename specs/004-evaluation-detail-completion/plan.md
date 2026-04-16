# Implementation Plan — Evaluation Detail Completion

## Summary

Complete the evaluation detail experience by surfacing all existing read-only decision-output sections plus key audit context from the stored evaluation payload, while preserving the validated auth, API, and persistence flow.

## Source-of-truth files

- `packages/domain-contracts/src/schemas.ts`
- `bioelectro-copilot-contracts/contracts/output_contract.yaml`
- `apps/web-ui/src/components/evaluation-result-view.tsx`
- `apps/web-ui/src/app/globals.css`

## Affected layers and areas

- evaluation detail page presentation in the Next.js app
- workflow artifacts under `specs/`

## Required durable artifacts

- `spec.md`: define the UI-only scope and acceptance criteria
- `plan.md`: keep the change anchored to the contract and current runtime invariants
- `tasks.md`: sequence the UI work and verification steps
- `quickstart.md`: document the manual validation path
- `research.md`: not needed for this UI-only slice
- `contracts/`: not needed because no boundary change is intended

## Research inputs

- `packages/domain-contracts/src/schemas.ts`
- `bioelectro-copilot-contracts/contracts/output_contract.yaml`
- `apps/web-ui/src/components/evaluation-result-view.tsx`

## Contracts and canonical owner files

- contracts affected: none
- canonical owner files: `bioelectro-copilot-contracts/contracts/output_contract.yaml`, `packages/domain-contracts/src/schemas.ts`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No data model, API, auth, or persistence changes are intended. The slice must stay read-only and must consume the existing evaluation payload as-is.

## Implementation steps

1. Compare the current evaluation detail rendering against the shared output contract and list the omitted sections.
2. Refactor the evaluation detail UI into clearer presentation blocks and add rendering for diagnosis findings, impact map, supplier shortlist, and phased roadmap.
3. Add responsive styling, traceability details, and case-history or audit-context improvements, then validate that no backend behavior changed.

## Validation strategy

- unit: no new isolated unit target is required for this presentation-first slice
- integration: run the existing JavaScript tests, lint, and build checks
- e2e/manual: sign in, open an evaluation, verify all added sections and history navigation on the authenticated page
- docs/contracts: confirm no canonical contract files changed

## Critique summary

The main risk is overloading a single page with too much dense information. The implementation should favor clear sectioning and explicit empty states instead of trying to compress everything into one table-heavy layout.

## Refined final plan

Keep the slice strictly UI-first and read-only: surface the full stored decision output with the key stored audit context that already exists in the response, reinforce hierarchy with small presentation helpers and CSS, and leave the core API, Prisma, auth, and contract files untouched.

## Rollback / safety

If the added sections reduce readability or introduce regressions, revert the evaluation detail component and its related CSS only. No schema, API, or persistence rollback should be needed.
