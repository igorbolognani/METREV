# Bioelectrochemical Project Contract Module for `AGENTS.md`

Paste the following block into your root `AGENTS.md`.

```md
## Bioelectrochemical decision-support contract

This repository contains a bioelectrochemical decision-support product focused on MFC, MEC, and broader MET use cases.

### Product scope
The product is not a multiphysics simulator-first system.
Its primary job is to help users:
- diagnose current stacks
- compare technically plausible alternatives
- prioritize improvements
- shortlist suppliers and materials
- justify decisions with evidence, rules, and explicit uncertainty

### Mandatory output posture
Do not answer as if the system has absolute truth.
Every recommendation must separate:
- observed input
- normalized input
- defaults used
- missing data
- evidence used
- rule-based inference
- prioritization logic
- unresolved uncertainty
- next tests or data to collect

### Output contract
For any non-trivial stack evaluation, the preferred output shape is:
1. current stack diagnosis
2. prioritized improvement options
3. impact map (cost, risk, maturity, evidence strength, dependencies)
4. supplier/material/architecture shortlist
5. phased roadmap

### Domain modeling rules
The stack should be modeled at minimum across these areas:
- reactor architecture
- anode
- cathode
- membrane or separator
- current collection / interconnect / sealing
- balance of plant
- sensors / analytics
- operational biology
- technoeconomics

Treat technoeconomics as a cross-cutting decision layer, not as a single hardware component.

### Evidence rules
Do not mix these categories:
- literature evidence
- internal benchmark
- supplier claim
- engineering assumption
- heuristic inference

Every substantial recommendation should point to an evidence category and a rule or rationale category.

### Default and missing-data policy
Missing parameters may be normalized with defaults only when necessary.
Whenever a default is used:
- record it explicitly
- lower confidence accordingly
- avoid pseudo-precision
- recommend what to measure next

### Inference rules
Prefer this order:
1. deterministic validation
2. plausible-range checks
3. compatibility heuristics
4. benchmark comparison
5. multicriteria scoring
6. sensitivity analysis
7. narrative synthesis

Use generative language only after the structured reasoning artifacts exist.

### Safety against hallucination
Do not invent:
- supplier capabilities
- material properties
- operating data
- performance benchmarks
- TRL level
- compatibility
- payback claims

If evidence is sparse or conflicting, say so clearly.

### Repository workflow expectations
When changing ontology, rules, or report contracts:
- update the relevant spec
- update ADR if the architecture changed
- update evals/checklists if validation rules changed
- keep golden cases aligned with the new logic

### Review expectations
Before concluding medium or large domain changes, check:
- ontology consistency
- naming consistency
- unit consistency
- evidence typing
- defaults and missing-data transparency
- scoring rationale
- confidence labeling
- report contract alignment

### MCP guidance
Treat MCP as an augmentation layer.
Do not let MCP-derived content bypass normalization, evidence typing, or rule validation.
Read-only MCP enrichment is preferred unless there is a strong reason otherwise.
```
