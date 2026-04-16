# Quickstart — Root Workflow Autonomy

## Goals

- invoke the repository's internal workflow autonomously through the one-shot entrypoint
- preserve the currently validated runtime setup while changing only the workflow layer

## Preconditions

- the root workflow surface already exists under `.github/`, `docs/`, and `specs/_templates/`
- the current runtime remains reachable through the validated web and API endpoints

## Setup

1. Open the repository root in VS Code.
2. Confirm the root workflow docs are present.
3. Use the one-shot workflow prompt when you want the repository to drive the full flow autonomously, or select the `workflow-orchestrator` agent directly from the agent picker.

## Happy path

1. Invoke `.github/prompts/ship-change.prompt.md` with a medium or large change request, or run the same request through the `workflow-orchestrator` agent.
2. Confirm the repository chooses the required durable artifact pack, plans the change, and preserves the source-of-truth split.
3. Confirm the final output includes verified checks and any residual blockers.

## Failure path

1. Provide an underspecified change request that lacks enough detail to plan safely.
2. Confirm the workflow asks for clarification or falls back to the staged clarification path instead of guessing.
3. Confirm no runtime or contract boundary change is claimed without explicit promotion and validation.

## Edge case

1. Request a workflow-only change while the API and web are already running.
2. Confirm the autonomous path updates only the workflow assets and docs.
3. Confirm the web login and API health endpoints remain reachable afterward.

## Verification commands and checks

- `python3 tests/contracts/run_contract_check.py`
- `curl -fsS http://localhost:4012/health >/dev/null && echo http://localhost:4012/health ready`
- `curl -fsS http://localhost:3012/login >/dev/null && echo http://localhost:3012/login ready`
