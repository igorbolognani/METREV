# Tasks - Scientific Instrument UI and Evidence Intelligence

## Workstream A - Feature Artifacts

- [x] A1 Create `spec.md`.
- [x] A2 Create `plan.md`.
- [x] A3 Create `tasks.md`.
- [x] A4 Create `quickstart.md`.
- [x] A5 Create `research.md`.
- [x] A6 Create `contracts/planning-notes.md`.

## Workstream B - Domain, Contracts, and Schemas

- [x] B1 Add domain evidence quality audit policy.
- [x] B2 Add domain evidence discovery policy.
- [x] B3 Add contract evidence quality audit policy.
- [x] B4 Add contract evidence discovery policy.
- [x] B5 Add audit, gap, outlier, readiness, funnel, discovery, and acquisition schemas.
- [x] B6 Add request and response schemas for audit/discovery endpoints.
- [x] B7 Add loaders for new policies.
- [x] B8 Add reconciliation entries and exports.
- [x] B9 Add contract drift tests.

## Workstream C - Database

- [x] C1 Add `EvidenceQualityAuditReport` model.
- [x] C2 Add `EvidenceDiscoveryTarget` model.
- [x] C3 Add `EvidenceAcquisitionAttempt` model.
- [x] C4 Add relations to existing evidence models.
- [x] C5 Create migration.
- [x] C6 Add evidence audit repository methods.
- [x] C7 Reuse existing evidence quality report logic.
- [x] C8 Add Postgres persistence tests.

## Workstream D - Design System

- [x] D1 Create `packages/design-system`.
- [x] D2 Add tokens for scientific instrument aesthetic.
- [x] D3 Add accessible primitives.
- [x] D4 Add layout primitives.
- [x] D5 Add coverage heatmap, trust-chain, stack diagram, confidence gauge, funnel, sparkline, and radar visualizations.
- [x] D6 Bridge tokens into web global CSS.
- [x] D7 Add UI rendering tests.

## Workstream E - Evidence Audit Package

- [x] E1 Create `packages/evidence-audit`.
- [x] E2 Implement coverage matrix classification.
- [x] E3 Implement gap detection.
- [x] E4 Implement outlier detection.
- [x] E5 Implement readiness scoring.
- [x] E6 Implement funnel metrics.
- [x] E7 Implement audit orchestrator.
- [x] E8 Add unit tests.

## Workstream F - Evidence Discovery Package

- [x] F1 Create `packages/evidence-discovery`.
- [x] F2 Implement gap-to-query generation.
- [x] F3 Implement full-text acquisition attempt handling.
- [x] F4 Implement discovery orchestration.
- [x] F5 Add unit tests.

## Workstream G - API, Worker, and Evaluation Integration

- [x] G1 Add evidence audit route module.
- [x] G2 Register API routes.
- [x] G3 Extend workspace summary with evidence intelligence.
- [x] G4 Extend case evaluation with readiness check.
- [x] G5 Extend research worker with discovery and acquisition draining.
- [x] G6 Add API and worker tests.

## Workstream H - Web UI Redesign

- [x] H1 Rebuild navigation into public landing, Home, Evaluate, Evidence, Research, Reports, and Admin.
- [x] H2 Preserve old route compatibility.
- [x] H3 Redesign public landing page.
- [x] H4 Build mission control home.
- [x] H5 Build evaluate configure surface.
- [x] H6 Build evaluation results cockpit.
- [x] H7 Redesign evidence explorer and review board.
- [x] H8 Build evidence quality dashboard.
- [x] H9 Redesign research pages.
- [x] H10 Redesign reports pages.
- [x] H11 Build admin hub.
- [x] H12 Add UI and E2E tests.

## Workstream I - Validation and Restart

- [x] I1 Run focused tests for changed packages.
- [x] I2 Run `pnpm run validate:fast`.
- [x] I3 Run `pnpm run validate:advanced`.
- [x] I4 Run `pnpm run test:db`.
- [x] I5 Run targeted E2E tests.
- [x] I6 Run local-view smoke validation.
- [x] I7 Stop stale local app tasks if any are running.
- [x] I8 Restart local app with `pnpm run local:view:up`.
- [x] I9 Report final URL and validation status.

## Dependencies

- Workstream B must precede packages that load new policy files.
- Workstream C must precede packages and API routes that persist audit/discovery state.
- Workstream D must precede full UI rebuild.
- Workstreams E and F can run in parallel after B and C.
- Workstream G depends on B, C, E, and F.
- Workstream H depends on D and G.
- Workstream I depends on all implementation workstreams.

## Parallelizable

- [x] B and C can run independently.
- [x] D can run independently from B and C.
- [x] E and F can run in parallel after B and C.
- [x] UI page tests can be developed in parallel with route redesign once API contracts stabilize.

## Validation gates

- [x] docs updated or marked not needed.
- [x] contract owner files updated or marked not needed.
- [x] tests run or explicit reason recorded.
- [x] acceptance criteria checked.
- [x] route compatibility checked.
- [x] evidence admissibility gates preserved.

## Definition of done

- [x] Feature pack artifacts are consistent.
- [x] Domain, contract, runtime schemas, and tests align.
- [x] Database migration and repository logic work.
- [x] Evidence audit and discovery packages are integrated.
- [x] API, worker, and evaluation flow are integrated.
- [x] UI redesign covers all planned surfaces.
- [x] Full validation is green or documented with a genuine environment blocker.
- [x] Local app is restarted for user testing.
