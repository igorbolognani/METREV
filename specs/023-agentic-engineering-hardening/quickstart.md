# Quickstart — Agentic Engineering Hardening

## Goals

- verify that the root workflow surface is explicit, complete, and executable
- confirm that prompt bindings and specialist prompts remain aligned with the
  active root agents
- confirm the lockfile satisfies frozen CI installs
- confirm the web UI client rejects contract drift at the JSON boundary
- confirm runtime version lineage remains visible on evaluation and research
  evidence surfaces

## Preconditions

- repository dependencies are installed
- the repository root is available locally

## Setup

1. Read `WORKFLOW.md`.
2. Read `docs/internal-feature-workflow.md`.
3. Inspect the root `.github/prompts/` and `.github/agents/` folders.
4. Read `specs/023-agentic-engineering-hardening/contracts/api-client-contract-hardening.md`.

## Happy path

1. Run `pnpm install --frozen-lockfile`.
2. Run `pnpm run test:workflow-assets`.
3. Run `pnpm exec vitest run tests/web-ui/api-client.test.ts`.
4. Run `pnpm exec vitest run tests/runtime/research-intelligence.test.ts tests/runtime/research-api.test.ts tests/runtime/api.test.ts`.
5. Confirm each command passes without lockfile drift, invalid-agent errors, or contract-lineage regressions.

## Failure path

1. Change a prompt `agent:` value to an unsupported identifier.
2. Re-run `pnpm run test:workflow-assets`.
3. Confirm the failure points to the exact prompt and missing agent mapping.
4. Alternatively, return an invalid JSON workspace payload from `apps/web-ui/src/lib/api.ts` tests and confirm the focused API client test fails on the precise contract boundary.

## Edge case

1. Add a new root prompt or agent asset.
2. Update the workflow-assets runtime test in the same patch.
3. If a new evaluation or research lineage surface gains runtime-version
   context, update the shared schemas and canonical contract note in the same
   patch.
4. Confirm the new asset is reflected in the active root docs if it changes the
   maintained workflow surface.

## Verification commands and checks

- `pnpm run test:workflow-assets`
- `pnpm exec vitest run tests/web-ui/api-client.test.ts`
- `pnpm exec vitest run tests/runtime/research-intelligence.test.ts tests/runtime/research-api.test.ts tests/runtime/api.test.ts`
- `pnpm install --frozen-lockfile`
- `pnpm run test:fast`
