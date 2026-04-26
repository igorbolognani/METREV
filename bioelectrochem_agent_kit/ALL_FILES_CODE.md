# Reference Only: Generated File Code Listing

This file is a generated repository export retained for historical and search convenience only.

Do not treat it as an active source-of-truth surface for implementation, validation, workflow, or repository authority decisions.

Use these surfaces instead:

- `docs/repository-authority-map.md`
- `AGENTS.md`
- `.github/copilot-instructions.md`
- `bioelectrochem_agent_kit/domain/`
- `bioelectro-copilot-contracts/contracts/`
- `apps/`, `packages/`, and `tests/`

# Complete File Code Listing

## `.github/agents/client-intake-normalizer.agent.md`
```md
---
name: Client Intake Normalizer
description: Convert messy stack descriptions into structured, auditable case inputs with explicit defaults and gaps.
argument-hint: Provide a client stack description, intake draft, or raw parameter set to normalize.
user-invocable: true
disable-model-invocation: false
---

# Client Intake Normalizer

You are responsible for turning real-world, messy, incomplete client input into structured case data that the rest of the system can trust.

## Core mission

Convert raw case descriptions into:
- normalized parameters
- explicit units
- explicit defaults
- explicit missing data
- explicit assumptions
- confidence-aware intake records

## In scope

You may:
- map raw descriptions into the client case schema
- standardize units
- infer likely parameter categories when the wording is messy
- flag ambiguous or conflicting entries
- mark defaults used
- propose next measurements to reduce uncertainty

## Out of scope

Do not:
- hide missing data
- silently invent values
- claim that a normalized case is “complete” when critical parameters are absent
- turn weak intake information into high-confidence recommendations

## Mandatory output fields

For non-trivial cases, always include:
- `raw_input_summary`
- `normalized_case`
- `defaults_used`
- `missing_data`
- `assumptions`
- `confidence_notes`
- `recommended_next_measurements`

## Normalization rules

- Preserve the raw meaning before transforming it.
- Keep both the original phrasing and the normalized field where useful.
- Never mix qualitative priorities with measured operational parameters.
- Use canonical ontology names from the domain files.
- Use cross-field consistency checks when possible.
- If a field is critical but absent, reduce confidence and mark the downstream impact.

## Key references

- [client case template](../../domain/cases/templates/client-case-template.yml)
- [defaults](../../domain/rules/defaults.yml)
- [plausible ranges](../../domain/rules/plausible-ranges.yml)
- [property dictionary](../../domain/ontology/property-dictionary.yml)

## Output style

Respond in this order:
1. intake objective
2. normalized case summary
3. defaults used
4. missing or ambiguous data
5. impact of missing data on downstream inference
6. measurements or questions that would most reduce uncertainty

## Quality bar

A strong intake normalization result:
- is structured
- is transparent
- is unit-consistent
- avoids pseudo-precision
- makes downstream rule evaluation safer

```

## `.github/agents/decision-prioritizer.agent.md`
```md
---
name: Decision Prioritizer
description: Turn structured findings into a ranked technical roadmap, impact map, and supplier-aware decision package.
argument-hint: Provide the inferred options or stack findings to prioritize and turn into a roadmap.
user-invocable: true
disable-model-invocation: false
---

# Decision Prioritizer

You translate structured analysis into a consulting-grade decision package.

## Core mission

Produce decision outputs that help a real client act:
- diagnose the current stack
- prioritize improvement options
- frame impact and dependencies
- shortlist plausible supplier/material paths
- organize implementation in phases

## In scope

You may:
- group options by effort and timing
- distinguish quick wins from structural changes
- assign implementation sequencing logic
- highlight blocking dependencies
- map options to supplier or material categories
- convert analysis into decision-ready narratives

## Out of scope

Do not:
- hide trade-offs
- flatten all options into a single “best” path
- recommend implementation of changes that depend on missing prerequisites
- overstate expected benefits beyond the structured findings

## Mandatory output structure

1. current stack diagnosis
2. prioritized improvement options
3. impact map
4. supplier/material/architecture shortlist
5. phased roadmap

## Prioritization logic

Always consider:
- technical fit
- expected impact
- implementation effort
- operational risk
- evidence strength
- maturity and readiness
- dependency order
- supplier feasibility
- economic plausibility

## Key references

- [scoring model](../../domain/rules/scoring-model.yml)
- [consulting report template](../../reports/templates/consulting-report-template.md)
- [diagnostic summary template](../../reports/templates/diagnostic-summary-template.md)

## Output style

Respond in this order:
1. decision objective
2. ranked options
3. why the top option is first
4. what should happen now, next, and later
5. unresolved uncertainties
6. final roadmap package

## Quality bar

A strong prioritization result:
- helps a client choose
- preserves nuance
- exposes dependencies
- remains faithful to the evidence and rules

```

## `.github/agents/evidence-curator.agent.md`
```md
---
name: Evidence Curator
description: Curate literature, benchmark, supplier, and internal evidence into typed, traceable decision inputs.
argument-hint: Describe the evidence set, supplier notes, benchmark material, or knowledge gap to curate.
user-invocable: true
disable-model-invocation: false
---

# Evidence Curator

You are responsible for the factual layer of the platform.

Your job is not to sound convincing.
Your job is to classify and structure evidence so other agents can reason safely.

## Core mission

Curate and normalize:
- literature evidence
- supplier claims
- internal benchmark data
- engineering assumptions
- applicability limits
- evidence strength and uncertainty

## In scope

You may:
- classify evidence by type
- summarize applicability conditions
- separate quantitative from qualitative claims
- define evidence confidence notes
- map evidence to stack blocks and subdomains
- highlight where evidence is sparse, indirect, or non-transferable

## Out of scope

Do not:
- convert supplier language into fact without labeling it
- treat one benchmark as universal truth
- ignore operating context
- flatten evidence types into one bucket

## Evidence categories

Use at minimum:
- `literature_evidence`
- `internal_benchmark`
- `supplier_claim`
- `engineering_assumption`
- `derived_heuristic`

## Evidence quality rules

- Record what the evidence applies to.
- Record what the evidence does **not** establish.
- Prefer explicit operating conditions over vague high-level claims.
- Treat context shifts carefully: lab != pilot != field deployment.
- When in doubt, lower confidence and widen the uncertainty note.

## Key references

- [evidence schema](../../domain/ontology/evidence-schema.yml)
- [supplier catalog template](../../domain/suppliers/supplier-catalog.template.yml)
- [supplier normalization](../../domain/suppliers/supplier-normalization.yml)
- [stack taxonomy](../../domain/ontology/stack-taxonomy.yml)

## Output style

Respond in this order:
1. evidence scope
2. evidence items grouped by type
3. applicability notes
4. contradictions or weak spots
5. implications for inference
6. what should be measured or validated next

## Quality bar

A strong curation result:
- preserves provenance
- preserves applicability limits
- distinguishes fact from claim
- gives the inference agent something structured to consume

```

## `.github/agents/inference-engine.agent.md`
```md
---
name: Inference Engine
description: Build deterministic reasoning, compatibility checks, scoring logic, and sensitivity analysis for stack decisions.
argument-hint: Describe the case evaluation, rule logic, or comparison scenario to infer.
user-invocable: true
disable-model-invocation: false
---

# Inference Engine

You are the structured reasoning core of the platform.

You operate **after** ontology, intake normalization, and evidence typing are available.

## Core mission

Convert structured inputs into decision-ready outputs by using:
- deterministic validation
- plausible-range checks
- compatibility heuristics
- benchmark comparison
- multicriteria scoring
- sensitivity analysis

## In scope

You may:
- write or refine rules
- compare candidate stack changes
- assign scores using declared dimensions and weights
- flag technical conflicts
- estimate impact direction when evidence supports directional reasoning
- identify high-sensitivity inputs

## Out of scope

Do not:
- replace explicit rules with pure narrative judgment
- produce single-number certainty where the evidence is weak
- ignore defaults_used or missing_data
- recommend changes without rule and evidence traceability

## Required reasoning order

1. validate required inputs
2. check ranges and category consistency
3. apply compatibility rules
4. compare against relevant benchmarks
5. score candidate paths
6. run sensitivity framing
7. emit structured rationale before prose

## Mandatory output fields

For non-trivial evaluations, include:
- `validation_flags`
- `compatibility_findings`
- `candidate_options`
- `scoring_breakdown`
- `sensitivity_notes`
- `confidence_level`
- `next_tests_recommended`

## Key references

- [compatibility rules](../../domain/rules/compatibility-rules.yml)
- [plausible ranges](../../domain/rules/plausible-ranges.yml)
- [scoring model](../../domain/rules/scoring-model.yml)
- [sensitivity presets](../../domain/rules/sensitivity-presets.yml)

## Output style

Respond in this order:
1. evaluation objective
2. validation findings
3. candidate paths
4. scoring rationale
5. sensitivity and uncertainty
6. recommended next tests
7. structured conclusion

## Quality bar

A strong inference output:
- is rule-backed
- is traceable
- is uncertainty-aware
- can be audited by a reviewer

```

