# Implementation Plan - Evidence Readiness Cleanup

## Summary

Implement this feature in four gates: establish durable artifacts, canonicalize route exposure and stale UI entry points, enrich the evidence detail and readiness data model, then curate/reprocess the corpus and validate the running local-view app against the same pages that surfaced the issue.

## Source-of-truth files

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `docs/repository-authority-map.md`
- `bioelectrochem_agent_kit/domain/rules/evidence-discovery-targets.yml`
- `bioelectro-copilot-contracts/contracts/rules/evidence_discovery.yaml`
- `packages/domain-contracts/src/schemas.ts`
- `packages/database/src/index.ts`
- `packages/database/src/research-repository.ts`
- `packages/database/src/source-artifacts.ts`
- `packages/evidence-discovery/src/fulltext-resolver.ts`
- `packages/research-intelligence/src/fulltext/source-content.ts`
- `apps/api-server/src/routes/external-evidence.ts`
- `apps/web-ui/src/lib/navigation.ts`

## Affected layers and areas

- Web route aliases, navigation, and admin entry points.
- Evidence detail API/contract and UI rendering.
- Readiness diagnostics and evidence curation scripts.
- Full-text acquisition policy enforcement.
- Research review creation, extraction, and table rendering.

## Required durable artifacts

- `spec.md`: scope, requirements, and acceptance criteria.
- `plan.md`: ordered implementation gates and safety notes.
- `tasks.md`: execution checklist.
- `quickstart.md`: setup and validation flow for the curated runtime.
- `research.md`: current repo findings and policy guardrails.

## Research inputs

- Current evidence detail only exposes claims and extracted claims, not canonical facts or benchmark records.
- Current admin UI still advertises duplicate top-level Evidence and Research routes.
- Current quality-report counts show a gap between accepted records and records with canonical extracted facts.
- Current repo policy supports open-access and local artifact acquisition, not paywall bypass.

## Contracts and canonical owner files

- contracts affected: `packages/domain-contracts/src/schemas.ts` and any related browser exports.
- canonical owner files: `bioelectrochem_agent_kit/domain/rules/evidence-discovery-targets.yml` and `bioelectro-copilot-contracts/contracts/rules/evidence_discovery.yaml`.
- planning-only notes under `specs/036-evidence-readiness-cleanup/` are sufficient for this slice unless a new persistent boundary is introduced.

## Data model or boundary changes

- Extend external evidence detail responses with canonical facts, benchmark records, source-text status, and readiness summary.
- Add a readiness-report script or equivalent repository-backed diagnostic without inventing a second evidence vocabulary.
- Reuse existing evidence audit, acquisition attempt, source artifact, and research extraction tables before adding new persistence.

## Implementation steps

1. Create the durable feature-pack docs and capture the lawful-acquisition boundary.
2. Canonicalize active Evidence/Research routes and remove stale route exposure from navigation, command palette, and admin cards.
3. Add admin evidence-quality route parity and redirect old top-level pages to the canonical admin routes.
4. Remove dead research backfill client exports that are no longer consumed by the UI.
5. Extend evidence detail API/contract/UI to expose canonical facts, benchmarks, and source-text readiness.
6. Add a readiness audit/report for accepted evidence, then use it to curate and prune the corpus.
7. Reacquire or import lawful full text for good candidates, rerun canonicalization and research extraction, and refresh benchmark aggregates.
8. Update research table rendering so extracted values, units, traces, and missing-field reasons are visible.
9. Validate with focused tests, Postgres checks, and Docker local-view smoke plus manual browser verification.

## Validation strategy

- unit: navigation helpers, auth-routing helpers, API client helpers, evidence detail rendering.
- integration: external evidence detail API, research repository readiness gating, source artifact ingestion, canonicalization runtime.
- e2e/manual: admin intelligence evidence/research routes, screenshot example pages, local-view smoke.
- docs/contracts: spec pack consistency and contract/API alignment.

## Critique summary

The original request bundled UI cleanup, evidence detail gaps, corpus quality, and unlawful acquisition ideas into one problem statement. The workable implementation path must separate stale-route cleanup from data-readiness work and explicitly replace the Sci-Hub proposal with the repo’s lawful OA/local-artifact policy.

## Refined final plan

Ship the feature in visible gates. First remove stale route exposure and dead client paths so the UI reflects the intended IA. Then enrich the evidence detail boundary and readiness diagnostics. Only after those are in place should the corpus be pruned and reprocessed, because the readiness report needs to drive the destructive decisions.

## Current refinement result

- Strict table readiness is now a technical completeness gate, not a synonym for accepted review state.
- `research:hard-prune --table-ready-only` uses the strict scorer before any destructive cleanup.
- `evidence:readiness-report` exports article-level actions and missing requirements for accepted evidence.
- `evidence:expand-table-ready-corpus` provides the lawful OA/local expansion campaign entrypoint; dry-run is the default.
- The hydrate gate now attempts lawful full-text materialization when source chunks are absent, even if metadata-only extraction already found canonical facts.
- The local-view corpus was expanded to 2,000 accepted records, hydrated/canonicalized, then strict-pruned after backups and dry-runs.
- The current final local-view corpus is 39 accepted records and 39 strict table-ready records, backed by source artifacts, chunks, scientific facts, benchmark rows, and a clean 39-paper research review.
- The remaining growth gap is scale, not structural readiness: a larger training corpus should continue the same lawful expansion loop with higher targets and source-provider retry handling.

## Rollback / safety

- Keep old web routes as redirects rather than deleting them outright.
- Keep new detail fields additive so existing consumers do not break.
- Run destructive curation only after a dry-run readiness report and audit export.
- Keep all full-text acquisition bounded by the existing legal/access policy.
