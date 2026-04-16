# Tasks — Root Workflow Autonomy

## Workstream 1 — Feature artifacts and runtime boundary capture

- [x] T1 Capture the current runtime invariants and workflow surface in `research.md`.
- [x] T2 Keep `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` aligned around a workflow-only change.

## Workstream 2 — Autonomous workflow surface

- [x] T3 Add a root-owned autonomous workflow agent that preserves the repository truth model and current runtime invariants.
- [x] T4 Rebind the one-shot workflow prompt to the new orchestrator while keeping the staged prompts available.

## Workstream 3 — Documentation and hardening

- [x] T5 Update workflow docs and repository baseline docs so the autonomous path is discoverable and the safe runtime invariants stay explicit.
- [x] T6 Tighten the docs instruction surface so future workflow edits preserve the internal workflow and current runtime protections.

## Workstream 4 — Validation

- [x] T7 Validate the changed workflow files with the editor error checker.
- [x] T8 Re-run the repository contract validation and verify the running API and web endpoints remain reachable.

## Dependencies

- T3 depends on T1.
- T4 depends on T3.
- T5 depends on T3 and T4.
- T6 depends on T5.
- T7 and T8 depend on T3 through T6.

## Parallelizable

- [x] P1 Draft the feature docs while the agent and prompt surface is being updated.
- [x] P2 Review runtime invariant wording in `README.md` and `docs/runtime-tooling-setup.md` while the autonomy feature pack is being filled out.

## Validation gates

- [x] workflow docs updated and internally consistent
- [x] staged prompts remain available
- [x] runtime invariants are documented explicitly
- [x] contract validation passes

## Definition of done

- [x] the repository has one autonomous workflow entrypoint and still preserves the staged/manual path
- [x] the workflow-only change does not require runtime rollback
- [x] final verification states exactly what was checked in the running system
