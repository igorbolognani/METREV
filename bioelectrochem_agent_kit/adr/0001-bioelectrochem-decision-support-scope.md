# ADR 0001 — Treat the product as a decision-support platform, not a simulator-first system

## Status
Proposed

## Context
The domain includes complex bioelectrochemical systems such as MFC, MEC, and other MET configurations.
A naive decomposition could follow multiphysics simulation architecture.
However, the product’s actual JTBD is to help users diagnose stacks, compare alternatives, prioritize improvements, shortlist supplier pathways, and justify decisions with evidence and explicit uncertainty.

## Decision
The system will be architected first as a decision-support and consulting platform with:
- structured ontology
- explicit intake normalization
- typed evidence
- deterministic and semi-deterministic rules
- multicriteria prioritization
- consulting-style report generation

## Consequences
### Positive
- earlier product usefulness
- stronger auditability
- better alignment with real buyer and integrator decisions
- cleaner path for agent-driven development

### Negative
- less emphasis on detailed physical simulation in the initial architecture
- some future physics-heavy features may require additional modules later

## Alternatives considered
- simulator-first multiphysics architecture
- LLM-first freeform recommendation engine
