# Implementation Plan - Full-Text Research Intelligence

## Summary

This feature closes the operational gap between the already-landed research-intelligence slices and the full `034` outcome. The implementation starts from the current local warehouse baseline rather than from a new ingestion campaign, formalizes the feature in `specs/034...`, fixes whole-warehouse eligibility aggregation, supports an explicit local hard-delete path for non-eligible/non-real research rows, drives the canonical evidence and benchmark path through the existing scripts, and adds the missing large-review validation for the internal/admin research UI.

## Source-of-truth files

- `bioelectrochem_agent_kit/domain/ontology/research-taxonomy.yml`
- `bioelectrochem_agent_kit/domain/ontology/evidence-schema.yml`
- `bioelectro-copilot-contracts/contracts/research/paper.schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/extraction-result.schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/source-artifact.schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/evidence-pack.schema.yaml`
- `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`
- `packages/domain-contracts/src/research-schemas.ts`
- `packages/database/src/research-repository.ts`
- `packages/database/scripts/canonicalize-scientific-evidence.ts`
- `apps/api-server/src/routes/research.ts`
- `apps/web-ui/src/components/research/research-review-list.tsx`
- `apps/web-ui/src/components/research/research-review-detail.tsx`

## Affected layers and areas

- Warehouse eligibility aggregation, explicit local hard-delete pruning, and active-surface filtering.
- Canonical evidence, benchmark refresh, and quality-report execution over the existing local warehouse.
- Internal/admin research-review creation and large-review browser validation.
- Durable feature-pack documentation and execution notes.

## Required durable artifacts

- `spec.md`: records scope, acceptance criteria, and cleanup boundaries.
- `plan.md`: records execution order, source-of-truth files, safety rules, and validation strategy.
- `tasks.md`: tracks started versus remaining workstreams.
- `quickstart.md`: records the executable local path for warehouse audit, canonicalization, and browser validation.
- `research.md`: records validated findings, blockers, and the effect of the current implementation slices.
- `contracts/`: records the planning note that bridges runtime ingestion/hydration behavior and canonical owner-file expectations.

## Research inputs

- `README.md`
- `docs/repository-authority-map.md`
- `docs/runtime-tooling-setup.md`
- `specs/032-canonical-evidence-fulltext-hardening/`
- `specs/033-ui-api-database-rule-engine-refactor/`
- `/memories/session/plan.md`

## Contracts and canonical owner files

- contracts affected: research document metadata, extraction answers, source artifact traceability, eligibility status/reasons, evidence-pack extensions, and evidence decision context admissibility.
- canonical owner files: domain ontology and hardened contract files listed above.
- planning-only notes under `specs/<feature>/contracts/`: `contracts/research-document-ingestion.md`

## Data model or boundary changes

The default warehouse model remains auditable through eligibility state, but this task added an explicit local-only hard-delete path for the user's requested cleanup of the local research database. The script is guarded by `assertLocalEvaluationResetAllowed`, and the root command now targets the local Docker PostgreSQL URL by default so ambient remote `.env` values cannot be pruned accidentally. The current batch also changes the eligibility boundary semantics so whole-warehouse counters are computed over the full linked warehouse while the returned `items` list remains a bounded sample controlled by `limit`.

## Implementation steps

1. Create the durable `034` feature pack and record the baseline counts, local execution path, and cleanup policy.
2. Baseline the live local warehouse counts and compare them against the expected prompt snapshot.
3. Use the current eligibility routes and repository logic to audit the full linked warehouse, not just a limited sample.
4. Execute the explicit local hard-prune when requested, preserving dry-run counts before deletion and creating a clean extracted review from retained records.
5. Run canonicalization with full-text hydration over manageable, resumable slices of the eligible warehouse.
6. Refresh benchmark aggregates and generate a quality report from the resulting decision-ready facts.
7. Extend internal/admin browser validation for research reviews at 25-paper and 100-paper scales.
8. Finish with the full repo and local-runtime validation path and record PASS/FAIL outcomes in the feature pack.

## Validation strategy

- unit: `tests/runtime/research-api.test.ts`, `tests/runtime/research-runtime-extractor.test.ts`, `tests/runtime/research-intelligence.test.ts`, `tests/runtime/bootstrap-bigdata.test.ts`
- integration: `pnpm run test:db`, canonicalization, benchmark refresh, quality report, and research API/browser flows against the local runtime
- e2e/manual: internal/admin research-review browser validation for 25 and 100 papers via warehouse/backfill/preset paths
- docs/contracts: this feature pack and any owner-file promotions required by follow-on slices

## Critique summary

The main risk is claiming warehouse-scale completion while still measuring only a sample or still relying on live search paths that never produce a 25/100-paper review. Another risk is turning cleanup into destructive deletion on the wrong database. The plan therefore starts with the warehouse eligibility boundary, keeps remote deletion blocked by a localhost guard, and forces large-review validation through the warehouse/backfill path instead of the capped search UI.

## Refined final plan

Close `034` in vertical slices that end in executable validation. The first slice makes eligibility counts whole-warehouse accurate and formalizes the feature pack. The next slices execute and document the real warehouse pipeline, then close the admin/browser validation gap for large research reviews, and finally run the full validation stack.

## Rollback / safety

- The eligibility aggregation change is additive and non-destructive by itself: it changes reporting accuracy without deleting data.
- The hard-prune script is intentionally destructive only for local Docker/PostgreSQL targets allowed by the local evaluation reset guard. Dry-run must be inspected before `--execute`.
- If full warehouse canonicalization proves too heavy for one run, execution stays resumable through bounded batches and documented checkpoints.
- If browser validation exposes UI performance issues at 25/100 papers, the warehouse and canonical evidence pipeline remain intact and the rollback surface is limited to UI validation helpers or incremental rendering strategies.
