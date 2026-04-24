# Planning Contract - Research Review Boundary

This note is planning-only and non-authoritative.

Canonical owners:

- Semantic owner: `bioelectrochem_agent_kit/domain/ontology/research-taxonomy.yml`
- Metric normalization owner: `bioelectrochem_agent_kit/domain/rules/research-metric-normalization.yml`
- Hardened boundary owner: `bioelectro-copilot-contracts/contracts/research/`
- Runtime schemas: `packages/domain-contracts/src/research-schemas.ts`

Current state: canonical change required and promoted in this implementation slice.

Boundary rule:

- Review papers reference existing source documents.
- Review columns define extraction contracts.
- Extraction results are cell-level validated outputs.
- Evidence packs are review-level curated bundles.
- Decision ingestion adapts evidence packs into existing typed evidence records without coupling the research UI to decision-engine internals.
