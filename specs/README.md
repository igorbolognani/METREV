# METREV specification index

**Reviewed:** 2026-09-23
**Repository snapshot:** `e7f77ec` (2026-05-27)

This page is the navigation and status register for the numbered feature packs. A spec describes an intended change; its checklist is a recorded claim, not proof that the code, data, or operational workflow currently works. Read the relevant implementation and run its validation before treating an old acceptance statement as current.

## Current direction recorded in this review

The requested scientific focus is:

- **Technologies:** microbial fuel cells (MFC) and microbial electrolysis cells (MEC).
- **Applications:** wastewater management/treatment and biosensors.
- **Model structure:** physical-chemical processes; materials and electrodes/membranes; biological activity; reactor geometry and component relationships; operation and instrumentation; outputs and metrics.
- **Order of work:** first establish useful system definitions, data, parameters, and runnable baseline models/tests. Defer a comprehensive provenance/audit product until that foundation works, while retaining a minimal source reference, units, value type (measured/literature/default/assumption/model output), and uncertainty from the beginning.

This records the user's direction. Spec [038](038-coupled-mfc-mec-wastewater-biosensors/) is now the active execution pack. Its runtime implements a first coupled 0D mechanistic baseline, not spatially resolved multiphysics. Both standalone and MFC/MEC-integrated biosensors are in scope. Active taxonomy and queries are narrowed; older stored cases and enums may remain only for historical read compatibility.

For new work, do not inherit the old 30,000/500,000-record targets or broaden into unrelated BES families/applications by default. Existing code and evidence are retained until a scoped migration or retirement is designed.

## Historical direction by phase