## `.github/agents/stack-ontologist.agent.md`
```md
---
name: Stack Ontologist
description: Define and maintain the stable ontology for MFC, MEC, and broader MET stack evaluation.
argument-hint: Describe the stack concept, ontology problem, or schema change to model.
user-invocable: true
disable-model-invocation: false
---

# Stack Ontologist

You are responsible for the **domain contract** of this repository.

Your purpose is to turn bioelectrochemical knowledge into a stable, reusable, implementation-safe ontology that other agents can trust.

## Core mission

Define and maintain:
- stack blocks
- component types
- component relationships
- property names
- units and value semantics
- compatibility dimensions
- evidence categories
- decision-facing domain language

## In scope

You may:
- create or refine taxonomy files
- define canonical names
- define required and optional properties
- define relationship edges between components
- define typed evidence categories
- propose ontology-safe normalization fields
- propose changes to report contracts when domain structure changes

## Out of scope

Do not:
- produce final supplier recommendations
- claim performance from weak evidence
- collapse distinct concepts into vague categories for convenience
- optimize the codebase without preserving the domain contract

## Required thinking order

1. identify the decision problem
2. identify which domain entities must exist
3. define canonical names and aliases
4. define required properties and optional properties
5. define relationships between entities
6. define what other agents need from the ontology
7. update domain artifacts before narrative explanations

## Modeling rules

- Prefer stable names over clever names.
- Keep the ontology decision-oriented.
- Distinguish physical structure from operational context and cross-cutting evaluation layers.
- Treat technoeconomics as cross-cutting, not as a single hardware component.
- Keep biology explicit; do not hide it inside generic process language.
- Preserve a clear distinction between supplier metadata, literature evidence, and internal heuristics.
- Every term added to the ontology should be understandable by both an engineering agent and a report-writing agent.

## Mandatory artifacts to maintain

Primary:
- [stack-taxonomy](../../domain/ontology/stack-taxonomy.yml)
- [component-graph](../../domain/ontology/component-graph.yml)
- [property-dictionary](../../domain/ontology/property-dictionary.yml)
- [evidence-schema](../../domain/ontology/evidence-schema.yml)

Secondary when relevant:
- `specs/`
- `adr/`
- `reports/templates/`

## Output style

When proposing or updating ontology work, structure the response as:
1. objective
2. domain entities affected
3. changes to canonical naming
4. property implications
5. compatibility implications
6. downstream files that must be updated
7. risks if the change is accepted

## Quality bar

A strong ontology update:
- reduces ambiguity
- improves interoperability between agents
- makes case normalization easier
- makes rule writing safer
- makes reports more defensible

```

## `.github/agents/validation-sentinel.agent.md`
```md
---
name: Validation Sentinel
description: Audit provenance, defaults, uncertainty, contradictions, and output defensibility before conclusions are trusted.
argument-hint: Provide the draft output, rule change, or recommendation package to validate.
user-invocable: true
disable-model-invocation: false
---

# Validation Sentinel

You are the final domain safety layer before trust is granted.

## Core mission

Audit whether a result is:
- traceable
- coherent
- appropriately uncertain
- explicit about defaults and gaps
- aligned with the project contract

## In scope

You may:
- block unsupported conclusions
- lower confidence labels
- request missing traceability
- flag contradictions between evidence, rules, and narrative
- check report contract compliance
- point to missing tests or golden-case coverage

## Out of scope

Do not:
- rewrite the entire solution unless necessary
- silently approve a weak result because the prose sounds polished
- accept strong conclusions with weak or ambiguous support

## Validation checklist

Always check:
- evidence typing is explicit
- defaults used are visible
- missing data is visible
- confidence matches evidence strength
- rule-based claims are traceable
- supplier claims are not treated as established fact
- the report has all required sections
- next tests are recommended where uncertainty remains

## Key references

- [bioelectrochem output checklist](../../evals/bioelectrochem-output-checklist.md)
- [rule change checklist](../../evals/rule-change-checklist.md)
- [consulting report template](../../reports/templates/consulting-report-template.md)

## Output style

Respond in this order:
1. verdict
2. critical blockers
3. medium concerns
4. low-priority improvements
5. missing tests or validation
6. confidence adjustment if needed

## Quality bar

A strong validation pass:
- protects against hallucination
- protects against false precision
- protects against weak traceability
- improves downstream trust

```

## `.github/prompts/build-supplier-shortlist.prompt.md`
```md
---
name: build-supplier-shortlist
description: Build a supplier/material shortlist from decision constraints and evidence categories.
argument-hint: Provide the case constraints, target block, and evaluation criteria.
agent: agent
---

Build a supplier/material shortlist for the following case:

${input}

Requirements:
- organize the shortlist by target stack block or procurement need
- distinguish known evidence from supplier claims
- include fit notes, integration notes, and open questions
- avoid presenting the shortlist as a final procurement decision
- surface missing technical or commercial data needed before commitment

Return:
1. shortlist objective
2. shortlist grouped by category
3. fit rationale for each shortlisted path
4. missing vendor or technical information
5. procurement cautions
6. next validation steps

```

## `.github/prompts/compare-stack-alternatives.prompt.md`
```md
---
name: compare-stack-alternatives
description: Compare candidate material or architecture options for a bioelectrochemical stack.
argument-hint: Describe the current stack and the alternatives to compare.
agent: agent
---

Compare the following stack alternatives:

${input}

Requirements:
- use the project ontology and decision posture
- avoid presenting a single “best” answer without trade-offs
- compare technical fit, operational implications, evidence strength, and likely implementation complexity
- surface blockers, dependencies, and uncertainty
- keep narrative aligned with deterministic reasoning where possible

Return:
1. comparison objective
2. candidate options
3. strengths and weaknesses of each option
4. key trade-offs
5. preliminary ranking with rationale
6. uncertainties and tests needed

```

## `.github/prompts/critique-decision-output.prompt.md`
```md
---
name: critique-decision-output
description: Critique a draft decision output for provenance, uncertainty, and technical defensibility.
argument-hint: Provide the draft output or recommendation package to critique.
agent: agent
---

Critique the following decision output as a strict domain reviewer:

${input}

Focus on:
- missing provenance
- hidden defaults
- overclaiming
- weak causal logic
- contradictions between sections
- missing economic or dependency framing
- missing next-test recommendations

Return:
1. critical blockers
2. medium concerns
3. lower-priority improvements
4. missing evidence or tests
5. final verdict: approve | approve with fixes | rework needed

```

## `.github/prompts/design-case-eval-tests.prompt.md`
```md
---
name: design-case-eval-tests
description: Design tests and golden cases for domain logic, scoring, and validation behavior.
argument-hint: Describe the rule, case type, or output behavior to validate.
agent: agent
---

Design tests for the following bioelectrochemical evaluation behavior:

${input}

Requirements:
- prioritize behavior-level validation
- include valid path, invalid path, and at least one edge case
- include confidence and uncertainty behavior where relevant
- include default-handling and missing-data behavior where relevant
- propose golden cases when useful

Return:
1. test objective
2. cases to cover
3. expected outputs or assertions
4. golden-case candidates
5. remaining blind spots

```

## `.github/prompts/generate-inference-rules.prompt.md`
```md
---
name: generate-inference-rules
description: Draft or refine deterministic rules, scoring logic, and sensitivity framing for the domain engine.
argument-hint: Describe the rule target, comparison logic, or scenario to encode.
agent: agent
---

Design or refine deterministic inference logic for the following domain problem:

${input}

Requirements:
- start from structured inputs and expected outputs
- prefer interpretable rules over opaque heuristics
- define inputs, thresholds or categories, logic steps, outputs, and caveats
- identify where benchmark comparison is required
- identify where sensitivity analysis should be applied
- note which cases should reduce confidence

Return:
1. rule objective
2. required inputs
3. decision logic
4. scoring or prioritization implications
5. sensitivity implications
6. known limitations
7. recommended tests or golden cases

```

## `.github/prompts/intake-client-stack.prompt.md`
```md
---
name: intake-client-stack
description: Normalize a raw client stack description into a structured case object.
argument-hint: Paste the raw client case, meeting notes, or stack description.
agent: agent
---

Normalize the following raw client stack input into the project case schema:

${input}

Requirements:
- preserve the original meaning
- use canonical domain names where possible
- identify defaults used
- identify missing or ambiguous fields
- state how missing information affects downstream inference
- recommend the smallest set of next measurements or questions that would most reduce uncertainty

Return:
1. raw input summary
2. normalized case
3. defaults used
4. missing data
5. assumptions
6. confidence notes
7. recommended next measurements

```

## `.github/prompts/map-stack-and-data-gaps.prompt.md`
```md
---
name: map-stack-and-data-gaps
description: Map a case across the stack blocks and expose the most decision-relevant data gaps.
argument-hint: Provide a normalized case object or stack summary.
agent: agent
---

Map the following case across the defined stack blocks and identify the highest-impact data gaps:

${input}

Requirements:
- organize findings by stack block
- include architecture, anode, cathode, membrane/separator, electrical interconnect/sealing, BOP, sensing/analytics, biology, and technoeconomics
- distinguish between absent data and low-confidence data
- explain which missing fields are merely useful and which are decision-critical

Return:
1. stack map by block
2. known data by block
3. unknown or ambiguous data by block
4. decision-critical gaps
5. recommended next measurements

```

## `.github/prompts/write-consulting-report.prompt.md`
```md
---
name: write-consulting-report
description: Turn structured evaluation outputs into a consulting-style report with transparent uncertainty.
argument-hint: Provide structured case findings or a draft decision package.
agent: agent
---

Write a consulting-style technical report from the following structured findings:

${input}

Requirements:
- follow the repository report contract
- preserve explicit uncertainty
- keep facts, assumptions, and recommendations distinguishable
- avoid exaggerated certainty
- keep the tone technical, decision-oriented, and audit-friendly

Return the report with these sections:
1. executive framing
2. current stack diagnosis
3. prioritized improvement options
4. impact map
5. supplier/material/architecture shortlist
6. phased roadmap
7. confidence, gaps, and next tests

```

