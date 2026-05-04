# Implementation Plan - Canonical Evidence Full-Text Hardening

## Summary

Continue the canonical evidence work by turning `needs_full_text` into a real, policy-aware hydration path and by adding an Ollama-only schema-validated supplement path that never bypasses deterministic validation or provenance checks. Keep the current dashboard, explorer, and case-evaluation contracts stable unless the implementation reveals a concrete operator need.

## Source-of-truth files

- `packages/database/prisma/migrations/20260504120000_canonical_evidence_decision_layer/migration.sql`
- `packages/database/scripts/canonicalize-scientific-evidence.ts`
- `packages/database/scripts/canonical-scientific-evidence.mjs`
- `packages/database/scripts/refresh-evidence-benchmarks.ts`
- `packages/database/src/source-artifacts.ts`
- `packages/research-intelligence/src/fulltext/source-content.ts`
- `packages/llm-adapter/src/index.ts`

## Affected layers and areas

- Database migration validation and benchmark refresh filtering.
- Canonicalization CLI configuration, hydration orchestration, persistence policy, and audit payloads.
- LLM adapter boundary for schema-validated candidate extraction.
- Focused tests and runtime docs.

## Required durable artifacts

- `spec.md`: records scope, requirements, and acceptance criteria for hydrate plus LLM hardening.
- `plan.md`: records the implementation sequence and safety boundaries.
- `tasks.md`: tracks delivery and validation state.
- `quickstart.md`: records reproducible operator commands.
- `research.md`: records the repo audit and first validated findings.
- `contracts/`: not needed initially; use only if public API or persistence boundary changes require explicit design review.

## Research inputs

- `specs/031-production-scale-evidence-ingestion/`
- `adr/0005-research-worker-and-runtime-extraction.md`
- Existing canonicalization, full-text, and runtime-extractor implementations.

## Contracts and canonical owner files

- contracts affected: none confirmed yet beyond current runtime summary contracts.
- canonical owner files: `packages/domain-contracts/src/schemas.ts` only if new operator-visible counters become necessary.
- planning-only notes under `specs/<feature>/contracts/`: not created yet.

## Data model or boundary changes

- No schema change is planned for the first hydrate slice beyond the already-added canonical evidence migration.
- Hydrated text should reuse `SourceArtifactRecord` and `SourceTextChunkRecord` when persistence is allowed.
- Audit payloads and run summaries may record hydration and LLM counters without expanding the database schema unless operational querying clearly requires first-class columns.

## Implementation steps

1. Validate and harden the canonical evidence migration.
2. Add the feature pack and current research snapshot.
3. Add a reusable full-text hydration policy and persistence helper for accepted evidence records.
4. Extend canonicalization CLI/config to support `--full-text=hydrate` and bounded concurrency.
5. Re-run deterministic extraction on hydrated allowed text and persist resulting canonical facts safely.
6. Add Ollama-only schema-validated measurement and qualitative candidate extraction with exact evidence-span checks and whitelist gating.
7. Tighten benchmark refresh filtering and add focused regression tests.
8. Update README and quickstart commands, then run focused verification.

## Validation strategy

- unit: hydrate policy helpers, LLM span validation, canonical extractor behavior, benchmark refresh filtering.
- integration: canonicalization batch persistence with hydrated chunks and benchmark rows.
- e2e/manual: `pnpm run db:migrate:deploy`, focused `evidence:canonicalize` dry runs, `evidence:benchmark:refresh`, and `evidence:quality-report`.
- docs/contracts: README and this spec pack kept aligned with actual commands and validated behavior.

## Critique summary

The main implementation risk is mistaking more extracted text for more trustworthy evidence. The refined plan keeps deterministic extraction as the first pass, treats hydration as a provenance extension rather than an evidence shortcut, and allows LLM output only when it survives schema and exact-span validation.

## Refined final plan

Ship the work in slices that each end with executable validation: migration hardening, hydrate pipeline, LLM supplement, focused tests, and docs. Avoid widening into new public API contracts unless a validation step shows that operators need new exposed counters to understand hydration outcomes.

## Rollback / safety

- The migration slice is already additive and validated.
- If hydrate persistence misbehaves, disable `--full-text=hydrate` and fall back to `existing` while keeping previously persisted artifacts and audit rows intact.
- If Ollama validation is unstable, keep `--llm-mode=disabled` as the default supported path.
