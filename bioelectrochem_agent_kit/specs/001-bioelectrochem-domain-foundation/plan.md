# Implementation Plan — Bioelectrochemical Domain Foundation

## Summary
Create the first operational domain package for bioelectrochemical decision support: ontology, intake, rules, reporting templates, and validation scaffolding.

## Affected areas
- domain/ontology
- domain/rules
- domain/cases
- reports/templates
- evals
- .github/agents
- .github/prompts
- .github/skills

## Architecture / design notes
The product is treated as a decision-support platform, not as a simulator-first architecture.
Deterministic and typed reasoning should precede narrative synthesis.

## Contracts affected
- case input contract
- evidence typing contract
- report output contract
- rule validation contract

## Data model changes
Introduce canonical stack blocks, evidence types, normalization fields, scoring dimensions, and golden reference cases.

## Implementation steps
1. define stack taxonomy and property dictionary
2. define case template and default logic
3. define compatibility rules and scoring model
4. define report templates and eval checklists
5. add specialized agents, prompts, and skills
6. add starter golden cases and review alignment

## Test strategy
- unit: schema-level checks and rule behavior checks
- integration: case-to-report dry runs
- e2e/manual: sample agent-driven workflow using a golden case

## Rollback / safety
If needed, revert to simpler report generation, but keep the ontology and intake schema as the minimum stable core.