## `.github/skills/author-consulting-output/SKILL.md`
```md
---
name: author-consulting-output
description: Use this skill when turning structured technical findings into a report, memo, or decision package for clients or internal teams.
---

# Author Consulting Output

Use this skill when a structured case evaluation needs to become a readable, credible, action-oriented deliverable.

## Goals

- preserve technical rigor
- preserve explicit uncertainty
- keep sections decision-oriented
- avoid vague or inflated language
- maintain alignment with the report contract

## Required structure

1. executive framing
2. current stack diagnosis
3. prioritized improvement options
4. impact map
5. supplier/material/architecture shortlist
6. phased roadmap
7. confidence, gaps, and next tests

## Required workflow

1. read the structured findings
2. verify that fact, assumption, and inference are separable
3. organize content by actionability
4. preserve dependencies and blockers
5. keep confidence and next-test language explicit
6. use:
   - [consulting report template](../../../reports/templates/consulting-report-template.md)
   - [diagnostic summary template](../../../reports/templates/diagnostic-summary-template.md)

## Guardrails

- do not overwrite uncertainty with fluent prose
- do not remove data-gap disclosures
- do not imply implementation certainty when evidence is partial

## Success criteria

A successful output helps a client understand what to do, why, and with how much confidence.

```

## `.github/skills/build-stack-ontology/SKILL.md`
```md
---
name: build-stack-ontology
description: Use this skill when defining or revising the ontology, canonical names, component relationships, or property schema for MFC, MEC, and MET stack evaluation.
---

# Build Stack Ontology

Use this skill when the task is about domain structure rather than code generation alone.

## Goals

- define stable stack blocks
- define canonical names and aliases
- define property semantics and required fields
- define relationships between components and cross-cutting layers
- keep the ontology decision-oriented and implementation-safe

## Required workflow

1. identify the decision problem the ontology must support
2. identify the entities and relationships required
3. update or propose updates to:
   - [stack-taxonomy](../../../domain/ontology/stack-taxonomy.yml)
   - [component-graph](../../../domain/ontology/component-graph.yml)
   - [property-dictionary](../../../domain/ontology/property-dictionary.yml)
   - [evidence-schema](../../../domain/ontology/evidence-schema.yml)
4. check downstream effects on:
   - intake schema
   - rules
   - report templates
5. recommend spec or ADR updates if the change is structural

## Guardrails

- do not collapse important distinctions into vague buckets
- do not treat economics as a hardware block
- do not hide biology inside generic process terms
- do not introduce terms that the rest of the pipeline cannot reuse consistently

## Success criteria

A successful result:
- improves naming consistency
- improves interoperability across files
- supports rule writing and report generation
- reduces ambiguity in future sessions

```

## `.github/skills/enforce-provenance/SKILL.md`
```md
---
name: enforce-provenance
description: Use this skill when validating whether outputs, rules, and recommendations are traceable, confidence-appropriate, and explicit about assumptions.
---

# Enforce Provenance

Use this skill whenever a result is close to being trusted, shared, or encoded into rules.

## Goals

- verify provenance
- verify explicit defaults and missing-data notes
- verify confidence labels
- verify separation of fact, claim, assumption, and inference
- prevent polished hallucination

## Required workflow

1. inspect the output structure
2. check evidence typing
3. check defaults_used and missing_data
4. check whether confidence matches support strength
5. check whether next tests are recommended when uncertainty remains
6. compare against:
   - [bioelectrochem output checklist](../../../evals/bioelectrochem-output-checklist.md)
   - [rule change checklist](../../../evals/rule-change-checklist.md)

## Guardrails

- block unsupported certainty
- block untyped supplier claims
- block hidden assumptions
- block recommendations that bypass deterministic reasoning where deterministic reasoning was expected

## Success criteria

A successful validation pass makes the output more defensible, not merely more verbose.

```

## `.github/skills/evidence-curation/SKILL.md`
```md
---
name: evidence-curation
description: Use this skill when organizing literature findings, supplier claims, internal benchmark notes, and applicability limits into typed evidence.
---

# Evidence Curation

Use this skill to create a trustworthy evidence layer for the platform.

## Goals

- classify evidence by type
- preserve provenance and applicability conditions
- separate supplier claims from stronger evidence categories
- prepare evidence for deterministic or semi-deterministic reasoning

## Required workflow

1. identify each evidence item
2. classify it using the evidence schema
3. record applicability conditions
4. record uncertainty or weakness
5. map the evidence to relevant stack blocks and subdomains
6. note contradictions or context-transfer problems
7. update or propose updates to:
   - [evidence schema](../../../domain/ontology/evidence-schema.yml)
   - [supplier catalog template](../../../domain/suppliers/supplier-catalog.template.yml)
   - [supplier normalization](../../../domain/suppliers/supplier-normalization.yml)

## Evidence categories

Use at minimum:
- literature_evidence
- internal_benchmark
- supplier_claim
- engineering_assumption
- derived_heuristic

## Guardrails

- do not flatten all evidence into one confidence bucket
- do not treat one benchmark as universal
- do not strip away operating context

## Success criteria

A successful result gives the inference layer structured, typed, and applicability-aware evidence.

```

## `.github/skills/intake-normalization/SKILL.md`
```md
---
name: intake-normalization
description: Use this skill when converting raw client descriptions into normalized, explicit, and uncertainty-aware case records.
---

# Intake Normalization

Use this skill when the system receives:
- meeting notes
- pilot descriptions
- stack summaries
- partial technical questionnaires
- procurement notes that imply technical constraints

## Goals

- normalize client input into the case schema
- preserve the meaning of raw input
- expose defaults, gaps, and assumptions
- produce confidence-aware case records

## Required workflow

1. read the raw input
2. map terms to canonical ontology names
3. normalize units
4. identify missing, ambiguous, or conflicting inputs
5. apply defaults only when necessary, using [defaults](../../../domain/rules/defaults.yml)
6. validate against [plausible ranges](../../../domain/rules/plausible-ranges.yml)
7. emit:
   - normalized case
   - defaults used
   - missing data
   - assumptions
   - recommended next measurements

## Key resources

- [client case template](../../../domain/cases/templates/client-case-template.yml)
- [property dictionary](../../../domain/ontology/property-dictionary.yml)
- [plausible ranges](../../../domain/rules/plausible-ranges.yml)

## Guardrails

- never hide missing data
- never silently invent values
- never present estimated values as measured values
- reduce confidence when critical parameters are absent

## Success criteria

A successful result is structured, auditable, and safe for downstream inference.

```

## `.github/skills/mcp-assisted-research/SKILL.md`
```md
---
name: mcp-assisted-research
description: Use this skill when MCP is used to retrieve structured external or internal context without bypassing ontology, evidence typing, or validation.
---

# MCP-Assisted Research

Use this skill when MCP tools are available and can reduce retrieval friction responsibly.

## Goals

- retrieve relevant context from approved MCP sources
- preserve provenance
- normalize retrieved content into internal schemas
- avoid letting MCP become unreviewed decision logic

## Required workflow

1. identify the research need
2. identify the approved MCP source
3. retrieve only the minimum useful context
4. classify the retrieved content:
   - evidence candidate
   - supplier metadata candidate
   - workflow context
   - implementation context
5. normalize the content into project structures
6. state what still requires human or rule-based validation

## Preferred early MCP uses

- GitHub implementation context
- internal evidence index lookup
- internal supplier metadata lookup

## Guardrails

- do not let MCP output directly set scores
- do not treat raw MCP output as final evidence
- do not bypass missing-data or confidence logic
- prefer read-only retrieval in early phases

## Success criteria

A successful MCP-assisted result reduces manual effort while preserving the project’s decision contract.

```

## `.github/skills/run-case-evaluation/SKILL.md`
```md
---
name: run-case-evaluation
description: Use this skill to execute the full case-evaluation pipeline from normalized case input to structured decision output.
---

# Run Case Evaluation

Use this skill when a client case needs a full decision-support pass.

## Pipeline

1. confirm the case is normalized
2. check defaults and missing-data exposure
3. identify candidate decision paths
4. apply compatibility logic
5. apply scoring logic
6. frame sensitivity and confidence
7. prepare structured output for reporting

## Required inputs

- normalized client case
- ontology files
- rules
- evidence objects
- supplier metadata when relevant

## Required outputs

- diagnosis
- prioritized options
- impact map
- shortlist
- phased roadmap
- confidence and next tests

## Key resources

- [client case template](../../../domain/cases/templates/client-case-template.yml)
- [compatibility rules](../../../domain/rules/compatibility-rules.yml)
- [scoring model](../../../domain/rules/scoring-model.yml)
- [sensitivity presets](../../../domain/rules/sensitivity-presets.yml)
- [consulting report template](../../../reports/templates/consulting-report-template.md)

## Guardrails

- do not skip validation
- do not rank options without rationale
- do not suppress sensitivity issues
- do not present a single best path when the case is materially under-specified

## Success criteria

A successful run is structured, ranked, uncertainty-aware, and directly usable for a consulting-style report.

```

## `.github/skills/supplier-mapping/SKILL.md`
```md
---
name: supplier-mapping
description: Use this skill when mapping stack needs to supplier categories, material pathways, and procurement-ready shortlist logic.
---

# Supplier Mapping

Use this skill when a case requires supplier-aware decision support.

## Goals

- connect technical needs to supplier categories
- preserve the difference between category fit and final procurement decision
- identify missing supplier metadata before commitment
- maintain a reusable supplier record structure

## Required workflow

1. identify the target stack block or procurement need
2. identify technical criteria and blocking constraints
3. map candidate supplier or material categories
4. distinguish evidence from supplier claims
5. highlight missing qualification data
6. update or reference:
   - [supplier catalog template](../../../domain/suppliers/supplier-catalog.template.yml)
   - [supplier normalization](../../../domain/suppliers/supplier-normalization.yml)

## Guardrails

- do not overstate commercial readiness
- do not assume supply continuity
- do not treat a shortlist as a final purchase recommendation

## Success criteria

A successful result narrows options responsibly and makes the next procurement or validation step clear.

```

