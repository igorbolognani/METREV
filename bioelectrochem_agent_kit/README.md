# METREV scientific domain foundation

METREV focuses on microbial fuel cells (MFC), microbial electrolysis cells (MEC), wastewater management and treatment, and electrochemical biosensors. Biosensors may operate as standalone instruments or be integrated with an MFC or MEC.

Only `bioelectrochem_agent_kit/domain/` is the canonical source for domain vocabulary and scientific rules. Runtime schemas and application code implement those contracts. Older `.github/` assets and feature packs remain historical context unless promoted explicitly.

The executable foundation includes a source-referenced, lumped 0D MFC/MEC model and standalone/integrated amperometric biosensor response. The model is a decision-support baseline, not a spatially resolved or independently validated multiphysics solver.

---

## Practical conclusion

The active development direction is:

1. define wastewater feed, reactor geometry, materials, biology, electrochemistry, operation, and sensors as one explicit case
2. require units and source/value metadata for model parameters; do not invent missing measurements
3. run the coupled MFC/MEC 0D model or return an actionable insufficient-data result
4. model standalone and integrated amperometric biosensors with a separate power budget
5. compare model results with reviewed, context-matched evidence while keeping the two distinct
6. expose assumptions, data gaps, model limits, and next tests explicitly
7. generate decision explanations only after structured model and evidence results exist

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
    historical/
      case-001 through case-005 (unvalidated illustrative records)

The historical records are not active presets, model calibration data, or source-backed wastewater cases. Use spec 038's empty MFC/MEC/wastewater and biosensor intake templates for current work.

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

| Agent                    | Core mission                                               | Main outputs                                                | Failure it prevents                                   |
| ------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Stack Ontologist         | Define the stack ontology and stable domain language       | taxonomy, component graph, property dictionary              | semantic drift and inconsistent naming                |
| Client Intake Normalizer | Convert messy client input into auditable structured cases | normalized case files, defaults, missing-data flags         | false precision from incomplete data                  |
| Evidence Curator         | Curate literature, supplier data, and benchmark evidence   | evidence objects, benchmark records, source typing          | mixing marketing claims with evidence                 |
| Inference Engine         | Turn structured input and evidence into comparable options | rules, scores, compatibility checks, sensitivity outputs    | magical recommendations with no logic trail           |
| Decision Prioritizer     | Convert options into phased decisions                      | diagnosis, ranked improvements, impact map, roadmap         | technically plausible but commercially useless output |
| Validation Sentinel      | Audit provenance, uncertainty, and consistency             | validation comments, blocked conclusions, confidence checks | overclaiming and silent contradiction                 |

---

## Ontology and rule subdomains

The following subdomains should live inside the ontology and rule base instead of becoming separate top-level agents.

| Subdomain              | Ontology role                                                                 | Rule role                                                                    | Why it should stay as a subdomain                                  |
| ---------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Reactor architecture   | Defines configuration family, chambering, hydraulic logic, operating mode     | drives compatibility, scale-up penalties, residence-time implications        | it is part of the stack model, not a standalone workflow           |
| Anode                  | Defines substrate, geometry, surface, conductivity, biofilm support           | influences startup, current generation, fouling, colonization fit            | tightly coupled to biology and influent context                    |
| Cathode                | Defines substrate, catalyst family, collector interface, gas/liquid handling  | influences reduction/evolution feasibility, selectivity, durability, cost    | must be evaluated within full target-use context                   |
| Membrane / separator   | Defines separation approach, ionic pathway, crossover risk                    | influences resistance, selectivity, purity needs, fouling constraints        | behaves as a compatibility layer across the stack                  |
| Biology                | Defines inoculum, biofilm regime, expected biological tolerance and fragility | influences startup, shock resilience, substrate utilization, adaptation time | should affect many rules, not act as a separate orchestration unit |
| Balance of plant (BOP) | Defines pumps, valves, recirculation, gas handling, dosing, control           | influences operability, maintenance, safety, retrofit feasibility            | often dominates pilot failure without being the “core reactor”     |
| Sensors / analytics    | Defines sensing, electrochemical diagnostics, telemetry, alarms               | influences evidence quality, validation, monitoring readiness                | needed across diagnosis, not as a silo                             |
| Economics              | Cross-cutting decision layer, not a physical block                            | affects priority, payback, replacement timing, supplier fit, TCO             | it is a scoring and decision dimension across all blocks           |

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

| Phase   | MCP role                      | Recommendation                                                                                          |
| ------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| Phase 0 | GitHub-only workflow support  | keep simple and stable                                                                                  |
| Phase 1 | Evidence retrieval assistance | add read-only evidence and supplier lookup endpoints                                                    |
| Phase 2 | Internal structured services  | add project-owned MCP servers for evidence index, benchmark access, and supplier catalog lookup         |
| Phase 3 | Operational integration       | connect LIMS, pilot logs, historian, or internal benchmarking systems if the product reaches that stage |

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
