# Implementation Plan — METREV Data Metadata Intelligence

## Summary

Anchor the change in a new METREV-owned feature pack, delete the old
external-program seed and feature pack, distill valid data/metadata concepts
from the three local PDFs without storing them in source control, and
promote those concepts into domain semantics, contracts, local-source
ingestion, deterministic extraction, evidence-pack propagation, and
regression tests.

## Source-of-truth files

- `bioelectrochem_agent_kit/domain/ontology/research-taxonomy.yml`
- `bioelectrochem_agent_kit/domain/ontology/metadata-taxonomy.yml`
- `bioelectro-copilot-contracts/contracts/research/metadata-quality.schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/evidence-veracity.schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/source-artifact.schema.yaml`
- `packages/domain-contracts/src/schemas.ts`
- `packages/domain-contracts/src/research-schemas.ts`
- `packages/database/src/source-artifacts.ts`
- `packages/research-intelligence/src/columns/column-registry.ts`
- `packages/research-intelligence/src/extraction/deterministic-extractor.ts`

## Affected layers and areas

- domain taxonomy and rules
- research contract boundary and runtime schemas
- local-source ingestion and evidence scoring
- deterministic review-table extraction and evidence-pack propagation
- research UI copy and regression coverage

## Required durable artifacts

- `spec.md`: define the owned scope and acceptance criteria
- `plan.md`: sequence removal, semantic replacement, runtime changes, and validation
- `tasks.md`: track implementation and verification workstreams
- `quickstart.md`: document how to validate the new METREV-owned flow
- `research.md`: store distilled findings from temporary PDF extraction and repo inspection
- `contracts/`: capture the planning-only boundary for metadata/data readiness

## Research inputs

- local PDFs referenced by the previous metadata flow when available on disk
- current metadata and veracity semantics already present in the domain and contracts
- current local-source ingestion and research extraction runtime behavior

## Contracts and canonical owner files

- contracts affected: `contracts/research/metadata-quality.schema.yaml`, `contracts/research/evidence-veracity.schema.yaml`, `contracts/research/source-artifact.schema.yaml`, and any research extraction contract that gains a first-class readiness answer
- canonical owner files: `bioelectrochem_agent_kit/domain/ontology/research-taxonomy.yml`, `bioelectrochem_agent_kit/domain/ontology/metadata-taxonomy.yml`, `bioelectro-copilot-contracts/contracts/research/`
- planning-only notes under `specs/<feature>/contracts/`: `contracts/research-data-metadata-boundary.md`

## Data model or boundary changes

The existing local-source and research-review model is kept. The change
is semantic and behavioral: generic context/reference source handling,
expanded metadata categories, possible addition of a first-class research
column and answer structure for data/metadata readiness, and updated
evidence-pack propagation.

## Implementation steps

1. Create the `028` feature pack and use temporary PDF extraction to distill implementation rules without storing article text.
2. Remove the old `022` feature pack, the legacy manifest, the legacy seed script, and the package script wiring.
3. Replace external project language in domain semantics with METREV-owned research and metadata readiness vocabulary.
4. Align contracts and runtime Zod schemas to the new metadata/data readiness behavior.
5. Update local-source metadata quality and veracity scoring to use generic context/reference penalties and richer metadata categories.
6. Add deterministic review-table extraction for data and metadata readiness and propagate it into evidence packs and decision-ingestion preview.
7. Clean the UI defaults and add regression coverage for both behavior and forbidden source labels.
8. Run focused validation first, then broader lint/build/test checks.

## Validation strategy

- unit: focused Vitest coverage for source-artifact scoring and research extraction
- integration: research API/worker tests if schema propagation changes
- e2e/manual: local-source import and research review UI sanity if needed after focused checks
- docs/contracts: Python contract checks and grep-based forbidden-token regression

## Critique summary

The main risk is turning article lessons into more repository documents
instead of product behavior. The implementation therefore keeps the PDFs
outside the repo, stores only distilled rules in this feature pack, and
pushes the useful concepts into domain, contracts, runtime code, and tests.

## Refined final plan

Keep the change narrow and layered: remove the old label and seed, make the
metadata/data semantics product-native, add one explicit review-table slice
for readiness, and verify with focused tests before broader validation.

## Rollback / safety

If the new readiness extraction or scoring proves unstable, keep the old
generic local-source import path working, back out only the new extraction
surface, and preserve the seed removal plus generic terminology cleanup.