## `.vscode/mcp.bioelectrochem.template.json`
```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp"
    },
    "evidence-index": {
      "type": "stdio",
      "command": "python",
      "args": [
        "${workspaceFolder}/tools/mcp/evidence_index_server.py"
      ],
      "sandboxEnabled": true,
      "env": {
        "EVIDENCE_DB_PATH": "${workspaceFolder}/data/evidence.db"
      }
    },
    "supplier-registry": {
      "type": "stdio",
      "command": "python",
      "args": [
        "${workspaceFolder}/tools/mcp/supplier_registry_server.py"
      ],
      "sandboxEnabled": true,
      "env": {
        "SUPPLIER_DB_PATH": "${workspaceFolder}/data/suppliers.db"
      }
    }
  },
  "inputs": [
    {
      "id": "internal-api-token",
      "type": "promptString",
      "description": "Token for future internal remote MCP services",
      "password": true
    }
  ]
}

```

## `README.md`
```md
# Bioelectrochemical Agent Kit for AI-Assisted Development

## Purpose

This kit adds a domain-specific bioelectrochemical decision-support layer to an existing GitHub Copilot Pro + VS Code repository that already contains:
- repository-wide instructions
- implementation instructions
- testing instructions
- documentation instructions
- planning, review, and test-generation prompts
- baseline planning/review agents
- spec, ADR, eval, and test scaffolding

This kit does **not** replace your existing repository constitution.
It extends it with a **bioelectrochemical operating layer** for MFC, MEC, and broader MET work.

The product scope assumed by this kit is:

> A technical decision-support and consulting platform that helps companies, system integrators, and bioelectrochemical technology teams diagnose current stacks, compare plausible alternatives, prioritize improvements, shortlist suppliers, and justify decisions with evidence, rules, and transparent uncertainty.

This kit is intentionally aligned with that scope.
It is **not** designed as a multiphysics simulator-first architecture.

---

## Practical conclusion

The correct development posture for this product is:

1. treat the system as an **auditable decision engine**
2. structure knowledge before generating recommendations
3. normalize client data before scoring alternatives
4. start with deterministic rules, ranges, compatibility checks, and sensitivity analysis
5. use the LLM mainly for explanation, synthesis, prioritization, and report generation
6. expose uncertainty, defaults, data gaps, and next tests explicitly
7. add MCP where it reduces external-research friction, not where it creates premature complexity

That is the central design principle behind every file in this kit.

---

## Recommended repository additions

```text
.github/
  agents/
    stack-ontologist.agent.md
    client-intake-normalizer.agent.md
    evidence-curator.agent.md
    inference-engine.agent.md
    decision-prioritizer.agent.md
    validation-sentinel.agent.md
  prompts/
    intake-client-stack.prompt.md
    map-stack-and-data-gaps.prompt.md
    compare-stack-alternatives.prompt.md
    generate-inference-rules.prompt.md
    build-supplier-shortlist.prompt.md
    write-consulting-report.prompt.md
    critique-decision-output.prompt.md
    design-case-eval-tests.prompt.md
  skills/
    build-stack-ontology/
      SKILL.md
    intake-normalization/
      SKILL.md
    evidence-curation/
      SKILL.md
    run-case-evaluation/
      SKILL.md
    enforce-provenance/
      SKILL.md
    supplier-mapping/
      SKILL.md
    author-consulting-output/
      SKILL.md
    mcp-assisted-research/
      SKILL.md

domain/
  ontology/
    stack-taxonomy.yml
    component-graph.yml
    property-dictionary.yml
    evidence-schema.yml
  rules/
    defaults.yml
    plausible-ranges.yml
    compatibility-rules.yml
    scoring-model.yml
    sensitivity-presets.yml
  suppliers/
    supplier-catalog.template.yml
    supplier-normalization.yml
  cases/
    templates/
      client-case-template.yml
    golden/
      case-001-high-strength-industrial-wastewater.yml
      case-002-digester-sidestream-nitrogen-recovery.yml

reports/
  templates/
    consulting-report-template.md
    diagnostic-summary-template.md

evals/
  bioelectrochem-output-checklist.md
  rule-change-checklist.md

specs/
  001-bioelectrochem-domain-foundation/
    spec.md
    plan.md
    tasks.md
    quickstart.md

adr/
  0001-bioelectrochem-decision-support-scope.md

docs/
  AGENTS.bioelectrochem.module.md
  mcp-integration-guidance.md
```

---

## Why these six agents

The platform should be decomposed around the **decision pipeline**, not around isolated electrochemical physics modules.

### Agent summary

| Agent | Core mission | Main outputs | Failure it prevents |
|---|---|---|---|
| Stack Ontologist | Define the stack ontology and stable domain language | taxonomy, component graph, property dictionary | semantic drift and inconsistent naming |
| Client Intake Normalizer | Convert messy client input into auditable structured cases | normalized case files, defaults, missing-data flags | false precision from incomplete data |
| Evidence Curator | Curate literature, supplier data, and benchmark evidence | evidence objects, benchmark records, source typing | mixing marketing claims with evidence |
| Inference Engine | Turn structured input and evidence into comparable options | rules, scores, compatibility checks, sensitivity outputs | magical recommendations with no logic trail |
| Decision Prioritizer | Convert options into phased decisions | diagnosis, ranked improvements, impact map, roadmap | technically plausible but commercially useless output |
| Validation Sentinel | Audit provenance, uncertainty, and consistency | validation comments, blocked conclusions, confidence checks | overclaiming and silent contradiction |

---

## Ontology and rule subdomains

The following subdomains should live inside the ontology and rule base instead of becoming separate top-level agents.

| Subdomain | Ontology role | Rule role | Why it should stay as a subdomain |
|---|---|---|---|
| Reactor architecture | Defines configuration family, chambering, hydraulic logic, operating mode | drives compatibility, scale-up penalties, residence-time implications | it is part of the stack model, not a standalone workflow |
| Anode | Defines substrate, geometry, surface, conductivity, biofilm support | influences startup, current generation, fouling, colonization fit | tightly coupled to biology and influent context |
| Cathode | Defines substrate, catalyst family, collector interface, gas/liquid handling | influences reduction/evolution feasibility, selectivity, durability, cost | must be evaluated within full target-use context |
| Membrane / separator | Defines separation approach, ionic pathway, crossover risk | influences resistance, selectivity, purity needs, fouling constraints | behaves as a compatibility layer across the stack |
| Biology | Defines inoculum, biofilm regime, expected biological tolerance and fragility | influences startup, shock resilience, substrate utilization, adaptation time | should affect many rules, not act as a separate orchestration unit |
| Balance of plant (BOP) | Defines pumps, valves, recirculation, gas handling, dosing, control | influences operability, maintenance, safety, retrofit feasibility | often dominates pilot failure without being the “core reactor” |
| Sensors / analytics | Defines sensing, electrochemical diagnostics, telemetry, alarms | influences evidence quality, validation, monitoring readiness | needed across diagnosis, not as a silo |
| Economics | Cross-cutting decision layer, not a physical block | affects priority, payback, replacement timing, supplier fit, TCO | it is a scoring and decision dimension across all blocks |

---

## Orchestration flow

The recommended flow is:

1. **Planner** (your existing repository agent)
2. **Stack Ontologist**
3. **Client Intake Normalizer**
4. **Evidence Curator**
5. **Inference Engine**
6. **Decision Prioritizer**
7. **Validation Sentinel**
8. **Reviewer** (your existing repository agent)

### Why this order matters

- The ontology must exist before cases are normalized.
- Cases must be normalized before evidence can be matched consistently.
- Evidence must be structured before rules can operate reliably.
- Rules must run before prioritization becomes meaningful.
- Validation must happen after a recommendation exists but before it is trusted.
- Review should happen after the domain pipeline has produced explicit artifacts.

---

## Product output shape

Every serious output from the system should converge to five blocks:

1. **Current stack diagnosis**
2. **Prioritized improvement options**
3. **Impact map**  
   including cost, risk, maturity, evidence strength, and dependencies
4. **Supplier and material/architecture shortlist**
5. **Phased roadmap**

These blocks are reflected in the report templates and prompt files in this kit.

---

## MCP position

This kit treats MCP as a **controlled augmentation layer**, not the center of the product.

### What MCP should do early
- connect GitHub context to planning, reviews, issues, and implementation workflow
- support controlled external evidence retrieval once schemas are stable
- support future internal evidence or supplier registries through well-scoped tools

### What MCP should not do early
- replace the internal ontology
- become the first source of truth for scientific judgment
- bypass deterministic rules
- inject uncontrolled live web content into scoring without normalization

### Recommended adoption phases

| Phase | MCP role | Recommendation |
|---|---|---|
| Phase 0 | GitHub-only workflow support | keep simple and stable |
| Phase 1 | Evidence retrieval assistance | add read-only evidence and supplier lookup endpoints |
| Phase 2 | Internal structured services | add project-owned MCP servers for evidence index, benchmark access, and supplier catalog lookup |
| Phase 3 | Operational integration | connect LIMS, pilot logs, historian, or internal benchmarking systems if the product reaches that stage |

See `docs/mcp-integration-guidance.md`.

---

## How to use this kit

### Start with these files first
1. `docs/AGENTS.bioelectrochem.module.md`
2. `.github/agents/stack-ontologist.agent.md`
3. `.github/agents/client-intake-normalizer.agent.md`
4. `domain/ontology/stack-taxonomy.yml`
5. `domain/cases/templates/client-case-template.yml`
6. `domain/rules/defaults.yml`
7. `domain/rules/scoring-model.yml`
8. `reports/templates/consulting-report-template.md`

### Then add
- evidence curation
- supplier normalization
- golden cases
- validation checklists
- MCP enrichment once the domain contract stabilizes

---

## Design guardrails

- Do not present supplier claims as evidence unless explicitly typed as supplier claims.
- Do not treat missing client parameters as neutral.
- Do not hide default assumptions.
- Do not output a single “best stack” without scenario framing.
- Do not couple narrative confidence to model fluency.
- Do not skip sensitivity analysis for sparse or estimated inputs.
- Do not let MCP or live retrieval bypass ontology validation.

---

## Final recommendation

The most reliable path is to build the product as a **decision-support platform with domain memory, explicit rules, and explainable outputs**, then selectively add richer retrieval and ML after the evidence model, ontology, and evaluation contracts are stable.

That is what this kit operationalizes.

```

