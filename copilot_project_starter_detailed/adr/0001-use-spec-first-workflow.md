# ADR 0001 — Use a spec-first workflow for medium and large features

## Status
Accepted

## Context
AI-assisted development accelerates implementation, but without a stable planning and validation structure it can also accelerate drift, rework, and hidden risk.

## Decision
For medium and large changes, this repository will prefer a spec-first workflow:
spec -> plan -> tasks -> implement -> verify -> learn.

## Consequences
### Positive
- Better alignment between intent, implementation, and validation
- Easier onboarding for humans and agents
- Less chance of implementing vague requirements directly in code

### Negative
- Adds up-front documentation cost
- Can feel heavy for tiny bugfixes if applied without judgment

## Alternatives considered
- Ad hoc prompting with no durable spec artifacts
- Heavy process for every single change regardless of size
