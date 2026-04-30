# Planning Contract — Research Data And Metadata Boundary

This note is planning-only and non-authoritative.

Canonical owners:

- Semantic owner: `bioelectrochem_agent_kit/domain/ontology/research-taxonomy.yml`
- Metadata semantic owner: `bioelectrochem_agent_kit/domain/ontology/metadata-taxonomy.yml`
- Hardened boundary owner: `bioelectro-copilot-contracts/contracts/research/`
- Runtime schema owners: `packages/domain-contracts/src/schemas.ts` and `packages/domain-contracts/src/research-schemas.ts`

Current state: canonical change required and promoted in this implementation slice.

Boundary rule:

- Source artifacts remain the canonical local-ingestion surface for file hash, extraction method, page or chunk locators, metadata quality, and veracity scoring.
- Research extraction may add a first-class data and metadata readiness answer, but it must remain evidence-traced and missing-field explicit.
- Evidence packs may summarize metadata/data readiness for downstream use, but they must not hide whether the source is context-heavy, methodology-oriented, or weak as validated performance evidence.
- Decision-ingestion preview may carry assumptions and missing data derived from metadata readiness, but accepted review state still gates downstream trust.
