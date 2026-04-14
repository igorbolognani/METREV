# Implementation Plan — Runtime Monorepo Foundation

## Summary

Implement the METREV runtime stack as a `pnpm + turbo` monorepo that adapts the existing domain and contract layers and is governed by a root workflow for planning, verification, critique, and learning.

## Source-of-truth files

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `stack.md`
- `bioelectrochem_agent_kit/domain/`
- `bioelectro-copilot-contracts/contracts/`

## Affected areas

- root workflow files under `.github/`
- `adr/`
- `specs/`
- runtime monorepo files at the repository root
- `apps/`
- `packages/`
- `tests/`
- `.vscode/`
- Docker and GitHub Actions config

## Design notes

- `AGENTS.md` remains the semantic policy anchor.
- `.github/copilot-instructions.md` acts as a detailed operational companion.
- Runtime code adapts domain and contract files rather than redefining them.
- Deterministic reasoning precedes LLM narrative.

## Required durable artifacts

- `spec.md`: required to state the runtime scope and MVP gates
- `plan.md`: required to map implementation to the repository truth model
- `tasks.md`: required to keep scaffold, runtime delivery, and validation visible
- `quickstart.md`: required to make the local analyst and developer flow executable
- `research.md`: required because runtime architecture, Auth.js behavior, Prisma behavior, and local observability decisions were version-sensitive
- `contracts/`: required only for planning notes that explain boundary deltas without becoming canonical schemas

## Research inputs

- `specs/002-runtime-monorepo-foundation/research.md`

## Contracts and canonical owner files

- contracts affected: `bioelectro-copilot-contracts/contracts/input_schema.yaml`, `bioelectro-copilot-contracts/contracts/output_contract.yaml`
- canonical owner files: `bioelectro-copilot-contracts/contracts/`, `bioelectrochem_agent_kit/domain/`
- planning-only notes under `specs/<feature>/contracts/`: use them for mappings and proposed deltas only, then promote approved changes into the canonical layers

## Data model or boundary changes

The runtime foundation introduces executable auth, persistence, and observability boundaries, but it must do so by adapting the domain kit and hardened contracts package instead of creating a third vocabulary.

## Implementation steps

1. activate root workflow assets and maintained runtime docs
2. scaffold the monorepo foundation
3. implement shared runtime contract and normalization package
4. implement deterministic rule engine and audit helpers
5. implement Fastify API routes and runtime validation
6. implement Next.js UI flow
7. add Prisma, Docker, CI, and tooling setup docs

## Test strategy

- preserve existing contract drift checks
- add Vitest coverage for runtime packages and API routes
- add integration tests for normalization and case evaluation flow
- add smoke checks for web app and API build targets

## Critique summary

The main implementation risk was letting the runtime scaffold outrun the repository's domain and contract truth layers. A second risk was hiding auth, persistence, or observability decisions in runtime-only code without maintained docs and repeatable setup.

## Refined final plan

Anchor the runtime in the existing truth layers, capture the local MVP gates in maintained specs and quickstarts, and keep any unresolved Phase 3 data-model delta explicit through planning notes instead of ad hoc runtime drift.
