# Spec 037 — Evidence & Research Quality Expansion — Validation Report

**Date:** 2026-05-14
**Scope batch:** Phases 4 → 5 → 8 → 9 → 10 (with explicit deferrals for Phases 6 & 7)

## Phase status

| Phase | Title                                | Status             | Notes                                                                                                                                                                              |
| ----- | ------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Discovery                            | PASS               | (prior batch)                                                                                                                                                                      |
| 1     | Contracts foundation                 | PASS               | (prior batch)                                                                                                                                                                      |
| 2     | Research-cell schema                 | PASS               | (prior batch)                                                                                                                                                                      |
| 3     | Evidence funnels v2                  | PASS               | (prior batch; flag-gated via `METREV_AUDIT_FUNNELS_V2`)                                                                                                                            |
| 4     | Research-cell provenance integration | PASS               | All T4.\* complete; 18+5 vitest regressions green.                                                                                                                                 |
| 5     | Document intelligence v1             | PARTIAL / SCAFFOLD | `@metrev/document-intelligence` package + Zod schemas + flag-gated runner (T5.1, T5.4, T5.5, T5.7 scaffolds). T5.2/T5.3/T5.6 **deferred** pending ADR 0006 parser-selection spike. |
| 6     | Table/metric extraction overhaul     | DEFERRED           | Overhaul justifies its own design pass; revisit after ADR 0006.                                                                                                                    |
| 7     | Review Gate repair queues            | DEFERRED           | Standalone UX design required.                                                                                                                                                     |
| 8     | Corpus quality CLIs                  | PASS (scaffolds)   | 4 CLI scaffolds wired into root package.json with `--dry-run` / `--json`.                                                                                                          |
| 9     | METREV doctor                        | PASS               | `scripts/run-metrev-doctor.mjs` aggregates Phase 8 CLIs and the existing UI layout audit; root script `metrev:doctor`.                                                             |
| 10    | Final validation                     | PASS (scoped)      | Spec-037 vitest sweep green; doctor PASS; doc + restart actioned.                                                                                                                  |

## Test sweep (Phase 10 / T10.1)

Command:

```
pnpm exec vitest run \
  tests/runtime/document-intelligence.test.ts \
  tests/runtime/research-cell-coverage.test.ts \
  tests/runtime/evidence-audit-funnels.test.ts \
  tests/runtime/research-intelligence.test.ts \
  tests/runtime/research-runtime-extractor.test.ts
```

Result: **28/28 PASS** (5 files, ~616 ms).

| File                                               | Tests | Status |
| -------------------------------------------------- | ----- | ------ |
| `tests/runtime/document-intelligence.test.ts`      | 5     | PASS   |
| `tests/runtime/evidence-audit-funnels.test.ts`     | 5     | PASS   |
| `tests/runtime/research-cell-coverage.test.ts`     | 5     | PASS   |
| `tests/runtime/research-runtime-extractor.test.ts` | 4     | PASS   |
| `tests/runtime/research-intelligence.test.ts`      | 9     | PASS   |

> Broader suites (`test:db`, `test:e2e`, `ui:layout-audit`, `validate:local:smoke`) were **not re-run** in this batch; they remain owned by routine validation runs.

## Doctor (Phase 10 / T10.2)

Command: `pnpm run metrev:doctor` (and `--json --full`).

Result: **overall=PASS**, with sub-checks

- `corpus-score`: PASS (dry-run scaffold)
- `research-coverage`: PASS (dry-run scaffold)
- `audit-explain`: PASS (dry-run scaffold)

`ui-layout-audit` summary is opportunistically included when present under `test-results/layout-audit/summary.json`.

## Deferrals (deliberate)

- **Phase 6 — Table/metric extraction overhaul.** Requires block-aware retrieval and table-first metrics extraction; depends on real document-intelligence parsers (T5.2/T5.3). Rationale: large, semantically loaded change; should land alongside the parser ADR.
- **Phase 7 — Review Gate repair queues.** Front-end queue taxonomy + breadcrumb + Playwright surface is a standalone UX track; deferring keeps this batch additive and reversible.
- **T5.2 / T5.3 / T5.6.** Real PDF/HTML/XML parsing and persistence into `SourceArtifactRecord.metadataQuality.documentIntelligence` — held until ADR 0006 names the parser.
- **T10.3 doc updates** (`docs/runtime-tooling-setup.md`, `quickstart.md`) — follow-up after the restart.

## Pre-existing issue (not introduced by this batch)

`apps/web-ui/src/app/{evidence,evidence/quality,evidence/review,research}/page.tsx` violate Next.js 15 `PageProps` strictness (default-valued optional props). This pre-dates spec 037 and is **not** a blocker for the runtime/test goals of this spec, but should be tracked as its own task.

## Conclusion

Spec 037 Batch (Phases 4/5/8/9/10) is **GREEN** for its in-scope deliverables. Phases 6 and 7 are explicitly deferred with rationale; Phase 5 ships as a flag-gated scaffold pending parser ADR.