## `adr/0001-bioelectrochem-decision-support-scope.md`
```md
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

```

## `docs/AGENTS.bioelectrochem.module.md`
```md
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

```

## `docs/mcp-integration-guidance.md`
```md
# MCP Integration Guidance for the Bioelectrochemical Decision Platform

## Purpose

This document defines how MCP should be introduced into the project without letting external tools destabilize the ontology, rules, or evidence quality.

The short version is:

- use MCP to reduce research and retrieval friction
- do not use MCP as a substitute for domain contracts
- keep early MCP use read-only
- only connect sources that map cleanly into the internal schemas

---

## Why MCP belongs here

The project will eventually benefit from structured access to:
- issue and implementation workflow context
- internal benchmark stores
- supplier catalogs
- document repositories
- pilot logs or historical datasets

However, these gains only matter after the system can:
- normalize case input
- type evidence correctly
- score alternatives deterministically
- expose uncertainty and gaps

If those foundations are not in place, MCP just increases the volume of unstructured input.

---

## Adoption phases

### Phase 0 — GitHub workflow support
Keep MCP focused on repository workflow:
- issues
- pull requests
- ADR/spec navigation
- implementation traceability

This phase is low risk and complements your existing AI-assisted development workflow.

### Phase 1 — Read-only evidence enrichment
Add read-only MCP services for:
- internal literature index
- benchmark lookup
- supplier record lookup

In this phase, MCP helps retrieve candidate evidence but does not decide.

### Phase 2 — Structured internal services
Add project-owned MCP servers that expose:
- normalized evidence records
- benchmark datasets
- supplier metadata
- case comparison resources

This phase is where MCP becomes strategically valuable because the system is consuming project-owned structures, not random external text.

### Phase 3 — Operational integration
Only after the platform matures should you consider:
- historian or pilot-log access
- LIMS-style measurements
- live monitoring metadata
- decision-support dashboards exposed through MCP resources or apps

---

## Early design rules

1. Prefer read-only MCP tools first.
2. Never bypass ontology validation.
3. Never bypass evidence typing.
4. Never let live retrieval directly set scores.
5. Treat MCP responses as candidate inputs to be normalized.
6. Keep a human-readable provenance trail.

---

## Recommended MCP categories

| MCP category | Use early? | Purpose |
|---|---|---|
| GitHub workflow | Yes | specs, ADRs, issues, PR context |
| Internal evidence index | Yes, when available | retrieve candidate evidence objects |
| Supplier registry | Yes, when available | shortlist and metadata lookup |
| Case benchmark service | Later | compare cases against structured benchmarks |
| Live plant data / historian | Much later | operational integration, not foundation work |
| Arbitrary live-web search via MCP | No | too noisy for early rule-driven decisions |

---

## Recommended `mcp.json` strategy

Your existing `.vscode/mcp.json` can stay minimal at first.
When you are ready, expand it in small steps.

Use:
- user inputs for secrets
- workspace variables where appropriate
- sandboxed stdio servers on Linux/macOS when local execution is needed
- separate internal services by role

Below is a **template example**, not a claim that these servers already exist.

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp"
    },
    "evidence-index": {
      "type": "stdio",
      "command": "python",
      "args": [
        "${workspaceFolder}/tools/mcp/evidence_index_server.py"
      ],
      "sandboxEnabled": true,
      "env": {
        "EVIDENCE_DB_PATH": "${workspaceFolder}/data/evidence.db"
      }
    },
    "supplier-registry": {
      "type": "stdio",
      "command": "python",
      "args": [
        "${workspaceFolder}/tools/mcp/supplier_registry_server.py"
      ],
      "sandboxEnabled": true,
      "env": {
        "SUPPLIER_DB_PATH": "${workspaceFolder}/data/suppliers.db"
      }
    }
  },
  "inputs": [
    {
      "id": "internal-api-token",
      "type": "promptString",
      "description": "Token for internal services when remote MCP endpoints are added",
      "password": true
    }
  ]
}
```

---

## Decision boundary

Introduce new MCP servers only when all three statements are true:

- the server maps to a stable internal use case
- the returned content can be normalized into current schemas
- the server reduces manual work without bypassing review and validation

If one of those is false, do not add the server yet.

---

## Recommended next implementation step

Keep only GitHub MCP active now.
Design the internal evidence and supplier schemas first.
When those schemas stabilize, build project-owned read-only MCP services around them.

```

## `domain/cases/golden/case-001-high-strength-industrial-wastewater.yml`
```yaml
case_id: GOLDEN-001
case_metadata:
  created_by: system
  created_at: "2026-04-11"
  case_status: golden_reference

business_context:
  client_type: industrial_wastewater_operator
  primary_objective: wastewater_treatment
  decision_horizon: near_term_pilot
  priorities:
    - reduce_treatment_cost
    - improve_operability
    - retrofit
  hard_constraints:
    - limited_infrastructure_changes
  local_energy_cost_note: local_energy_cost_not_yet_quantified
  capex_constraint_level: medium
  opex_sensitivity_level: high

technology_context:
  technology_family: microbial_fuel_cell
  architecture_family: modular_stack
  membrane_presence: unknown
  primary_target_output: treatment_performance

feed_and_operation:
  influent_type: variable high-strength industrial wastewater
  influent_cod_mg_per_l: 18000
  pH: 6.8
  temperature_c: 30
  conductivity_ms_per_cm: 8.5
  hydraulic_retention_time_h: 24
  flow_note: variable loading expected

stack_blocks:
  anode_biofilm_support:
    material_family: porous_carbon_monolith
    geometry_note: high surface area, serviceability uncertain
    surface_note: biofilm-supportive but fouling response unknown
  cathode_catalyst_support:
    material_family: oxygen_reduction_cathode
    catalyst_note: unspecified
    product_side_note: air-exposed approach assumed
  membrane_or_separator:
    family: unknown
    note: separator strategy not fully documented
  electrical_interconnect_and_sealing:
    current_collection_strategy: unspecified
    sealing_note: maintenance access uncertain
  balance_of_plant:
    bop_summary: recirculation and pumping present, cleaning strategy unclear
    maintenance_note: serviceability is a concern
  sensors_and_analytics:
    sensing_summary: minimal_visibility_assumed
    diagnostics_summary: no electrochemical diagnostics described
  operational_biology:
    biology_summary: biology_not_fully_characterized
    inoculum_note: mixed inoculum, limited long-run evidence
    startup_note: startup history not fully documented

supplier_context:
  current_suppliers: []
  preferred_suppliers: []
  excluded_suppliers: []
  supplier_preference_notes: none provided

normalization_status:
  defaults_used:
    - membrane_presence
    - sensing_summary
    - biology_summary
  missing_data:
    - separator_family
    - current_collection_strategy_details
    - detailed_monitoring_plan
  assumptions:
    - retrofit preference implies BOP/serviceability importance
  confidence_notes:
    - limited sensing reduces operational confidence
    - uncharacterized biology increases startup uncertainty
  recommended_next_measurements:
    - baseline voltage and current logging
    - cleaning and maintenance pathway definition
    - separator clarification

```

## `domain/cases/golden/case-002-digester-sidestream-nitrogen-recovery.yml`
```yaml
case_id: GOLDEN-002
case_metadata:
  created_by: system
  created_at: "2026-04-11"
  case_status: golden_reference

business_context:
  client_type: utility_or_digestion_operator
  primary_objective: nitrogen_recovery
  decision_horizon: pilot_to_scale_path
  priorities:
    - recovery_value
    - low_energy
    - phased_deployment
  hard_constraints:
    - product_quality_must_be_defensible
  local_energy_cost_note: relevant but not fully specified
  capex_constraint_level: medium
  opex_sensitivity_level: medium

technology_context:
  technology_family: microbial_electrolysis_cell
  architecture_family: dual_chamber
  membrane_presence: present
  primary_target_output: recoverable_nitrogen_stream

feed_and_operation:
  influent_type: digester sidestream concentrate
  influent_cod_mg_per_l: 2500
  pH: 8.2
  temperature_c: 32
  conductivity_ms_per_cm: 18
  hydraulic_retention_time_h: 12
  flow_note: controlled sidestream operation

stack_blocks:
  anode_biofilm_support:
    material_family: carbon_felt
    geometry_note: moderate surface area
    surface_note: startup expected to be manageable
  cathode_catalyst_support:
    material_family: hydrogen_evolution_cathode
    catalyst_note: material family not yet fixed
    product_side_note: recovery quality is critical
  membrane_or_separator:
    family: cation_exchange_membrane
    note: present but durability and fouling data are not yet complete
  electrical_interconnect_and_sealing:
    current_collection_strategy: defined_at_concept_level_only
    sealing_note: scale-up detail incomplete
  balance_of_plant:
    bop_summary: recirculation, gas handling, and dosing expected to be important
    maintenance_note: gas-side safety and serviceability should be designed early
  sensors_and_analytics:
    sensing_summary: moderate_visibility
    diagnostics_summary: partial process monitoring planned
  operational_biology:
    biology_summary: partially_characterized
    inoculum_note: startup plan exists but shock response data are limited
    startup_note: pilot data needed

supplier_context:
  current_suppliers: []
  preferred_suppliers: []
  excluded_suppliers: []
  supplier_preference_notes: avoid highly bespoke supply chains where possible

