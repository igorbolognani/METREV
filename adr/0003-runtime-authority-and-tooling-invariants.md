# ADR 0003: Runtime Authority And Tooling Invariants

## Status

Accepted

## Context

The runtime monorepo is no longer a thin scaffold. It now executes a real authenticated analyst flow across normalization, deterministic rules, optional simulation enrichment, persistence, audit capture, and a richer analyst workbench.

That growth exposed three repository-level ambiguities:

- domain semantics remain authoritative in `bioelectrochem_agent_kit/domain/`, but the executed rule path is loaded primarily from `bioelectro-copilot-contracts/contracts/`
- `stack.md` grew into a broad architecture brief that is no longer a reliable statement of the shipped runtime surface
- Prisma 7 in this repository now keeps datasource URL configuration in `packages/database/prisma.config.ts`, leaves `packages/database/prisma/schema.prisma` as a provider-only datasource definition, and relies on the generated TypeScript client plus the `PrismaPg` adapter-backed runtime entrypoint in `packages/database/src/prisma-client.ts`

The repository also contains assets that look operational but are not currently part of the executed runtime path, including relation notes and report templates under the hardened contracts tree.

## Decision

The runtime keeps a single explicit authority split:

- semantic source of truth remains `bioelectrochem_agent_kit/domain/`
- validation and serialization boundary remains `bioelectro-copilot-contracts/contracts/`
- executed deterministic rule authority remains contract-first in the current runtime
- runtime adapters in `apps/` and `packages/` must document and test that split rather than hide it

The runtime also adopts these invariants:

- `packages/domain-contracts/src/loaders.ts` remains the canonical loader surface for runtime-owned access to contract and domain files
- the domain case template remains runtime-loaded, but compatibility, diagnostics, improvements, scoring, sensitivity, defaults, and output sections remain contract-loaded
- `stack.md` is retained only as a non-authoritative reference brief; `README.md`, ADRs, maintained specs, and executable tests define the live runtime surface
- `bioelectrochem_agent_kit/domain/ontology/component-graph.yml`, `bioelectro-copilot-contracts/contracts/ontology/relations.yaml`, and the contract report templates are future-facing references until a runtime consumer is added and validated
- Prisma stays on the currently validated Prisma 7 posture in this repository: `prisma.config.ts` owns datasource URL configuration, `schema.prisma` keeps the provider-only datasource plus repository-owned generator configuration, `packages/database/src/prisma-client.ts` owns the generated-client-plus-adapter runtime path, and migration commands continue to run through `packages/database/scripts/run-prisma-with-direct-url.mjs`
- `.vscode/mcp.json` remains GitHub-only by default; Context7 and Serena stay documented as optional local integrations in `.vscode/mcp.template.jsonc`

## Consequences

### Positive

- The executed runtime path becomes reviewable instead of implied.
- Docs, tests, and workflow assets can point to one explicit authority model.
- Prisma runtime and migration behavior stay aligned with the currently validated Prisma 7 command path.
- Future work can promote currently ambiguous assets only when a real consumer exists.

### Negative

- Some repository assets remain intentionally non-executed even though they are still valuable for planning and future report generation.
- The runtime continues to carry an explicit semantic-to-contract reconciliation burden.
- Editor diagnostics or stale internal notes for Prisma must be treated as suspect until they agree with command-backed validation for the pinned repository version.

## Guardrails

- Do not silently move executed rule ownership from contract files to domain files without an explicit canonical change.
- Do not re-promote `stack.md` to live authority unless it is revalidated against code, docs, and tests.
- Do not activate optional MCP integrations by default when they require machine-local secrets or tooling not guaranteed by the repository.
- Do not treat relation notes or report templates as runtime-backed product behavior until a validated consumer exists.
