# Implementation Plan — Root Workflow Autonomy

## Summary

Add one root-owned `workflow-orchestrator` agent, bind the one-shot workflow prompt to it, and align the root docs and instructions so the repository can drive its own internal feature lifecycle autonomously without changing the validated runtime behavior.

## Source-of-truth files

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `docs/internal-feature-workflow.md`
- `docs/runtime-tooling-setup.md`
- `README.md`
- `package.json`
- `packages/database/scripts/run-prisma-with-direct-url.mjs`
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma.config.ts`
- `apps/web-ui/src/instrumentation.ts`
- `packages/telemetry/src/node-sdk.ts`

## Affected layers and areas

- root workflow agents and prompts under `.github/`
- root workflow docs under `docs/`
- root repository baseline documentation
- maintained specs under `specs/`

## Required durable artifacts

- `spec.md`: required to define the autonomy scope and non-goals
- `plan.md`: required to bind the change to the current runtime invariants
- `tasks.md`: required to sequence agent, prompt, doc, and validation work
- `quickstart.md`: required to document how the autonomous path is used safely
- `research.md`: required because the safe autonomy boundary depends on the current runtime state and working repo surface
- `contracts/`: not required because no API, serialization, or persistence boundary change is intended in this rollout

## Research inputs

- `specs/003-root-workflow-autonomy/research.md`
- current runtime and workflow docs in `README.md` and `docs/internal-feature-workflow.md`

## Contracts and canonical owner files

- contracts affected: none expected in the hardened boundary
- canonical owner files: `bioelectro-copilot-contracts/contracts/` if any future workflow note implies contract changes
- planning-only notes under `specs/<feature>/contracts/`: not required for this feature because the change is workflow-only

## Data model or boundary changes

No runtime data model change is intended. The rollout must preserve the current Supabase-hosted PostgreSQL path, Prisma migration semantics, Auth.js session boundary, API telemetry bootstrap, and the current no-op web instrumentation fallback.

## Implementation steps

1. Add a root-owned `workflow-orchestrator` agent that can drive the internal workflow end to end while preserving the current runtime invariants.
2. Bind the one-shot workflow prompt to that agent and keep the staged prompts available for manual control.
3. Align the workflow docs and instructions so the autonomous path is discoverable and clearly non-destructive to the validated runtime setup.

## Validation strategy

- unit: not applicable for the workflow-only change
- integration: validate workflow asset integrity with the editor and the repository contract guardrails
- e2e/manual: verify that the autonomous prompt surface is discoverable and that the current running web and API endpoints remain reachable
- docs/contracts: ensure all workflow docs agree on the same source-of-truth split and runtime invariants

## Critique summary

The main risk is turning the workflow layer into a second opaque system instead of a predictable composition of the current prompts, templates, and guards. The second risk is accidentally loosening the runtime protections around Supabase migrations, Auth.js, or telemetry through documentation drift.

## Refined final plan

Keep the autonomy change narrow: one new agent, one prompt rebinding, one maintained feature pack, and a small documentation pass that explicitly protects the current runtime invariants.

## Rollback / safety

If the autonomous entrypoint proves confusing, unbind the one-shot prompt from the orchestrator agent and keep the staged prompts as the primary path. No runtime rollback should be needed because runtime code is out of scope.