normalization_status:
  defaults_used: []
  missing_data:
    - cathode_material_exact_family
    - membrane_durability_validation
    - gas_handling_detail
  assumptions:
    - separator strategy is central to recovery credibility
  confidence_notes:
    - recovery-oriented ranking is likely sensitive to cathode and separator details
  recommended_next_measurements:
    - membrane fouling and durability validation
    - cathode comparison
    - gas-side purity and handling validation

```

## `domain/cases/templates/client-case-template.yml`
```yaml
case_id: CASE-PLACEHOLDER
case_metadata:
  created_by: ""
  created_at: ""
  case_status: intake_draft

business_context:
  client_type: ""
  primary_objective: wastewater_treatment
  decision_horizon: ""
  priorities: []
  hard_constraints: []
  local_energy_cost_note: ""
  capex_constraint_level: unknown
  opex_sensitivity_level: unknown

technology_context:
  technology_family: microbial_fuel_cell
  architecture_family: ""
  membrane_presence: unknown
  primary_target_output: ""

feed_and_operation:
  influent_type: ""
  influent_cod_mg_per_l: null
  pH: null
  temperature_c: null
  conductivity_ms_per_cm: null
  hydraulic_retention_time_h: null
  flow_note: ""

stack_blocks:
  anode_biofilm_support:
    material_family: ""
    geometry_note: ""
    surface_note: ""
  cathode_catalyst_support:
    material_family: ""
    catalyst_note: ""
    product_side_note: ""
  membrane_or_separator:
    family: ""
    note: ""
  electrical_interconnect_and_sealing:
    current_collection_strategy: ""
    sealing_note: ""
  balance_of_plant:
    bop_summary: ""
    maintenance_note: ""
  sensors_and_analytics:
    sensing_summary: ""
    diagnostics_summary: ""
  operational_biology:
    biology_summary: ""
    inoculum_note: ""
    startup_note: ""

supplier_context:
  current_suppliers: []
  preferred_suppliers: []
  excluded_suppliers: []
  supplier_preference_notes: ""

normalization_status:
  defaults_used: []
  missing_data: []
  assumptions: []
  confidence_notes: []
  recommended_next_measurements: []

```

## `domain/ontology/component-graph.yml`
```yaml
version: 0.1
relationships:
  - from: reactor_architecture
    to: anode_biofilm_support
    type: constrains
    rationale: Flow path, geometry, and residence behavior constrain viable anodic configurations.
  - from: reactor_architecture
    to: cathode_catalyst_support
    type: constrains
    rationale: Chambering, gas/liquid access, and product targets constrain cathodic strategy.
  - from: reactor_architecture
    to: membrane_or_separator
    type: conditions_need_for
    rationale: Configuration and target separation requirements influence membrane or separator choice.
  - from: membrane_or_separator
    to: cathode_catalyst_support
    type: affects
    rationale: Separator strategy influences crossover, resistance, purity, and cathode-side performance.
  - from: anode_biofilm_support
    to: operational_biology
    type: co_determines
    rationale: Surface, porosity, and chemistry influence colonization and long-term biological behavior.
  - from: balance_of_plant
    to: operational_biology
    type: conditions
    rationale: Flow, dosing, and hydraulic regime strongly influence biological stability.
  - from: balance_of_plant
    to: sensors_and_analytics
    type: integrates_with
    rationale: Auxiliary systems define controllability and observability.
  - from: electrical_interconnect_and_sealing
    to: anode_biofilm_support
    type: supports
    rationale: Contacts and assembly quality affect effective current collection.
  - from: electrical_interconnect_and_sealing
    to: cathode_catalyst_support
    type: supports
    rationale: Contact losses and sealing affect cathode-side robustness and maintenance.
  - from: sensors_and_analytics
    to: technoeconomics
    type: informs
    rationale: Better observability can improve validation quality, maintenance timing, and operational decisions.
  - from: evidence_and_provenance
    to: all_blocks
    type: qualifies
    rationale: Evidence quality determines how strongly block-level conclusions can be trusted.
  - from: risk_and_maturity
    to: technoeconomics
    type: modifies
    rationale: Higher risk or lower maturity alters economic plausibility and implementation timing.

block_to_decision_dimensions:
  reactor_architecture:
    - hydraulic_fit
    - scale_up_complexity
    - footprint_constraint
  anode_biofilm_support:
    - startup_behavior
    - fouling_risk
    - biofilm_support_quality
  cathode_catalyst_support:
    - target_reaction_fit
    - durability
    - product_selectivity_or_function_fit
  membrane_or_separator:
    - crossover_control
    - ionic_resistance
    - maintenance_burden
  electrical_interconnect_and_sealing:
    - ohmic_loss_risk
    - assembly_repeatability
    - serviceability
  balance_of_plant:
    - operability
    - maintenance_load
    - retrofit_feasibility
  sensors_and_analytics:
    - observability
    - validation_readiness
    - alarm_coverage
  operational_biology:
    - startup_time_risk
    - shock_resilience
    - biological_stability

```

## `domain/ontology/evidence-schema.yml`
```yaml
version: 0.1
evidence_record:
  required_fields:
    - evidence_id
    - evidence_type
    - title
    - summary
    - applicability_scope
    - strength_level
    - provenance_note
  optional_fields:
    - quantitative_metrics
    - operating_conditions
    - block_mapping
    - limitations
    - contradiction_notes
    - supplier_name
    - benchmark_context
    - tags

enums:
  evidence_type:
    - literature_evidence
    - internal_benchmark
    - supplier_claim
    - engineering_assumption
    - derived_heuristic
  strength_level:
    - weak
    - moderate
    - strong

guidance:
  literature_evidence:
    use_when: External scientific or technical literature is the primary source.
    caution: Applicability may be narrow and context transfer must be explicit.
  internal_benchmark:
    use_when: Project-owned measurement, historical case, or benchmark result is the source.
    caution: Do not over-generalize beyond matching context.
  supplier_claim:
    use_when: A vendor or supplier provided the claim directly.
    caution: Never present as established fact without validation or corroboration.
  engineering_assumption:
    use_when: A practical engineering assumption is needed to keep evaluation moving.
    caution: Must be visible in output and should reduce confidence when material.
  derived_heuristic:
    use_when: A reusable internal heuristic is inferred from accumulated evidence.
    caution: Must reference its supporting logic and applicability scope.

applicability_scope_fields:
  - technology_family
  - stack_block
  - influent_or_feed_context
  - operating_regime
  - scale_context
  - objective_context

provenance_requirements:
  - source_category
  - source_note
  - date_or_version_if_known
  - applicability_scope
  - limitations

```

## `domain/ontology/property-dictionary.yml`
```yaml
version: 0.1
properties:
  case_id:
    type: string
    description: Unique identifier for the case under evaluation.
  technology_family:
    type: enum
    allowed:
      - microbial_fuel_cell
      - microbial_electrolysis_cell
      - hybrid_or_other_met
    description: Primary technology family for the case.
  primary_objective:
    type: enum
    allowed:
      - wastewater_treatment
      - hydrogen_recovery
      - nitrogen_recovery
      - sensing
      - low_power_generation
      - biogas_synergy
      - other
    description: Main operational objective being purchased or optimized.
  influent_type:
    type: string
    description: Description of wastewater, sidestream, substrate, or relevant feed.
  influent_cod_mg_per_l:
    type: number
    units: mg/L
    description: Chemical oxygen demand if known.
  pH:
    type: number
    units: unitless
    description: Operating or influent pH.
  temperature_c:
    type: number
    units: C
    description: Relevant operating temperature.
  conductivity_ms_per_cm:
    type: number
    units: mS/cm
    description: Bulk conductivity when known.
  hydraulic_retention_time_h:
    type: number
    units: h
    description: Hydraulic retention time.
  membrane_presence:
    type: enum
    allowed:
      - present
      - absent
      - unknown
  architecture_family:
    type: string
    description: Canonical architecture designation from the taxonomy.
  anode_material_family:
    type: string
    description: Canonical anodic substrate or material family.
  cathode_material_family:
    type: string
    description: Canonical cathodic substrate or material family.
  separator_family:
    type: string
    description: Canonical separator or membrane family when present.
  current_collection_strategy:
    type: string
    description: Current collector and contact approach.
  bop_summary:
    type: string
    description: Short structured description of auxiliary process systems.
  sensing_summary:
    type: string
    description: Short structured description of monitoring and diagnostics capability.
  biology_summary:
    type: string
    description: Structured note on inoculum and biological operating strategy.
  local_energy_cost_note:
    type: string
    description: Local cost context relevant to decision framing.
  capex_constraint_level:
    type: enum
    allowed:
      - low
      - medium
      - high
      - unknown
  opex_sensitivity_level:
    type: enum
    allowed:
      - low
      - medium
      - high
      - unknown
  supplier_preference_notes:
    type: string
    description: Existing supplier constraints, preferences, or exclusions.
  priorities:
    type: list
    description: Ranked business or technical priorities.
  defaults_used:
    type: list
    description: List of fields populated through defaults or bounded assumptions.
  missing_data:
    type: list
    description: List of missing fields that materially affect inference or confidence.
  evidence_refs:
    type: list
    description: References to structured evidence records used in reasoning.
  rule_refs:
    type: list
    description: References to deterministic or scoring rules used in reasoning.
  confidence_level:
    type: enum
    allowed:
      - low
      - medium
      - high
    description: Confidence in the current conclusion, adjusted for evidence quality and missing data.

```

## `domain/ontology/stack-taxonomy.yml`
```yaml
version: 0.1
domain: bioelectrochemical-decision-support
scope:
  primary_technologies:
    - microbial_fuel_cell
    - microbial_electrolysis_cell
    - microbial_electrochemical_technology
  product_role: decision_support_and_consulting
  excluded_primary_scope:
    - first_principles_multiphysics_solver
    - real_time_closed_loop_plant_control

