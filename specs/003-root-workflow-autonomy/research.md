# Research Notes — Root Workflow Autonomy

## Goal

Identify the minimum safe workflow changes required to make the repository's internal feature system autonomous without regressing the currently validated runtime setup.

## Questions

- What is still missing for the internal workflow to behave like a root-owned Spec Kit replacement instead of only a documented process?
- Which current runtime invariants must the autonomous path explicitly preserve?

## Inputs consulted

- docs: `README.md`, `docs/internal-feature-workflow.md`, `docs/runtime-tooling-setup.md`, and `specs/002-runtime-monorepo-foundation/quickstart.md`
- repo files: root prompts, root agents, root skill, `package.json`, Prisma config and schema, web instrumentation, and API telemetry bootstrap
- experiments: current web login endpoint and API health endpoint already reachable in the running environment

## Findings

- The internal workflow already has the artifact pack, staged prompts, templates, and governance to replace external Spec Kit tooling in practice.
- The missing capability is a single autonomous entrypoint that coordinates the existing internal workflow instead of requiring manual prompt sequencing.
- The current runtime invariants that must stay explicit are: Supabase-hosted PostgreSQL through `DATABASE_URL` plus `DIRECT_URL`, Prisma migrations through the direct-url helper, shared Auth.js secret across API and web, API telemetry kept active, and no-op custom web instrumentation to keep `next dev` stable.
- The prompt binding for a custom agent validated cleanly when the prompt referenced the agent by file-stem identifier `workflow-orchestrator`.

## Decisions

- Add one new root-owned autonomous workflow agent rather than a second competing workflow system.
- Bind the current one-shot workflow prompt to that agent through the identifier `workflow-orchestrator` and keep the staged prompts intact.
- Treat this as a workflow-only feature with no intended runtime code change.

## Open blockers

- None in the repository design. The only risk is documentation drift if the runtime invariants are not written explicitly in the autonomy layer.

## Impact on plan

- The autonomy agent must mention the current Supabase, Prisma, Auth.js, telemetry, and quickstart invariants directly.
- The workflow docs must explain that the autonomous path composes the existing workflow instead of replacing the repository truth model.
- Final validation must include both editor-side prompt or agent integrity and runtime reachability checks for `/health` and `/login`.
