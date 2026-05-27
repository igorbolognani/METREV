# Glossary

## Purpose

This glossary explains common METREV terms in direct technical language. It is
explanatory only and does not redefine the repository authority model.

## Terms

### Adapter

Code that translates between layers without changing the underlying meaning.
For example, runtime code can adapt domain or contract assets into TypeScript
objects used by an API or rule engine.

### Agent

An AI-assisted workflow role or mode used to perform a bounded kind of work,
such as planning, review, validation, or orchestration. In this repo, root-owned
agents live under the active workflow surface, not under nested reference kits.

### API boundary

The point where data enters or leaves an API in a defined shape. API boundaries
need validation so callers and servers agree on the same structure and meaning.

### Authority surface

A file or directory that the repo treats as an active source for decisions.
Examples include `AGENTS.md`, `docs/repository-authority-map.md`,
`bioelectrochem_agent_kit/domain/`, and
`bioelectro-copilot-contracts/contracts/`.

### Contract

A formal data shape used for validation, serialization, storage, or future API
behavior. In METREV, hardened contracts live in
`bioelectro-copilot-contracts/contracts/`.

### Default

A value used when input is missing or incomplete. In this product, defaults must
be visible and auditable; they should not be hidden inside recommendations.

### Domain

The scientific and product meaning of the system. In METREV, domain meaning
starts in `bioelectrochem_agent_kit/domain/`. It includes vocabulary, evidence
semantics, defaults behavior, uncertainty, compatibility, and scoring intent.

### Evidence

Information used to support a decision. In METREV, evidence should be typed,
traceable, and separated from unsupported claims. Supplier claims are not the
same thing as validated scientific evidence unless the system explicitly types
and validates them that way.

### Loader

Runtime code that reads canonical assets from disk or another source and makes
them available to the TypeScript application. In this repo,
`packages/domain-contracts/src/loaders.ts` is part of the executed runtime
loading surface.

### Prompt

A reusable instruction template for a human or agentic workflow. Root-owned
prompts live under `.github/prompts/` and should follow the active workflow
rules.

### Reconciliation

The process of checking that two layers still agree. In METREV, reconciliation
usually means checking that domain meaning, contract shapes, and runtime loading
do not drift apart.

### Reference-only

Useful background material that is not active authority. A reference-only file
can inform understanding, but it should not override active owner files.

### Runtime

The code that actually runs: web UI, API server, worker, shared packages,
database integration, rule engine, auth, audit, telemetry, and tests around
them. Runtime code lives primarily in `apps/` and `packages/`.

### Scoring

The prioritization or ranking logic used to compare options or determine the
strength of a recommendation. Scoring should follow deterministic validation,
compatibility checks, benchmark or evidence comparison, and uncertainty framing.

### Serialization

Turning structured data into a form that can be stored, sent over an API, or
written to a file. Serialization should follow contract shapes so meaning is not
lost.

### Skill

A reusable bundle of agentic know-how for a repeated task. Skills should be
created only when repeated work is clear enough to justify a maintained asset.

### Spec

A durable feature planning folder under `specs/NNN-feature-slug/`. Medium and
large changes use specs to capture intent, plan, tasks, quickstart, and optional
research or contract notes.

### Uncertainty

The explicit limits of what the system knows. METREV should lower confidence
when evidence is sparse, conflicting, missing, or based on defaults, and should
recommend the next measurements or tests that would reduce uncertainty.

### Validation

Checking that data, code, workflow, or behavior matches expected rules. Examples
include Zod validation, contract tests, Vitest, Playwright, linting, build, and
workflow semantic checks.

### Workflow

The agreed process for moving from request to verified change. In this repo,
`WORKFLOW.md` is the operational contract for agentic execution.
