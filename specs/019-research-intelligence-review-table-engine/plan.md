# Implementation Plan - Research Intelligence Review Table Engine

## Summary

Extend the existing evidence warehouse with review-table persistence and a deterministic extraction engine. Keep source metadata anchored to `ExternalSourceRecord`, use Zod contracts for every API payload, and adapt reviewed packs into the existing decision evidence shape.

## Source-Of-Truth Files

- `bioelectrochem_agent_kit/domain/ontology/research-taxonomy.yml`
- `bioelectrochem_agent_kit/domain/rules/research-metric-normalization.yml`
- `bioelectro-copilot-contracts/contracts/research/`
- `packages/domain-contracts/src/research-schemas.ts`
- `packages/research-intelligence/src/`
- `packages/database/prisma/schema.prisma`
- `apps/api-server/src/routes/research.ts`
- `apps/web-ui/src/components/research/`

## Implementation Steps

1. Add domain and contract files for research reviews, columns, extraction results, and evidence packs.
2. Add a shared package for default columns, deterministic extraction, metric normalization, evidence-pack building, and decision-ingestion adaptation.
3. Add Prisma models and repository methods for review tables and extraction state.
4. Expose authenticated API routes under `/api/research`.
5. Add research review list/detail UI and navigation.
6. Add deterministic fixture-based tests plus Postgres and UI coverage.

## Validation

- `pnpm run test:python`
- `pnpm run test:js`
- `pnpm run test:db`
- `pnpm run build`

## Risk Control

The MVP does not trust LLM output. It stores deterministic extraction results only after schema validation and keeps invalid outputs auditable.
