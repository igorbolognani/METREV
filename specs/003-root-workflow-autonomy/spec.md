# Feature Specification — Root Workflow Autonomy

## Objective

Configure the root-owned Spec Kit-style artifact system so it can operate autonomously through the repository's own agents, prompts, templates, and docs without depending on external Spec Kit tooling.

## Why

The repository already has the durable artifact pack, planning prompts, templates, and runtime-specific governance. The remaining gap is a safe autonomous entrypoint that can run the internal workflow end to end while preserving the currently validated Supabase, Prisma, Auth.js, telemetry, and quickstart flows.

## Primary users

- maintainers driving medium and large changes through a one-shot workflow
- reviewers who need predictable, auditable workflow artifacts
- future agents that should use the repository's internal workflow surface instead of external Spec Kit tooling

## Affected layers

- domain semantics: no direct ontology change expected
- contract boundary: no direct schema change expected, but planning-only notes must keep canonical ownership explicit
- runtime adapters: no runtime behavior change expected
- UI: no user-facing application change expected
- infrastructure: no deployment or environment change expected
- docs and workflow: root agents, prompts, instructions, specs, and workflow docs

## Scope

### In

- a root-owned autonomous workflow agent
- a maintained feature pack for this workflow change
- prompt and doc alignment so the autonomous path is discoverable and safe
- explicit preservation of current runtime invariants in the workflow layer

### Out

- changes to Supabase connectivity, Prisma migration semantics, Auth.js session behavior, or runtime ports
- reactivation of custom Next.js web telemetry bootstrap
- introduction of external Spec Kit tooling, MCP, or CLI dependencies

## Functional requirements

1. The repository must provide one autonomous workflow entrypoint that drives the internal feature lifecycle end to end.
2. The autonomous path must preserve the repository truth model and must not turn planning-only notes into canonical contracts.
3. The workflow layer must explicitly protect the validated runtime invariants around Supabase, Prisma, Auth.js, telemetry, and quickstart flows.
4. The staged/manual prompts must remain available for users who want to drive clarification, bootstrap, and planning separately.

## Acceptance criteria

- [x] A root-owned `workflow-orchestrator` agent exists and is user-invocable.
- [x] The one-shot workflow prompt uses the `workflow-orchestrator` agent while the staged prompts remain intact.
- [x] The internal workflow docs explain the autonomous path and the runtime invariants it must not break.
- [x] The workflow-only change validates cleanly without introducing runtime regressions.

## Clarifications and open questions

- Should the autonomous entrypoint be only the current one-shot prompt, or should a dedicated new one-shot prompt also exist later?
- Is a workflow-specific instruction file needed after this pass, or is the current docs instruction surface sufficient?

## Risks / unknowns

- Over-automation could blur the role of the existing Planner, Reviewer, and Validation Sentinel agents.
- The autonomy layer could become stale if it does not explicitly preserve the current runtime invariants documented by the repository.
