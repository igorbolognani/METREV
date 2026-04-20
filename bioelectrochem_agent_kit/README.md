# Bioelectrochemical Agent Kit for AI-Assisted Development

Repository note: in METREV, only `bioelectrochem_agent_kit/domain/` is a canonical source-of-truth surface. The nested `.github/` assets and guidance docs in this kit remain antecedent reference material unless they are intentionally promoted into the workspace root.

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