stack_blocks:
  reactor_architecture:
    description: Physical and functional configuration of the reactor system.
    example_subdomains:
      - single_chamber
      - dual_chamber
      - modular_stack
      - wetland_coupled_system
      - digester_coupled_system
      - batch_operation
      - continuous_operation
  anode_biofilm_support:
    description: Anodic substrate, geometry, and biofilm-supporting environment.
    example_subdomains:
      - carbon_felt
      - carbon_cloth
      - graphite_brush
      - porous_carbon_monolith
      - conductive_polymer_composite
      - surface_modification
  cathode_catalyst_support:
    description: Cathodic substrate, catalyst family, and product-side interface conditions.
    example_subdomains:
      - oxygen_reduction_cathode
      - hydrogen_evolution_cathode
      - abiotic_cathode
      - biocathode
      - catalytic_layer
      - gas_handling_interface
  membrane_or_separator:
    description: Ion transport and/or separation layer, including membrane-free strategies.
    example_subdomains:
      - cation_exchange_membrane
      - anion_exchange_membrane
      - porous_separator
      - membrane_free_strategy
      - anti_crossover_design
  electrical_interconnect_and_sealing:
    description: Current collection, interconnects, contacts, sealing, and assembly interfaces.
    example_subdomains:
      - current_collector
      - busbar_or_contact
      - gasket
      - sealing_strategy
      - anti_corrosion_interface
  balance_of_plant:
    description: Pumps, valves, dosing, recirculation, gas handling, and auxiliary process hardware.
    example_subdomains:
      - liquid_pumping
      - gas_management
      - recirculation_loop
      - dosing_and_conditioning
      - safety_and_venting
      - cleaning_or_maintenance_path
  sensors_and_analytics:
    description: Instrumentation, diagnostics, telemetry, and process monitoring.
    example_subdomains:
      - online_water_quality
      - electrochemical_diagnostics
      - voltage_current_logging
      - alarming
      - data_pipeline
      - laboratory_validation
  operational_biology:
    description: Inoculum, biofilm startup, microbial resilience, and biological operating regime.
    example_subdomains:
      - inoculum_strategy
      - startup_protocol
      - shock_response
      - substrate_utilization_profile
      - microbial_stability
      - contamination_or_competition_risk

cross_cutting_layers:
  technoeconomics:
    description: Cross-cutting layer for CAPEX, OPEX, TCO, replacement cycles, and decision economics.
  evidence_and_provenance:
    description: Cross-cutting layer for evidence typing, source strength, and applicability.
  risk_and_maturity:
    description: Cross-cutting layer for TRL, operational risk, scale-up risk, and implementation readiness.

decision_outputs:
  - current_stack_diagnosis
  - prioritized_improvement_options
  - impact_map
  - supplier_shortlist
  - phased_roadmap

```

## `domain/rules/compatibility-rules.yml`
```yaml
version: 0.1
rules:
  - id: arch_biofilm_fit_001
    title: High-fouling influent should penalize delicate or hard-to-clean architectures
    applies_when:
      influent_type_contains_any:
        - high solids
        - high fouling
        - variable industrial wastewater
    logic:
      penalize_dimensions:
        - narrow_hydraulic_path
        - hard_serviceability
      raise_flags:
        - maintenance_risk
        - operability_risk
    output_note: Consider architectures and BOP configurations that tolerate solids, shocks, and maintenance access.

  - id: mec_cathode_priority_001
    title: Hydrogen-oriented MEC objectives increase cathode-side criticality
    applies_when:
      technology_family: microbial_electrolysis_cell
      primary_objective: hydrogen_recovery
    logic:
      increase_weight_for:
        - target_reaction_fit
        - durability
        - gas_handling_readiness
        - crossover_control
    output_note: Cathode strategy, gas handling, and separator logic become priority design dimensions.

  - id: sensing_confidence_001
    title: Limited sensing reduces defensibility of strong operational conclusions
    applies_when:
      sensing_summary: minimal_visibility_assumed
    logic:
      confidence_cap: medium
      recommend_measurements:
        - baseline voltage/current logging
        - key water quality checks
        - startup trend monitoring
    output_note: Expand observability before making strong performance or stability claims.

  - id: biology_shock_001
    title: Uncharacterized biology increases startup and shock-response uncertainty
    applies_when:
      biology_summary: biology_not_fully_characterized
    logic:
      raise_flags:
        - startup_risk
        - biological_resilience_unknown
      recommend_measurements:
        - inoculum characterization
        - startup monitoring
        - shock-response observations
    output_note: Biological uncertainty should appear in both confidence notes and phased roadmap.

  - id: retrofit_bop_001
    title: Retrofit-style cases should emphasize BOP compatibility and serviceability
    applies_when:
      priorities_contains_any:
        - retrofit
        - low disruption
        - minimal infrastructure changes
    logic:
      increase_weight_for:
        - retrofit_feasibility
        - maintenance_load
        - integration_complexity
    output_note: Favor options that reduce installation and auxiliary-system friction.

  - id: missing_critical_inputs_001
    title: Critical missing fields prevent narrow conclusions
    applies_when:
      missing_data_contains_any:
        - technology_family
        - primary_objective
        - architecture_family
        - influent_type
    logic:
      confidence_cap: low
      suppress:
        - narrow_ranking_claims
        - specific_performance_claims
    output_note: The case is too under-specified for strong comparative conclusions.

```

## `domain/rules/defaults.yml`
```yaml
version: 0.1
policy:
  principle: Defaults are allowed to keep evaluation moving, but they must always remain visible and confidence-aware.
  mandatory_output_fields:
    - defaults_used
    - missing_data
    - assumptions
    - confidence_level
    - recommended_next_measurements

defaults:
  membrane_presence:
    default_value: unknown
    rationale: Absence of clear membrane information should not be collapsed into present or absent.
    confidence_penalty: medium
  capex_constraint_level:
    default_value: unknown
    rationale: Economic posture must be elicited or left explicit as unknown.
    confidence_penalty: medium
  opex_sensitivity_level:
    default_value: unknown
    rationale: Operational cost pressure is decision-critical but often under-specified early.
    confidence_penalty: medium
  sensing_summary:
    default_value: minimal_visibility_assumed
    rationale: Most early cases lack full monitoring detail; assume limited observability unless stated otherwise.
    confidence_penalty: medium
  biology_summary:
    default_value: biology_not_fully_characterized
    rationale: Biological detail is often missing early and should not be treated as stable.
    confidence_penalty: high

critical_missing_fields:
  - technology_family
  - primary_objective
  - architecture_family
  - influent_type
  - pH
  - temperature_c
  - hydraulic_retention_time_h

recommended_behavior:
  if_critical_missing_fields_present:
    - reduce confidence
    - widen uncertainty notes
    - recommend next measurements
    - avoid narrow quantitative claims

```

## `domain/rules/plausible-ranges.yml`
```yaml
version: 0.1
note: These are starter plausibility bands for validation and intake triage, not universal scientific truths.

ranges:
  pH:
    low_warning: 5.0
    high_warning: 9.5
    action: flag_for_review
  temperature_c:
    low_warning: 10
    high_warning: 45
    action: flag_for_review
  conductivity_ms_per_cm:
    low_warning: 0.5
    high_warning: 80
    action: flag_for_review
  hydraulic_retention_time_h:
    low_warning: 0.25
    high_warning: 240
    action: flag_for_review
  influent_cod_mg_per_l:
    low_warning: 50
    high_warning: 150000
    action: flag_for_review

cross_field_checks:
  - name: membrane_free_high_purity_conflict
    if:
      membrane_presence: absent
      primary_objective:
        any_of:
          - hydrogen_recovery
          - nitrogen_recovery
    then:
      flag: review_required
      rationale: Separation-free strategies may conflict with high-purity recovery goals depending on the architecture.
  - name: low_observability_high_confidence_conflict
    if:
      sensing_summary: minimal_visibility_assumed
    then:
      flag: confidence_cap_medium
      rationale: Limited instrumentation should cap confidence unless evidence is unusually strong.

```

## `domain/rules/scoring-model.yml`
```yaml
version: 0.1
scoring_model:
  objective: Compare candidate improvement paths in a transparent, auditable way.
  score_scale:
    min: 1
    max: 5
    meaning:
      1: poor_or_highly_misaligned
      3: acceptable_but_mixed
      5: strong_fit_for_current_case

dimensions:
  technical_fit:
    weight: 0.24
    description: Alignment with the case objective, operating regime, and stack context.
  operability:
    weight: 0.16
    description: Day-to-day control, maintainability, and tolerance to real-world disturbance.
  biological_robustness:
    weight: 0.12
    description: Expected resilience of biological behavior given the stated context.
  evidence_strength:
    weight: 0.12
    description: Confidence contribution from evidence quality and relevance.
  supplier_feasibility:
    weight: 0.10
    description: Practical plausibility of sourcing and integrating the option.
  implementation_effort:
    weight: 0.10
    description: Relative complexity and friction of implementing the option.
  economic_plausibility:
    weight: 0.10
    description: CAPEX/OPEX/TCO plausibility under the known economic constraints.
  dependency_readiness:
    weight: 0.06
    description: Whether prerequisite conditions are already in place.

ranking_policy:
  do_not_rank_as_clear_winner_when:
    - confidence_level == low
    - evidence_strength_average < 2.5
    - critical_missing_fields_present == true
  require_explanatory_notes_for:
    - any_score_below_3
    - any_dimension_weight_above_0.15
    - any option with high dependency burden

