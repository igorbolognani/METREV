# Feature Specification — Agentic Engineering Hardening

## Objective

Harden the repo-owned AI-assisted workflow surface so prompts, agents,
instructions, and operational rules are explicit, validated, and safe to extend.

## Why

The root surfaces already exist, but there are still avoidable gaps: prompt
bindings were inconsistent, review and test prompts were missing from the
active root surface, the CI workflow still tolerated lockfile drift, the web
client trusted JSON casts instead of the shared contract schemas, and runtime
version lineage stopped short of several evidence and research assets.

## Primary users

- maintainers using Copilot and VS Code to ship medium and large changes
- reviewers validating that AI-assisted changes follow the repository truth model

## Affected layers

- domain semantics: no canonical semantic change intended
- contract boundary: no canonical schema change in this slice
- runtime adapters: add workflow validation only
- UI: no direct product surface change
- infrastructure: repo automation and CI-facing guardrails
- docs and workflow: add `WORKFLOW.md` and a maintained feature pack

## Scope

### In

- add a repo-owned workflow contract in `WORKFLOW.md`
- normalize active prompt bindings to validated root agent identifiers
- promote root review and test prompts
- add automated validation for root workflow assets
- tighten CI installs to require a current lockfile
- parse web client JSON request and response boundaries with shared contract
  schemas
- surface runtime version lineage on evaluation evidence usage records,
  workspace snapshots, research evidence packs, and decision-ingestion previews

### Out

- OpenAPI generation and orchestration daemons
- runtime version lineage for source artifacts without a concrete owner path yet

## Functional requirements

1. Root workflow assets must exist and remain discoverable.
2. Prompt `agent:` bindings must use the validated active-root identifiers.
3. The repo must provide first-class prompts for test generation and diff
   review.
4. Workflow drift must fail an automated check.
5. CI must install dependencies with a frozen lockfile once the lockfile is
   current.
6. The web client must validate JSON request and response payloads against the
   shared `@metrev/domain-contracts` schemas instead of relying on unchecked
   casts.
7. Runtime version lineage must remain visible on evaluation lineage and the
   research evidence-pack surfaces when the runtime owns that version context.

## Acceptance criteria

- [x] `WORKFLOW.md` exists and documents execution, validation, failure, and
      learning rules.
- [x] Clarify and plan prompts bind to `planner` via file-stem identifiers.
- [x] Root review and test-generation prompts exist and are METREV-specific.
- [x] A focused runtime test catches missing workflow assets or invalid prompt
      bindings.
- [x] CI installs use `pnpm install --frozen-lockfile` after the lockfile drift
      is repaired.
- [x] The web API client validates request and response payloads with the shared
      contract schemas and rejects contract drift in focused tests.
- [x] Evaluation lineage and research evidence-pack payloads expose
      `runtime_versions` when the runtime owns that lineage source.

## Clarifications and open questions

- This slice adds a workflow contract but does not yet introduce a daemon or
  orchestrator implementation.
- `AGENTS.md` remains human-curated; automated learning capture stops at
  proposal.

## Risks / unknowns

- Over-specifying workflow could create duplicate guidance if root docs are not
  updated in the same slice.
- Prompt binding assumptions depend on the current VS Code prompt loader
  behavior, so the test should encode only the validated pattern used in this
  repository.
