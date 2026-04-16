# Implementation Plan — External Evidence Ingestion Foundation

## Summary

Add additive catalog models for external source records, reviewed catalog evidence, and ingestion runs; then provide two literature-focused import commands for OpenAlex and Crossref so automatic evidence intake can start without contaminating current case-level decision evidence.

## Source-of-truth files

- `packages/database/prisma/schema.prisma`
- `packages/database/package.json`
- `package.json`
- `packages/database/prisma/migrations/20260414175025/migration.sql`
- `packages/database/scripts/load-workspace-env.mjs`
- `packages/database/scripts/external-ingestion-shared.mjs`
- `packages/database/scripts/ingest-openalex-literature.mjs`
- `packages/database/scripts/ingest-crossref-literature.mjs`
- `tests/runtime/external-ingestion-shared.test.ts`

## Affected layers and areas

- additive Prisma persistence models
- database package ingestion scripts
- workflow artifacts under `specs/`

## Required durable artifacts

- `spec.md`: define the safe ingestion boundary and non-goals
- `plan.md`: anchor the new catalog to the current runtime invariants
- `tasks.md`: sequence schema, script, and validation work
- `quickstart.md`: document how to run the first live ingestion commands
- `research.md`: required because source selection and provenance posture are external-doc-sensitive
- `contracts/`: not required for this first internal foundation pass

## Research inputs

- OpenAlex developer docs
- Crossref REST API docs
- current Prisma schema and case-centric evidence persistence

## Contracts and canonical owner files

- contracts affected: none intentionally exposed beyond internal storage in this pass
- canonical owner files: `packages/database/prisma/schema.prisma`, future promotion target `bioelectro-copilot-contracts/contracts/` if catalog structures become public contract surfaces
- planning-only notes under `specs/<feature>/contracts/`: not needed for the current additive internal pass

## Data model or boundary changes

This slice adds new internal database tables but does not change the current evaluation response, case history response, or authenticated analyst workflow.

## Implementation steps

1. Add additive Prisma models for external source records, catalog evidence items, and ingestion runs.
2. Add shared normalization helpers for OpenAlex and Crossref literature metadata.
3. Add manual-script ingestion commands that fetch metadata, upsert catalog records, and track run status without touching active case evaluation flows.

## Validation strategy

- unit: cover normalization helpers for OpenAlex and Crossref metadata
- integration: run lint, JavaScript tests, build, Prisma generate, and schema migration validation
- e2e/manual: run one import command against a small query and inspect the stored catalog tables
- docs/contracts: confirm the active evaluation APIs remain unchanged

## Critique summary

The main risk is implementing “automatic ingestion” too broadly and turning the database into an opaque dump. The foundation should be literature-first, metadata-first, and review-first.

## Refined final plan

Keep the catalog additive and internal, deliver the first live source adapters for literature metadata only, and defer supplier and market adapters until identity, freshness, and review semantics are stronger.

## Rollback / safety

If the foundation proves unstable, revert the new schema models and ingestion scripts only. The core runtime should remain unaffected because the evaluation flow does not depend on the new catalog tables.
