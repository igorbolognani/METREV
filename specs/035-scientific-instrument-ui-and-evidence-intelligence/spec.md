# Feature Specification - Scientific Instrument UI and Evidence Intelligence

## Objective

Transform METREV into a professional scientific instrument workspace with an integrated evidence intelligence pipeline. The feature must make decision quality visible, measurable, and improvable across the database, API, worker, evaluation flow, and UI.

## Why

METREV already has a mature deterministic decision-support backend: domain semantics, contract validation, evidence trust chain, audit records, benchmark aggregation, and confidence framing. The product now needs a UI and evidence operations layer that communicate that rigor clearly and make evidence gaps actionable.

## Primary users

- Analysts who configure cases, run evaluations, inspect evidence, and produce reports.
- Administrators who monitor evidence health, discovery, acquisition, review, and warehouse quality.
- Viewers who inspect reports and public scientific content without changing runtime state.

## Affected layers

- domain semantics: new evidence quality and discovery policies.
- contract boundary: new validation-facing audit, discovery, acquisition, readiness, and workspace summary shapes.
- runtime adapters: new audit/discovery packages, repository methods, API routes, worker jobs, and evaluation readiness integration.
- UI: new scientific instrument design system, consolidated navigation, redesigned landing/home/evaluate/evidence/research/reports/admin surfaces.
- infrastructure: Prisma migration and local validation checks.
- docs and workflow: durable feature pack, planning-only contract notes, quickstart, and validation checklist.

## Scope

### In

- Complete feature pack under `specs/035-scientific-instrument-ui-and-evidence-intelligence/`.
- Evidence quality audit rules for coverage, recency, outliers, readiness, and funnel metrics.
- Evidence discovery rules for gap-to-query targeting and full-text acquisition policy.
- Prisma models for persisted audit reports, discovery targets, and acquisition attempts.
- New shared packages for evidence audit, evidence discovery, and design system primitives.
- API and worker integration for triggering, reading, and processing evidence intelligence state.
- Pre-evaluation readiness check that feeds existing missing-data and confidence behavior.
- UI redesign across public landing, authenticated home, evaluate, evidence, research, reports, and admin.
- Tests for contracts, runtime logic, API behavior, database persistence, UI rendering, and E2E flows.

### Out

- Changes to rule-engine scoring weights or dimensions.
- Canonicalization algorithm rewrites.
- LLM-based evidence acceptance or automatic scientific claim approval.
- Paid external APIs such as Scopus or Web of Science.
- Authentication provider changes.
- Mobile-specific feature parity beyond responsive fallback behavior.

## Functional requirements

1. The system MUST persist and expose evidence quality audit reports with coverage, gaps, outliers, readiness scores, funnel metrics, and summary fields.
2. The system MUST generate discovery targets from evidence gaps using canonical BES terminology.
3. The system MUST track full-text acquisition attempts without bypassing existing evidence admissibility gates.
4. Evaluation creation MUST account for evidence readiness before building final confidence output, without changing rule-engine scoring weights.
5. The UI MUST consolidate the product into public landing, Home, Evaluate, Evidence, Research, Reports, and Admin surfaces.
6. The UI MUST render a scientific instrument design direction with dense but readable panels, status signals, gauges, heatmaps, trust-chain indicators, and provenance-forward copy.
7. User-facing labels, tooltips, explanation boards, and buttons MUST trace to canonical domain or contract vocabulary.
8. Frontend components MUST render typed API payloads and keep business logic in packages or services.
9. Existing route flows MUST remain reachable through compatibility redirects, aliases, or explicit route preservation during rollout.
10. The final app MUST run through the Docker-backed local view after validation.

## Acceptance criteria

- [ ] `spec.md`, `plan.md`, `tasks.md`, `quickstart.md`, `research.md`, and `contracts/planning-notes.md` exist and agree.
- [ ] Domain and contract evidence intelligence policies are added and runtime-loadable.
- [ ] Zod schemas validate audit, discovery, acquisition, readiness, and workspace summary payloads.
- [ ] Prisma migration adds durable audit, discovery, and acquisition state.
- [ ] Evidence audit package produces schema-valid reports from repository data.
- [ ] Evidence discovery package produces schema-valid targets and records acquisition attempts.
- [ ] API routes expose evidence quality reports and pipeline status with role gates.
- [ ] Research worker drains discovery and acquisition queues without disrupting existing backfill/extraction jobs.
- [ ] Case evaluation records evidence-readiness-driven missing-data or provenance notes.
- [ ] Redesigned UI pages render using the design system and preserve role-aware navigation.
- [ ] Public landing page explains METREV with real BES and trust-chain concepts.
- [ ] Evidence quality dashboard shows coverage heatmap, gaps, readiness, funnel, and outliers.
- [ ] Evaluation cockpit shows confidence, diagnosis, evidence context, recommendations, impact, suppliers, roadmap, and audit without tab overload.
- [ ] `pnpm run validate:fast`, `pnpm run validate:advanced`, `pnpm run test:db`, and targeted E2E checks pass or any blocker is explicitly documented.
- [ ] Docker local view is restarted for user testing after validation.

## Clarifications and open questions

- The attached `claude_design_skill.md` is a design-quality reference only; repository authority still lives in `AGENTS.md`, `.github/copilot-instructions.md`, domain files, and contract files.
- Existing evidence artifacts and text chunks count as full-text evidence when traceable, even if source URL fields are absent.
- Route compatibility is part of implementation, not deferred cleanup.

## Risks / unknowns

- The full UI rewrite touches many existing tests and route assumptions.
- Prisma migration validation depends on local database availability.
- External acquisition providers may require keys, rate-limit handling, or disabled fallback modes in local tests.
- The current global CSS surface is broad and requires careful incremental replacement.
