# 017 Full Big Data Workspace Research

## Current Runtime Position

The repository already contains the essential local-first runtime shape required for this feature.

- The evaluation pipeline is already ordered and orchestrated in `apps/api-server/src/services/case-evaluation.ts`.
- Backend-owned workspace payloads already exist in `apps/api-server/src/presenters/workspace-presenters.ts`.
- The current evidence catalog and review gate already exist, but they are small-catalog oriented and not yet claim-centric.
- The UI route topology already covers dashboard, intake, evaluations, comparison, history, evidence review, and printable report surfaces.

## Main Structural Gap

The largest gap is not route coverage. It is the data model and ingestion posture.

- Evidence catalog items are still too JSON-heavy.
- Extracted claims are not yet first-class typed entities.
- Evaluation lineage to external evidence is not explicit enough for large-scale replay and audit.
- Current review flows are too client-heavy for very large corpora.
- Supplier and market data do not yet share a canonical ingestion and review model with literature evidence.

## Design Direction

The refined implementation direction is:

1. make documents, claims, reviews, mappings, suppliers, and usage links first-class
2. add resumable acquisition and wide provenance-aware importers
3. deliver repository-versioned dataset snapshots for reproducible local bootstrap
4. move large-list handling and bulk review semantics to the backend
5. reorganize the UI around the expanded backend-owned payloads

## Constraints To Preserve

- The domain kit remains the semantic authority.
- The contract layer remains the validation and serialization authority.
- The browser is not allowed to invent decision posture, uncertainty framing, defaults, or provenance semantics.
- The runtime must stay local-first and reproducible through committed commands and docs.

## Dataset Posture

The requested first implementation uses two complementary delivery paths.

- A repository-versioned snapshot provides immediate, reproducible local population.
- A resumable backfill pipeline allows the evidence base to keep growing without manual reseeding.

The initial corpus is intentionally broad and should cover:

- BES literature such as MFC, MEC, MES, wastewater and correlated systems
- adjacent materials and process literature
- patents and structured technical disclosures
- supplier and product technical documentation
- market and industry artifacts
- curated internal evidence where provenance and review status are explicit

## Validation Implication

Because this change crosses storage, contracts, ingestion, presenters, and UI, validation must remain multi-layered.

- Python contract checks guard boundary drift.
- runtime tests guard normalization, orchestration, and presenter behavior.
- Postgres tests guard persistence, bootstrap, and dedupe.
- end-to-end tests guard the full analyst flow against the seeded corpus.
