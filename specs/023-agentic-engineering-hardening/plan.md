# Implementation Plan — Agentic Engineering Hardening

## Summary

Land the full hardening slice for METREV's AI-assisted workflow surface by
adding a repo-owned operational workflow contract, promoting missing root
prompts, normalizing active prompt bindings to validated agent identifiers,
protecting the workflow surface with executable tests, tightening CI installs,
replacing blind UI JSON casts with shared schema parsing, and extending runtime
version lineage across the evaluation and research evidence surfaces that
already own trustworthy version context.

## Source-of-truth files

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `WORKFLOW.md`
- `docs/internal-feature-workflow.md`
- `docs/repository-authority-map.md`
- `docs/runtime-tooling-setup.md`
- root `.github/prompts/`
- root `.github/agents/`
- root `.github/skills/`

## Affected layers and areas

- root workflow policy
- prompt and agent wiring
- runtime validation for workflow assets
- CI install reproducibility
- web UI API request and response boundaries
- runtime version lineage for evaluation and research assets
- workflow and tooling documentation

## Required durable artifacts

- `spec.md`: define scope, non-goals, and acceptance criteria for workflow
  hardening
- `plan.md`: sequence the first implementation slice and validation path
- `tasks.md`: keep work ordering explicit across docs, prompts, and tests
- `quickstart.md`: document how to inspect and validate the workflow surface
- `research.md`: record which external agentic patterns are being adopted now
- `contracts/`: add one planning-first note for the API/client boundary hardening
  and promote the accepted version-lineage deltas into the canonical contract
  owner files

## Research inputs

- Akita's clean-code-for-agents rules for small, explicit, grepable code and
  instructions
- Addy Osmani's orchestration guidance for WIP limits, plan approval, and
  review gates
- Symphony's repo-owned `WORKFLOW.md` concept
- Paperclip's governance and audit posture, used only as inspiration here

## Contracts and canonical owner files

- contracts affected: `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`,
  `bioelectro-copilot-contracts/contracts/research/evidence-pack.schema.yaml`
- canonical owner files: `AGENTS.md`, `.github/copilot-instructions.md`,
  `WORKFLOW.md`, `docs/internal-feature-workflow.md`,
  `docs/repository-authority-map.md`, `docs/runtime-tooling-setup.md`,
  `packages/domain-contracts/src/schemas.ts`,
  `packages/domain-contracts/src/research-schemas.ts`
- planning-only notes under `specs/<feature>/contracts/`: add one API/client
  boundary note that cites the canonical owner files instead of creating a
  second source of truth

## Data model or boundary changes

No domain semantic change is intended here. The runtime and contract boundary
changes stay limited to workflow policy, CI install policy, shared client-side
schema parsing, and additive runtime-version lineage fields where the runtime
already owns the source versions.

## Implementation steps

1. Add `WORKFLOW.md` and the 023 feature pack so the new workflow policy is
   durable and reviewable.
2. Promote missing root prompts for test generation and diff review.
3. Normalize active prompt bindings to the validated file-stem agent
   identifiers.
4. Add a runtime test and package script to fail on missing workflow assets or
   invalid prompt bindings.
5. Tighten the GitHub Actions workflow to use `pnpm install --frozen-lockfile`
   once the stale lockfile entry is repaired.
6. Replace blind JSON casts in the web client with schema-backed parsing for the
   request and response surfaces that already exist in
   `@metrev/domain-contracts`.
7. Extend runtime version lineage across evaluation evidence usage records,
   workspace snapshots, research evidence packs, and decision-ingestion
   previews where the runtime already has the version source.
8. Update the workflow, contract, and feature-pack docs so the final state is
   coherent and reviewable.

## Validation strategy

- unit: `pnpm run test:workflow-assets`
- focused client boundary: `pnpm exec vitest run tests/web-ui/api-client.test.ts`
- focused lineage/runtime: `pnpm exec vitest run tests/runtime/research-intelligence.test.ts tests/runtime/research-api.test.ts tests/runtime/api.test.ts`
- reproducibility: `pnpm install --frozen-lockfile`
- docs/contracts: confirm the authority map and the canonical contract files
  reflect the adopted workflow and lineage surface

## Critique summary

The main risks are creating a second workflow story, validating only half of the
API boundary, or fabricating runtime-version lineage for assets that do not yet
own a trustworthy version source. The implementation should therefore update the
authority map and workflow docs with `WORKFLOW.md`, use the existing shared
schemas instead of new client-only validators, and restrict runtime-version
lineage to evaluation and research assets that already have concrete version
owners.

## Refined final plan

Keep the hardening pragmatic: workflow contract, prompt coverage, CI
reproducibility, schema-backed client parsing, and additive version lineage now.
Defer OpenAPI generation and broader source-artifact version lineage until those
surfaces have a clearer owner and stronger review pressure.

## Rollback / safety

If the prompt-loader assumption proves wrong, revert the binding changes while
keeping the runtime test and feature pack to document the intended policy. If
client schema parsing exposes unexpected runtime drift, keep the focused tests,
repair the specific payload surface, and avoid falling back to unchecked casts.
