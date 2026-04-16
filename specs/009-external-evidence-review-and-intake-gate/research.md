# Research Notes — External Evidence Review And Intake Gate

## Goal

Find the smallest safe path that turns the additive external-evidence catalog into an analyst-reviewed evidence source for case evaluations without auto-attaching unreviewed material.

## Questions

- What is the safest first gate between imported catalog records and the evaluation flow?
- Which existing runtime surfaces can be reused so the feature stays additive and reversible?

## Inputs consulted

- repo files: `packages/database/prisma/schema.prisma`, `packages/database/src/index.ts`, `apps/api-server/src/routes/cases.ts`, `apps/web-ui/src/lib/case-intake.ts`, `apps/web-ui/src/components/case-form.tsx`
- existing ingestion scripts: `packages/database/scripts/ingest-openalex-literature.mjs`, `packages/database/scripts/ingest-crossref-literature.mjs`
- existing workflow artifacts for the ingestion foundation and analyst cockpit slices

## Findings

- The additive catalog persistence already exists, but the runtime has no repository method, route, or authenticated UI surface for those records.
- The safest first gate is explicit analyst review plus explicit analyst selection during intake, not automatic matching based on objective, title, or tags.
- The existing intake helper can absorb accepted catalog evidence by mapping it into the current `evidence_records` array, which avoids API boundary churn in the evaluation route.
- Review actions can be made auditable through the existing `AuditEvent` table without adding a new table in this slice.

## Decisions

- Implement catalog browsing for viewers and review mutation for analysts.
- Keep catalog inclusion in evaluations manual and explicit through intake selection.
- Reuse the current custom CSS and dashboard hierarchy instead of introducing a charting or component library in this slice.

## Open blockers

- Authenticated browser automation is still not available in this session, so final visual confirmation remains manual follow-through.

## Impact on plan

- The runtime contracts need a typed catalog list, detail, and review surface.
- The intake helper must merge accepted catalog evidence without weakening existing manual or preset evidence behavior.
- Live ingestion follow-through is complete for OpenAlex, so the remaining follow-through is limited to manual authenticated browser confirmation.
