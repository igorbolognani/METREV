# Contract Note - Research Document Ingestion

## Status

Active planning note. Runtime implementation already spans document metadata, eligibility, full-text hydration, source artifacts, extraction parameters, and quality gates, but the full `034` operational closeout still needs real warehouse execution evidence and large-review browser validation.

## Purpose

Record the bridge between the current runtime research-ingestion path and the canonical owner files that govern document typing, traceability, admissibility, and decision-ready evidence.

## Current runtime owners

- `packages/domain-contracts/src/research-schemas.ts`
- `packages/database/src/research-repository.ts`
- `packages/database/scripts/canonicalize-scientific-evidence.ts`
- `apps/api-server/src/routes/research.ts`
- `packages/research-intelligence/src/fulltext/source-content.ts`
- `packages/research-intelligence/src/extraction/deterministic-extractor.ts`

## Canonical owner files

- `bioelectrochem_agent_kit/domain/ontology/research-taxonomy.yml`
- `bioelectrochem_agent_kit/domain/ontology/evidence-schema.yml`
- `bioelectro-copilot-contracts/contracts/research/paper.schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/extraction-result.schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/source-artifact.schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/evidence-pack.schema.yaml`
- `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`

## Current runtime contract intent

- Research documents remain typed source documents rather than a paper-only vocabulary.
- Eligibility is non-destructive: excluded sources remain visible for audit with reason buckets.
- Active research-review surfaces admit only strict MFC, MEC, or MET sources with full-access, traceable full-text posture.
- `decisionReady` evidence still depends on traceable locators, source hashes, admissible access/license posture, accepted/reviewed status where relevant, and quality gates before benchmark or `EvidenceDecisionContext` use.

## Current implementation note

This feature batch closes a reporting gap in the runtime path: whole-warehouse eligibility counts are now computed from the full linked warehouse under analysis, while `limit` controls only the bounded `items` sample returned to callers.

## Remaining promotion questions

- Whether runtime/source-artifact storage remains sufficient for large-review validation or whether a dedicated persisted document-block table becomes necessary after real 25/100-paper runs.
- Whether additional owner-file language is needed once the full local-warehouse execution evidence is recorded in this feature pack.
