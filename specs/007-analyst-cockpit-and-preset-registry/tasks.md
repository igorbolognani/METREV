# Tasks — Analyst Cockpit And Preset Registry

## Workstream 1 — Config and preset foundation

- [x] T1 Remove the active `baseUrl` deprecation source without breaking alias resolution.
- [x] T2 Convert the intake flow from a single preset branch into a shared registry.

## Workstream 2 — Second preset and cockpit

- [x] T3 Add the nitrogen-recovery golden case and extend preset regression coverage.
- [x] T4 Rebuild the evaluation detail route into an analyst cockpit with comparison-first hierarchy.

## Workstream 3 — Validation and follow-through

- [x] T5 Run lint, JavaScript tests, and build checks.
- [x] T6 Validate both presets and the redesigned evaluation route in the authenticated runtime.

T6 status: 2026-04-15 authenticated runtime smoke completed against the live hosted-Supabase plus split `pnpm` path via issued Auth.js JWT session cookies. Verified that the intake route rendered both preset surfaces, the wastewater preset supported mixed manual plus accepted-catalog evidence submission, the nitrogen-recovery preset preserved its objective through persisted evaluation fetch, and the resulting evaluation payloads exposed the diagnosis, ranked options, typed evidence, and history required by the cockpit design. Residual limitation: interactive browser click-through was not available in this chat session, so preset and route validation used live HTTP route rendering plus authenticated API assertions.

## Dependencies

- T2 depends on T1.
- T3 depends on T2.
- T4 depends on T2 and T3.
- T5 and T6 depend on T4.

## Parallelizable

- [x] P1 Draft the feature pack while mapping the nitrogen-recovery golden case.
- [x] P2 Prepare preset regression expectations while designing the cockpit hierarchy.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
