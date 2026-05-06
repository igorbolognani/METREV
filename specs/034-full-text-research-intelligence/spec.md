# Feature Specification - Full-Text Research Intelligence

## Objective

Close the remaining full-text research-intelligence scope by promoting `034` into a durable feature pack, executing warehouse eligibility and canonical-evidence flows against the existing local warehouse, and validating the internal/admin research-review workflow at 25-paper and 100-paper scales without exposing article-browsing workflows to client-facing users.

## Why

The repository already contains most of the runtime plumbing required for the research-intelligence pipeline: warehouse progress, eligibility routes, full-text hydration, canonicalization, benchmark refresh, quality reporting, internal/admin research routes, and a local browser stack. What remained incomplete was the end-to-end operational closure of the plan: no durable `specs/034...` pack existed, the warehouse eligibility counters still behaved like a limited slice instead of a whole-warehouse audit, and browser validation for large research reviews was still largely manual.

## Primary users

- Internal analysts who curate warehouse sources, run research reviews, and need audit-visible exclusion reasons.
- Engineering reviewers who need to verify that only strict MFC/MEC/MET, full-access, traceable evidence reaches decision-ready surfaces.

## Affected layers

- domain semantics: `bioelectrochem_agent_kit/domain/` remains the semantic owner for technology scope, admissibility, provenance, and uncertainty intent.
- contract boundary: `bioelectro-copilot-contracts/contracts/` remains the hardened owner for validation-facing and storage-facing research/evidence shapes.
- runtime adapters: `apps/api-server/`, `packages/domain-contracts/`, `packages/database/`, `packages/research-intelligence/`, `packages/rule-engine/`
- UI: `apps/web-ui/` internal/admin research and evidence workflows
- infrastructure: Prisma-backed local warehouse execution, canonicalization, benchmark refresh, quality reporting, and local browser validation
- docs and workflow: `specs/034-full-text-research-intelligence/` and related quickstart/research artifacts

## Scope

### In

- Create the durable `034` feature pack and record the real local warehouse baseline, validation path, and cleanup policy.
- Make warehouse eligibility audits aggregate the full linked warehouse while `limit` controls only the returned sample slice.
- Execute the real warehouse/full-text/canonical-evidence path over the existing local warehouse with eligibility filtering, audit buckets, and an explicit guarded local hard-prune path when requested.
- Validate internal/admin research-review behavior for 25-paper and 100-paper reviews using warehouse/backfill/preset paths instead of live search alone.

### Out

- Destructive deletion of warehouse source rows or historical facts by default; only the explicit local hard-prune command is authorized for local Docker/PostgreSQL cleanup.
- Broad new provider ingestion or rebootstrap as a prerequisite for this feature when the local warehouse already contains the target operational baseline.
- Reintroducing evidence or research article browsing as a client-facing workflow for VIEWER users.

## Functional requirements

1. Warehouse eligibility endpoints and repository logic MUST report whole-warehouse counts for the linked warehouse under analysis, even when only a limited sample of items is returned to the caller.
2. The active research-review and extraction surfaces MUST keep only strict MFC/MEC/MET, full-access, traceable sources while preserving excluded rows and reason buckets for audit.
3. The canonical evidence pipeline MUST continue to require traceable locators, source hashes, admissible access/license posture, and quality gates before decision-ready facts can affect benchmark refresh or `EvidenceDecisionContext`.
4. Internal/admin research validation MUST include reproducible 25-paper and 100-paper review flows that use the warehouse/backfill/preset path rather than the live search slice capped at 15 provider results.
5. Cleanup MUST default to soft exclusion and artifact hygiene only; warehouse history remains available for replay, audit, and future reprocessing unless a later feature or explicit user instruction authorizes destructive deletion. This batch authorizes only the guarded local hard-prune path.

## Acceptance criteria

- [x] `specs/034-full-text-research-intelligence/` exists with `spec.md`, `plan.md`, `tasks.md`, `quickstart.md`, `research.md`, and `contracts/research-document-ingestion.md` kept consistent.
- [x] Warehouse eligibility counts reflect the full linked warehouse under audit while `items` remains a bounded sample.
- [x] The local warehouse execution path records baseline counts, rejection buckets, canonicalization outcomes, benchmark refresh output, and quality-report output.
- [x] Internal/admin research-review validation covers 25-paper and 100-paper cases and confirms rich, non-truncated paper details while VIEWER users stay excluded from those surfaces.
- [x] Explicit local hard-prune validation records dry-run counts, retained/deleted source counts, clean review ID, result counts, and browser evidence that `Queued` placeholders are gone.
- [x] Validation evidence is recorded with objective PASS/FAIL outcomes for DB, JS, Python, build, canonicalization, benchmark refresh, quality report, local runtime, and browser flow checks.

## Clarifications and open questions

- The warehouse counts supplied in the planning prompt are treated as the expected operational baseline for the referenced local dataset; if the live local database has drifted, the execution artifacts must record the actual measured counts and explain the difference.
- A future feature may still promote dedicated persisted document-block tables if runtime/source-chunk storage proves insufficient in the real 25/100-paper validation flows; that is not assumed up front here.

## Risks / unknowns

- Real full-text hydration and canonicalization over a large linked warehouse may take long enough that batching, resumption, and throughput reporting become essential to keep the feature operationally credible.
- Publisher/network variability can still block parts of the real full-text path even when the local warehouse is already populated; those failures must become explicit quality/audit outcomes rather than silent exclusions.