confidence_adjustment:
  high:
    conditions:
      - critical_missing_fields_present == false
      - defaults_used_count <= 1
      - evidence_quality_profile in [moderate, strong]
  medium:
    conditions:
      - some defaults_used
      - some missing_noncritical_data
  low:
    conditions:
      - critical_missing_fields_present == true
      - biology_or_sensing_is_under_characterized == true
      - evidence_is_sparse_or_supplier_claim_heavy == true

```

## `domain/rules/sensitivity-presets.yml`
```yaml
version: 0.1
presets:
  sparse_input_case:
    focus_inputs:
      - pH
      - temperature_c
      - conductivity_ms_per_cm
      - hydraulic_retention_time_h
      - biology_summary
    note: Use when many critical process parameters are missing or weakly characterized.
  recovery_goal_case:
    focus_inputs:
      - membrane_presence
      - cathode_material_family
      - gas_handling_readiness
      - separator_family
    note: Use when the client is purchasing recovery performance, especially product quality or separation value.
  retrofit_case:
    focus_inputs:
      - bop_summary
      - architecture_family
      - maintenance_access
      - supplier_preference_notes
    note: Use when implementation friction and compatibility with existing infrastructure are central.

required_output_behavior:
  - identify which inputs are most likely to flip the ranking
  - distinguish ranking-sensitive inputs from merely descriptive inputs
  - recommend next tests or data collection for top-sensitive unknowns

```

## `domain/suppliers/supplier-catalog.template.yml`
```yaml
version: 0.1
supplier_records:
  - supplier_id: SUPPLIER_PLACEHOLDER
    supplier_name: Supplier Placeholder
    category:
      - membrane_or_separator
      - cathode_material
      - sensing
    capability_summary: Short factual summary of what this supplier category provides.
    supported_stack_blocks:
      - membrane_or_separator
      - sensors_and_analytics
    evidence_profile:
      evidence_refs: []
      supplier_claim_refs: []
      internal_validation_refs: []
    integration_notes:
      technical_fit_notes: []
      known_constraints: []
      commercial_unknowns: []
    maturity_note: unknown
    shortlist_readiness:
      status: candidate_only
      missing_for_commitment:
        - pricing
        - lead_time
        - compatibility_validation

```

## `domain/suppliers/supplier-normalization.yml`
```yaml
version: 0.1
normalization_rules:
  supplier_name:
    guidance: Preserve official supplier name and add aliases only as secondary fields.
  category_mapping:
    allowed_categories:
      - reactor_architecture
      - anode_material
      - cathode_material
      - membrane_or_separator
      - current_collection_or_sealing
      - balance_of_plant
      - sensing_and_analytics
      - integration_services
  evidence_typing:
    guidance: Separate supplier-provided claims from literature and internal validation.
  shortlist_status:
    allowed_values:
      - excluded
      - candidate_only
      - shortlisted
      - validated_for_case
  commercial_fields:
    recommended:
      - pricing_model
      - lead_time
      - region_availability
      - support_model
      - customizability
  caution:
    - Do not promote a supplier to validated_for_case without case-specific fit evidence.

```

## `evals/bioelectrochem-output-checklist.md`
```md
# Bioelectrochemical Output Checklist

## Domain integrity
- [ ] stack blocks are addressed or explicitly marked unknown
- [ ] technoeconomics is treated as cross-cutting, not hidden
- [ ] biology is explicitly represented
- [ ] sensing / analytics is explicitly represented

## Traceability
- [ ] evidence categories are visible
- [ ] rule references or rationale categories are visible
- [ ] supplier claims are not presented as established fact

## Uncertainty handling
- [ ] defaults used are visible
- [ ] missing data are visible
- [ ] confidence label is present
- [ ] next tests or measurements are recommended where uncertainty remains

## Decision usefulness
- [ ] diagnosis is present
- [ ] prioritization is present
- [ ] impact map is present
- [ ] shortlist is present
- [ ] phased roadmap is present

## Writing quality
- [ ] factual statements are separated from assumptions
- [ ] trade-offs are visible
- [ ] language does not imply unjustified certainty

```

## `evals/rule-change-checklist.md`
```md
# Rule Change Checklist

Use this checklist whenever compatibility rules, scoring logic, or range logic changes.

## Before merge
- [ ] the rule objective is documented
- [ ] required inputs are explicit
- [ ] output implications are explicit
- [ ] confidence behavior is explicit
- [ ] missing-data behavior is explicit
- [ ] at least one valid-path test is defined
- [ ] at least one edge-case test is defined
- [ ] a golden-case impact review was considered

## After review
- [ ] report templates still align with the new logic
- [ ] ontology terms used by the rule still exist and are canonical
- [ ] downstream prompt files do not conflict with the new rule language

```

## `reports/templates/consulting-report-template.md`
```md
# Consulting Report — {{CASE_ID}}

## 1. Executive framing
- client objective:
- evaluation scope:
- current decision stage:
- confidence level:

## 2. Current stack diagnosis
### 2.1 Business and operating context
- primary objective:
- constraints:
- priorities:

### 2.2 Stack diagnosis by block
- reactor architecture:
- anode:
- cathode:
- membrane / separator:
- electrical interconnect / sealing:
- balance of plant:
- sensors / analytics:
- operational biology:
- technoeconomic posture:

### 2.3 Main weaknesses or blind spots
- ...
- ...

## 3. Prioritized improvement options
| Rank | Option | Why it matters | Main gain | Main risk | Evidence strength |
|---|---|---|---|---|---|

## 4. Impact map
| Option | Technical impact | Economic plausibility | Maturity / readiness | Dependencies | Confidence |
|---|---|---|---|---|---|

## 5. Supplier / material / architecture shortlist
| Category | Candidate path | Fit note | Missing information before commitment |
|---|---|---|---|

## 6. Phased roadmap
### Phase 1 — Immediate / low-regret actions
- ...

### Phase 2 — Validation and pilot strengthening
- ...

### Phase 3 — Structural changes or scale pathway
- ...

## 7. Confidence, gaps, and next tests
### Defaults used
- ...

### Missing data
- ...

### Recommended next measurements or tests
- ...

### Final note on uncertainty
- ...

```

## `reports/templates/diagnostic-summary-template.md`
```md
# Diagnostic Summary — {{CASE_ID}}

## Current objective
- ...

## Stack snapshot
- architecture:
- anode:
- cathode:
- separator:
- BOP:
- sensing:
- biology:
- economics:

## Top 3 risks
1.
2.
3.

## Top 3 opportunities
1.
2.
3.

## What is missing before stronger conclusions
- ...

## Most useful next measurements
- ...

```

## `specs/001-bioelectrochem-domain-foundation/plan.md`
```md
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

```

## `specs/001-bioelectrochem-domain-foundation/quickstart.md`
```md
# Quickstart Validation — Bioelectrochemical Domain Foundation

## Setup
1. Add the files from this kit to the repository.
2. Ensure VS Code customizations are enabled in the workspace.
3. Open the repository root so parent customization discovery works as intended.
4. Start with a golden case or a small real case.

## Happy path
1. Normalize `domain/cases/golden/case-001-high-strength-industrial-wastewater.yml`
2. Ask the system to map stack blocks and data gaps
3. Ask the system to compare improvement paths
4. Generate a consulting-style report
5. Validate the report with the domain checklist

## Failure path
1. Remove multiple critical fields from the case
2. Run evaluation again
3. Expected behavior:
   - confidence decreases
   - defaults and missing-data exposure increase
   - narrow recommendations are avoided
   - next measurements are recommended

## Edge case
1. Use the recovery-oriented golden case
2. Compare two cathode or separator pathways
3. Expected behavior:
   - cathode and separator dimensions become highly visible
   - dependence on gas-handling and purity logic is made explicit

```

## `specs/001-bioelectrochem-domain-foundation/spec.md`
```md
# Feature Specification — Bioelectrochemical Domain Foundation

## Objective
Establish the first stable domain layer for a bioelectrochemical decision-support platform focused on MFC, MEC, and broader MET cases.

## Why
Without a stable ontology, input schema, rule base, and report contract, later agent-driven development will drift semantically and produce inconsistent decisions.

## Primary users
- product developer
- domain-oriented engineering agents
- technical reviewer
- future client-facing reporting flows

## Scope
### In
- ontology files
- intake schema
- initial rules
- report templates
- validation checklists
- starter golden cases

### Out
- detailed live supplier integrations
- real-time plant control
- full machine-learning optimization
- full multiphysics simulation

## Functional requirements
1. The repository must represent the stack across stable domain blocks.
2. The system must normalize incomplete client cases explicitly.
3. The system must support rule-based comparison and prioritization.
4. The system must preserve provenance and uncertainty.
5. The system must support a five-block consulting-style output.

## Acceptance criteria
- [ ] ontology files exist and are coherent
- [ ] case template exists
- [ ] defaults and compatibility rules exist
- [ ] scoring model exists
- [ ] report template exists
- [ ] validation checklists exist
- [ ] at least two golden cases exist

## Risks / unknowns
- future supplier integration may require schema extensions
- evidence model may need refinement once real curated records accumulate

```

## `specs/001-bioelectrochem-domain-foundation/tasks.md`
```md
# Tasks — Bioelectrochemical Domain Foundation

- [ ] T1 Create ontology files
- [ ] T2 Create case template and defaults
- [ ] T3 Create compatibility and scoring files
- [ ] T4 Create report templates
- [ ] T5 Create validation checklists
- [ ] T6 Create six domain agents
- [ ] T7 Create prompt files
- [ ] T8 Create skills
- [ ] T9 Create golden cases
- [ ] T10 Review consistency across files

## Parallelizable
- [ ] P1 Draft agents and prompts in parallel
- [ ] P2 Draft report templates and eval checklists in parallel

## Validation
- [ ] ontology terms are consistent
- [ ] report contract is satisfied
- [ ] defaults and missing-data visibility are preserved
- [ ] no rule contradicts the case template

```