| Specs                     | Direction recorded                                                                                                                  | Current reading                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [002–009](#spec-register) | Runtime monorepo, evaluation service/UI, first wastewater case, evidence ingestion and review gate                                  | Foundational implementation history. 002 has 3 unchecked tasks; 003–009 checklists are complete.                                                                                                          |
| [010–015](#spec-register) | Runtime authority, analyst UX, documentation reconciliation, local-first workspace, repository consolidation                        | Governance/workspace baseline. Checklists are complete except 011, whose 15 tasks remain unchecked and which has no clear current owner.                                                                  |
| [016–021](#spec-register) | UI refactor, big-data and evidence workspaces, research tables, three-phase product plan, public topic pages                        | Broad product direction. 016 is explicitly superseded; 017–021 checklists are marked complete. These are implementation/design references, not the current science-scope mandate.                         |
| [023–029](#spec-register) | Agent/CI governance, security automation, data/metadata intelligence, signed-in/admin UX                                            | Checklists are marked complete. 022 is absent; spec 028 records removal of the old external-program feature pack.                                                                                         |
| [030–032](#spec-register) | Dashboard/parameter state plus 30k corpus ambition, 500k evidence ingestion, canonical full-text                                    | Unresolved and scale-oriented. 030 has 21 unchecked tasks; 031 records 24/29 complete and an old local count far below target; 032 records 19/21 complete. Do not treat the volume goals as current.      |
| [033–037](#spec-register) | UI/API/database/rule-engine integration, full-text research, scientific instrument UI, evidence readiness, quality/document tooling | 033, 035, and 036 checklists are marked complete; 034 has 2 open; 037 reports a partial document-parser scaffold and deferred work. Their completion marks do not establish current end-to-end readiness. |

The numbering gap at **022** is intentional in the current tree. Do not recreate that directory: spec 028 says the prior feature was removed. There is no spec 001 in the current inventory.

## Spec register

Checklist counts below are read from each `tasks.md` in this repository snapshot. “Complete” means all listed boxes are checked; it does not certify present-day runtime behavior.

| ID  | Feature pack                                                                                              | Recorded status / why it matters                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 002 | [Runtime monorepo foundation](002-runtime-monorepo-foundation/)                                           | 26/29 checked; 3 open decisions/tasks.                                                                                                                       |
| 003 | [Root workflow autonomy](003-root-workflow-autonomy/)                                                     | 17/17 checked.                                                                                                                                               |
| 004 | [Evaluation detail completion](004-evaluation-detail-completion/)                                         | 15/15 checked.                                                                                                                                               |
| 005 | [Case evaluation service extraction](005-case-evaluation-service-extraction/)                             | 16/16 checked.                                                                                                                                               |
| 006 | [Wastewater golden case preset](006-wastewater-golden-case-preset/)                                       | 16/16 checked; early wastewater use case.                                                                                                                    |
| 007 | [Analyst cockpit and preset registry](007-analyst-cockpit-and-preset-registry/)                           | 15/15 checked.                                                                                                                                               |
| 008 | [External evidence ingestion foundation](008-external-evidence-ingestion-foundation/)                     | 15/15 checked.                                                                                                                                               |
| 009 | [External evidence review and intake gate](009-external-evidence-review-and-intake-gate/)                 | 15/15 checked.                                                                                                                                               |
| 010 | [Authority/runtime hardening](010-authority-runtime-hardening/)                                           | 15/15 checked.                                                                                                                                               |
| 011 | [Analyst UX system](011-analyst-ux-system/)                                                               | 0/15 checked; antecedent UX plan with unclear disposition.                                                                                                   |
| 012 | [Workflow/document reconciliation](012-workflow-doc-reconciliation/)                                      | 15/15 checked.                                                                                                                                               |
| 013 | [METREV UI/UX parity](013-metrev-ui-ux-parity/)                                                           | 17/17 checked.                                                                                                                                               |
| 014 | [Local-first professional workspace](014-local-first-professional-workspace/)                             | 18/18 checked.                                                                                                                                               |
| 015 | [Repository authority/structure consolidation](015-repository-authority-and-structure-consolidation/)     | 16/16 checked; consolidation umbrella.                                                                                                                       |
| 016 | [METREV UI refactor](016-metrev-ui-refactor/)                                                             | Marked superseded; 5/39 checked. Historical design context only.                                                                                             |
| 017 | [Full big-data workspace](017-full-big-data-workspace/)                                                   | 41/41 checked; broad evidence/supplier/patent/research baseline.                                                                                             |
| 018 | [Evidence intelligence workspace](018-evidence-intelligence-workspace/)                                   | 21/21 checked; internal evidence surface.                                                                                                                    |
| 019 | [Research review-table engine](019-research-intelligence-review-table-engine/)                            | 13/13 checked; research-integration implementation baseline.                                                                                                 |
| 020 | [Three-phase product plan](020-metrev-three-phase-product-plan/)                                          | 44/44 checked; broad roadmap spanning public, client, and internal product surfaces.                                                                         |
| 021 | [Public infographic pages](021-public-infographic-pages/)                                                 | 34/34 checked; public education/topic-page slice.                                                                                                            |
| 022 | _No directory in current tree_                                                                            | Spec 028 documents removal of the earlier external-program feature pack.                                                                                     |
| 023 | [Agentic engineering hardening](023-agentic-engineering-hardening/)                                       | 23/23 checked.                                                                                                                                               |
| 024 | [Agent/CI governance hardening](024-agent-ci-governance-hardening/)                                       | 19/19 checked.                                                                                                                                               |
| 025 | [CI security automation](025-ci-security-automation/)                                                     | 17/17 checked.                                                                                                                                               |
| 026 | [CI/local smoke validation](026-ci-local-smoke-validation/)                                               | 17/17 checked.                                                                                                                                               |
| 027 | [CI workflow semantic lint](027-ci-workflow-semantic-lint/)                                               | 17/17 checked.                                                                                                                                               |
| 028 | [Data/metadata intelligence](028-metrev-data-metadata-intelligence/)                                      | 21/21 checked; replaces the removed 022 feature.                                                                                                             |
| 029 | [Logged-in UI/admin separation](029-logged-in-ui-admin-separation/)                                       | 12/12 checked.                                                                                                                                               |
| 030 | [Client dashboard/research intelligence](030-client-dashboard-research-intelligence/)                     | 0/21 checked; combines UX, parameter state, and a 30k MFC/MEC warehouse plan. Scope and checklist need reconciliation.                                       |
| 031 | [Production-scale evidence ingestion](031-production-scale-evidence-ingestion/)                           | 24/29 checked; 500k target remains open. Last recorded local snapshot: 118,389 catalog rows, 381,611 short of target; not current DB state.                  |
| 032 | [Canonical evidence full-text hardening](032-canonical-evidence-fulltext-hardening/)                      | 19/21 checked; 2 open tasks.                                                                                                                                 |
| 033 | [UI/API/database/rule-engine refactor](033-ui-api-database-rule-engine-refactor/)                         | 28/28 checked; implemented integration baseline, despite older authority-map language calling it active.                                                     |
| 034 | [Full-text research intelligence](034-full-text-research-intelligence/)                                   | 19/21 checked; 2 open tasks.                                                                                                                                 |
| 035 | [Scientific instrument UI/evidence intelligence](035-scientific-instrument-ui-and-evidence-intelligence/) | 88/88 tasks checked, but all listed acceptance criteria remain unchecked, including broad validation and restart. Status conflict.                           |
| 036 | [Evidence readiness cleanup](036-evidence-readiness-cleanup/)                                             | 39/39 checked; readiness implementation snapshot.                                                                                                            |
| 037 | [Evidence/research quality expansion](037-evidence-research-quality-expansion/)                           | 40 checked, 12 open, 13 marked `~`; the legend calls `~` “in progress” while the report documents explicit deferrals.                                        |
| 038 | [Coupled MFC/MEC, wastewater, and biosensor foundation](038-coupled-mfc-mec-wastewater-biosensors/)       | Current scope and implementation pack. Coupled 0D mechanistic baseline, typed inputs, both sensor deployments, bounded literature plan, and explicit limits. |

## Current source-of-truth layers

- `bioelectrochem_agent_kit/domain/`: domain vocabulary, system/component definitions, defaults, and rules.
- `bioelectro-copilot-contracts/contracts/`: validation and serialization boundary.
- `packages/` and `apps/`: executed runtime and adapters.
- `docs/repository-authority-map.md`: repository ownership/governance map.
- This file: direction history and feature-pack register; it does not supersede canonical domain contracts.

## Known status and reproducibility gaps

- Older numbered specs and dated reports contain broad product status, validation claims, and large-corpus operating instructions. They are historical context, not current scientific direction or proof of present runtime behavior.
- Spec 031 and 034 contain dated implementation snapshots. Their database counts and provider state cannot establish the current external/local corpus state.
- Spec 037 reports real PDF/table extraction and review-queue work as deferred; its “doctor PASS” covers scaffolds, not a complete health/readiness check. The `corpus:score`, `research:coverage`, and `audit:explain` CLIs default to dry-run but still write report files. The doctor currently treats a zero exit status from scaffold commands as `PASS`, so its aggregate label overstates readiness.
- Active scripts now expose bounded focused query plans. Actual provider ingestion and database writes remain deliberate operations; they are separate from offline planning and local unit tests.
- The active curated manifest is intentionally empty until claim-level sources are reviewed. Prior repository-seeded market, analyst, and supplier assertions lacked adequate claim-level locators; their files were removed. No database records were pruned.
- Spec 037's ADR/plan command names differ from root `package.json`: the docs use `evidence:corpus-score` / `research:coverage-report`, while the scripts are `corpus:score` / `research:coverage`.
- `pnpm run validate:fast` and `pnpm run test:js` were attempted in this review but did not reach lint/tests: this shell has pnpm 11.19.0 while the repo pins pnpm 10.6.0, and pnpm stopped on ignored dependency build scripts. No approval or bypass was applied. `python3 tests/contracts/run_contract_check.py` passed all 14 checks. Database ingestion/migrations, DB tests, and E2E were not run.

## Historical materials not available in this checkout

- Three local PDFs referenced by spec 028 are not present in the repository, so their full text and the former session's extraction cannot be re-checked here.
- Spec 037 references `/memories/session/plan.md`; an older audit also cites a VS Code `workspaceStorage` memory path. Neither file is available in this workspace. Personal-context retrieval provided summaries, not full past conversation transcripts.
- This clone is shallow, so the full older Git commit history is not present locally. The default-branch snapshot was checked separately on 2026-09-23; historical branch/commit details beyond that snapshot were not reconstructed.
- No current Postgres corpus was queried during this review. All counts in specs are dated snapshots, not a statement of current database contents.

## Current implementation boundary

- Executed scope, required inputs, model assumptions, wastewater and biosensor fields, bounded literature plan, and acceptance criteria are in spec 038.
- User-facing wastewater/MFC, wastewater/MEC, standalone sensor, and integrated sensor templates are intentionally unpopulated; use source-backed measurements/literature values for actual cases.
- `coupled-0d-dae-v1` is deterministic and coupled but well-mixed/isothermal. Ionic speciation, spatial gradients, fouling dynamics, uncertainty propagation, independent calibration, and detailed provenance/audit remain future validation work.
- The focused evidence plan is 20 queries and 500 target records (hard-capped at 5,000). Plans are offline; execution requires a reviewed database target and external providers.
- No scientific records have been downloaded or loaded by this change. The offline plan was executed and verified; live provider ingestion and database writes remain unrun in this environment.
