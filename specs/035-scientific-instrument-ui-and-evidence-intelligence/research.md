# Research Notes - Scientific Instrument UI and Evidence Intelligence

## Goal

Ground the implementation in the current repository shape and the attached design reference before changing runtime code.

## Questions

- Which existing evidence and research surfaces should be reused rather than replaced?
- How should the UI become more professional without breaking METREV's domain and contract authority model?
- What database additions make evidence readiness queryable and auditable?

## Inputs consulted

- docs: `AGENTS.md`, `.github/copilot-instructions.md`, `docs/repository-authority-map.md`, `docs/internal-feature-workflow.md`.
- repo files: `apps/web-ui/`, `apps/api-server/`, `apps/research-worker/`, `packages/database/`, `packages/domain-contracts/`, `tests/`.
- design reference: attached `claude_design_skill.md`, used as an aesthetic and craft reference only.
- experiments: read-only codebase exploration of frontend and backend surfaces.

## Findings

- The frontend already has useful domain surfaces, but the IA is split across `/dashboard`, `/cases/new`, `/evaluations`, `/reports`, and `/admin/intelligence/...` routes.
- Navigation is centralized in `apps/web-ui/src/lib/navigation.ts`, with related behavior in the sidebar, breadcrumbs, and command palette.
- The database already has strong evidence infrastructure: source records, artifacts, text chunks, catalog items, scientific facts, benchmark records, benchmark aggregates, canonicalization runs, ingestion runs, and research reviews.
- `packages/database/scripts/evidence-quality-report.ts` already computes useful quality counts and should be promoted into reusable audit logic.
- `SourceArtifactRecord` and `SourceTextChunkRecord` can represent usable full text even when `pdfUrl` and `xmlUrl` are missing.
- The current worker drains research backfills and extraction jobs; discovery/acquisition should extend that loop, not create a separate unmanaged process.
- The attached design skill supports a bold, intentional UI direction. For METREV, the correct direction is a scientific instrument workspace: dense, precise, dark-first or high-contrast, signal-led, and grounded in BES concepts.

## Decisions

- Implement one integrated feature pack, not separate UI and backend features.
- Preserve existing evidence admissibility gates and rule-engine scoring weights.
- Use additive database models for audit/discovery/acquisition state.
- Reuse existing research search/stage flows for discovery.
- Preserve route compatibility while presenting the new top-level IA.
- Keep UI copy and labels traceable to domain and contract vocabulary.

## Open blockers

- Full validation may require a running local Postgres/Docker environment.
- External acquisition provider tests must use mocks or disabled-network modes to remain deterministic.
- The final local-view restart depends on Docker availability.

## Impact on plan

- The design-system workstream must include component-level accessibility and visual consistency checks.
- The discovery workstream must avoid assuming missing URL fields always mean missing full text.
- The UI workstream must update tests that encode current route labels.
- The database workstream must extract existing evidence quality report behavior instead of creating a competing implementation.
