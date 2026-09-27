# METREV — MASTER EXECUTION TASK
## Technical Program Governance + Scientific Solver Architecture + Numerical Runtime + Full 2D→3D Product Integration

Repository:

`https://github.com/igorbolognani/METREV.git`

Clone command:

```bash
gh repo clone igorbolognani/METREV
```

Known baseline at creation of this task:

```text
branch: main
HEAD: dd4a9123960d96aacfec7ec3b4fba2e77377937c
merge: PR #43
title: feat(modeling): célula 1D acoplada e benchmark provisório rastreável
```

Do not assume this SHA is still HEAD when the task actually runs. Verify the live remote repository first.

---

# 0. META-PROMPTING AND EXECUTION BEHAVIOR

You are not being asked merely to answer a question, write a roadmap, or produce recommendations.

You are operating as:

- Chief Technical Officer;
- Technical Program Manager;
- Scientific Software Architect;
- Numerical Methods Lead;
- Bioelectrochemical Modeling Lead;
- Scientific Data and Evidence Architect;
- Product Integration Architect;
- Verification and Validation Lead;
- Repository Governance Architect.

Your objective is to inspect the actual METREV repository, improve its development/orchestration control plane, and then use that control plane to drive the complete program described below toward a functional 2D and subsequently 3D modeling architecture.

## Mandatory meta-prompting behavior

Before displaying any substantial conclusion or committing a major architectural change:

1. Build an internal draft of the proposed solution.
2. Critically evaluate that draft against:
   - the actual repository;
   - the current scientific model boundary;
   - the requested architecture;
   - numerical-method requirements;
   - evidence/provenance constraints;
   - product integration requirements;
   - all 40 implementation points below;
   - dependency ordering;
   - maintainability;
   - testability;
   - reproducibility;
   - the user's preference for a simple branch structure.
3. Identify internally:
   - missing dependencies;
   - contradictions;
   - duplicated architecture;
   - unsupported scientific claims;
   - premature implementation;
   - hidden coupling;
   - missing tests;
   - missing product integration;
   - missing persistence;
   - missing numerical verification;
   - failure to preserve provenance.
4. Refine the proposed implementation before acting.
5. Repeat this critique/refinement loop when a major architectural milestone is reached.

Do **not** expose hidden chain-of-thought or private internal reasoning.

If useful, final reports may contain a short section named:

`Self-audit and improvements applied`

This section should contain only concise, outcome-oriented observations such as:

- an initially planned coupling was changed because a prerequisite contract was missing;
- a maturity status was not promoted because experimental validation is absent;
- a design was generalized so 2D and 3D share one formulation.

Do not reveal internal reasoning traces.

---

# 1. PRIMARY EXECUTION RULE

Do not stop at planning.

Inspect.

Verify.

Implement.

Test.

Integrate.

Document.

Audit.

Only leave an item unimplemented when a real technical, scientific, environmental, access, resource, or evidence blocker exists.

When blocked, explicitly record:

```text
BLOCKED
Capability:
Reason:
Missing dependency:
Evidence required:
Next executable action:
```

Do not convert a blocker into fabricated physics, fabricated data, silent defaults, or an unjustified simplified model.

---

# 2. SOURCE OF TRUTH

Before making changes, inspect the complete current repository.

At minimum inspect:

```text
README.md
AGENTS.md
.github/
bioelectrochem_agent_kit/
bioelectro-copilot-contracts/
packages/
apps/
scripts/
tests/
docker-compose.yml
package.json
pnpm-workspace.yaml
Prisma schema/migrations
CI workflows
model catalogs
fidelity catalogs
solver implementations
research/evidence data
UI modeling workbench
SVG components
case runner
evaluation service
database repositories
LLM adapter
research worker
```

Search the repository for:

```text
2D
3D
1D
0D
PDE
mesh
geometry
spatial
field
porosity
tortuosity
diffusion
migration
convection
hydraulics
flow
potential
charge
Butler-Volmer
Monod
biofilm
membrane
Donnan
gas
hydrogen
thermal
stack
network
fidelity
not_implemented
insufficient_data
future_sidecar
simulation
artifact
validation
calibration
comparison
```

Do not infer absence from a single search.

Determine actual runtime consumers.

Distinguish:

```text
documented
declared in ontology
declared in catalog
implemented
tested
integrated
persisted
available through API
available through case runner
available through UI
numerically verified
experimentally compared
independently validated
```

These statuses are not interchangeable.

---

# 3. CURRENT SCIENTIFIC AND TECHNICAL BASELINE

The current repository contains a substantial product/runtime foundation.

The executable primary reactor model remains:

```text
coupled-0d-dae-v1
```

Its current scientific boundary is approximately:

- lumped 0D;
- isothermal;
- MFC/MEC;
- continuous mixed-flow and closed-batch regimes;
- soluble COD;
- electroactive biomass;
- cathode oxygen for MFC;
- anode/cathode pH;
- fixed-step RK4 for differential states;
- algebraic current closure;
- Butler–Volmer;
- ohmic resistance;
- external-load boundary for MFC;
- applied-voltage boundary for MEC;
- deterministic one-at-a-time sensitivity where uncertainty is supplied.

It is not independently calibrated as a transferable predictive engine.

A complete input does not establish predictive site accuracy.

Standalone/development model components currently include approximately:

```text
simulateGattiBiofilm()
solvePorousAnode1d()
solveMembraneIon1d()
solveCoupledCell1d()
simulateMechanisticCase()
```

There is also:

```text
runConfiguredElectrochemicalModel()
```

which currently dispatches principally between:

```text
coupled-0d-dae-v1
coupled-cell-1d-restricted-v1
```

The restricted 1D coupled cell currently remains development/API oriented rather than fully integrated into the persisted case runner.

Research/fidelity catalogs already reference higher-dimensional directions including approximately:

```text
biofilm-1d-direct-transfer-research-v1
biofilm-2d-electrode-research-v1
cell-3d-multiphysics-research-v1
stack-network-macro-research-v1
porous-electrode-micro-3d
nano-informed catalyst/interface concepts
```

Do not confuse catalog presence with executable functionality.

---

# 4. CENTRAL ARCHITECTURAL INTENT

The target METREV architecture is **not**:

```text
user chooses Solver A
user chooses Solver B
user chooses Solver C
```

The target is:

```text
Stack Configuration
        │
        ▼
Physics / Phenomena Resolver
        │
        ├─ biological kinetics
        ├─ reaction
        ├─ species transport
        ├─ ionic transport
        ├─ electronic transport
        ├─ membrane
        ├─ cathode
        ├─ circuit
        ├─ hydraulics
        ├─ gas
        ├─ thermal
        └─ losses
        │
        ▼
Domain / Equation Graph
        │
        ├─ 0D
        ├─ 1D
        ├─ 2D
        └─ 3D
        │
        ▼
Unified Configurable Numerical Runtime
        │
        ▼
Conservation
Convergence
Verification
Sensitivity
        │
        ▼
Simulation Result Contract
        │
        ▼
Persistence / Artifacts
        │
        ▼
API / Product
        │
        ▼
UI / SVG / Spatial Viewer / Reports / Decision Engine
```

Individual formulations such as:

- Gatti biofilm;
- porous anode;
- membrane ion transport;
- cathode kinetics;
- hydrodynamics;
- charge transport;
- biofilm growth;
- circuit closure;

must increasingly become **composable physics modules**, not disconnected end-user solvers.

The final engine should respond to the actual stack configuration and requested fidelity.

---

# 5. NON-NEGOTIABLE SCIENTIFIC RULES

Never invent scientific inputs.

Every scientific value must preserve, as applicable:

```text
value
unit
source_kind
source_reference
uncertainty
source locator
study/case conditions
```

Keep distinct:

```text
measured
literature
default
assumption
test_fixture
modeled
development observation
calibration observation
independent validation observation
```

No silent downgrade of model fidelity is permitted.

If a 3D run lacks inputs:

```text
insufficient_data
```

If the requested physics is not implemented:

```text
not_implemented
```

Do not silently run 0D instead.

Numerical convergence does not equal experimental validation.

Agreement against a development/calibration dataset does not equal independent validation.

A literature citation supporting a governing equation does not validate the METREV implementation.

A DOI does not automatically make a parameter transferable.

LLMs must never assign scientific acceptance automatically.

---

# 6. FIRST MAJOR TASK — REBUILD THE ORCHESTRATION / CONTROL PLANE

Before beginning major 2D/3D solver implementation, transform the repository documentation and AI instructions from passive documentation into an active development control plane.

The goal is that ChatGPT Work, Codex, GitHub Copilot, Devin, or another capable coding agent entering this repository can determine:

```text
WHERE ARE WE?
WHAT EXISTS?
WHAT DOES NOT EXIST?
WHAT IS NEXT?
WHAT DEPENDS ON WHAT?
WHO SHOULD WORK ON IT?
WHICH SCIENTIFIC AUTHORITY APPLIES?
WHICH CONTRACTS MUST CHANGE?
WHAT TESTS ARE REQUIRED?
WHAT PROVES COMPLETION?
CAN THIS CLAIM BE CALLED VALIDATED?
CAN THIS BE MERGED?
```

without reconstructing all project history manually.

---

# 7. TARGET CONTROL-PLANE STRUCTURE

Implement or refine approximately the following architecture, adapting names only where repository constraints make a superior structure clearly preferable:

```text
METREV/
│
├── README.md
├── AGENTS.md
│
├── governance/
│   ├── PROJECT_STATE.yaml
│   ├── ROADMAP.yaml
│   ├── CAPABILITY_MATRIX.yaml
│   ├── ACCEPTANCE_GATES.yaml
│   ├── DEPENDENCY_GRAPH.yaml
│   ├── SCIENTIFIC_MATURITY.yaml
│   └── RISK_REGISTER.yaml
│
├── docs/
│   ├── architecture/
│   │   ├── SYSTEM_ARCHITECTURE.md
│   │   ├── SOLVER_RUNTIME.md
│   │   ├── PHYSICS_COMPOSITION.md
│   │   ├── SPATIAL_DATA_MODEL.md
│   │   ├── SIMULATION_JOBS.md
│   │   └── MULTISCALE_ARCHITECTURE.md
│   │
│   ├── numerics/
│   │   ├── GOVERNING_EQUATIONS.md
│   │   ├── DISCRETIZATION.md
│   │   ├── COUPLING_STRATEGY.md
│   │   ├── BOUNDARY_CONDITIONS.md
│   │   ├── VERIFICATION_MATRIX.md
│   │   └── CONVERGENCE_POLICY.md
│   │
│   ├── science/
│   │   ├── MODEL_BOUNDARIES.md
│   │   ├── PARAMETER_AUTHORITY.md
│   │   ├── EVIDENCE_POLICY.md
│   │   └── VALIDATION_LADDER.md
│   │
│   ├── product/
│   │   ├── STACK_TO_SOLVER_MAPPING.md
│   │   ├── SPATIAL_RESULTS.md
│   │   └── MODELING_WORKBENCH.md
│   │
│   └── adr/
│       ├── ADR-001-spatial-runtime-boundary.md
│       ├── ADR-002-fem-toolchain.md
│       ├── ADR-003-physics-composition.md
│       ├── ADR-004-spatial-artifacts.md
│       ├── ADR-005-async-simulation-jobs.md
│       ├── ADR-006-multiscale-separation.md
│       └── ADR-007-verification-vs-validation.md
│
└── .github/
    ├── copilot-instructions.md
    │
    ├── instructions/
    │   ├── scientific-domain.instructions.md
    │   ├── solver-runtime.instructions.md
    │   ├── contracts.instructions.md
    │   ├── database.instructions.md
    │   ├── evidence.instructions.md
    │   ├── api.instructions.md
    │   ├── web-ui.instructions.md
    │   └── tests.instructions.md
    │
    ├── agents/
    │   ├── technical-program-manager.md
    │   ├── scientific-architect.md
    │   ├── numerical-methods-engineer.md
    │   ├── solver-runtime-engineer.md
    │   ├── scientific-data-engineer.md
    │   ├── product-integration-engineer.md
    │   ├── verification-engineer.md
    │   └── release-auditor.md
    │
    ├── skills/
    │   ├── plan-model-capability/
    │   │   └── SKILL.md
    │   ├── add-physics-module/
    │   │   └── SKILL.md
    │   ├── add-spatial-solver/
    │   │   └── SKILL.md
    │   ├── add-boundary-condition/
    │   │   └── SKILL.md
    │   ├── verify-numerical-model/
    │   │   └── SKILL.md
    │   ├── integrate-solver-product/
    │   │   └── SKILL.md
    │   ├── add-evidence-benchmark/
    │   │   └── SKILL.md
    │   └── audit-release-readiness/
    │       └── SKILL.md
    │
    ├── prompts/
    │   ├── implement-capability.prompt.md
    │   ├── solver-review.prompt.md
    │   └── phase-gate-review.prompt.md
    │
    └── hooks/
        └── appropriate deterministic validation hooks
```

Do not create files merely for appearance.

Every file must have an active consumer, clear authority, or concrete workflow function.

---

# 8. AGENTS.md — CHANGE ITS ROLE

The current `AGENTS.md` contains valuable scientific guardrails.

Preserve those rules.

But transform `AGENTS.md` into the repository constitution.

It should contain rules that apply to every agent and every task.

At minimum:

```text
1. Establish live repository HEAD and project state before modifying code.

2. Identify affected capability IDs and required acceptance gates.

3. Never invent or silently backfill scientific parameters.

4. Never silently reduce requested model fidelity.

5. Keep separate:
   numerical implementation,
   numerical verification,
   experimental comparison,
   calibration,
   independent validation.

6. Never describe convergence or invariant tests as empirical validation.

7. Preserve units and provenance through all boundaries.

8. Update code, contracts, capability state and tests consistently.

9. Never mark a capability complete if its required gates are not satisfied.

10. Report unsupported physics explicitly.

11. A development observation cannot automatically become decision evidence.

12. LLM narrative cannot override deterministic scientific/runtime state.

13. A model can be implemented before human review of every source, but evidence promotion and validation claims remain separately gated.

14. MEC electrical input must never be reported as generated power.

15. Large spatial artifacts must not be stored indiscriminately as huge PostgreSQL JSON payloads.

16. UI labels must reflect actual maturity and fidelity.

17. A conceptual SVG is not a numerical mesh.

18. Stack-scale, cell-scale, pore-scale and nano-scale models must remain explicitly separated unless a declared homogenization/coupling map exists.

19. A physics module must declare its units, signs, applicable domains and boundary requirements.

20. Changes to governing equations require numerical verification coverage.
```

`AGENTS.md` should point to authoritative documents instead of duplicating their complete contents.

---

# 9. README.md — REDUCE ITS RESPONSIBILITIES

Refactor the README so its primary functions become:

```text
What METREV is
How to bootstrap
High-level system diagram
Current headline capability
Important safety/scientific warning
Where authoritative information lives
```

Move mutable implementation state into governance files.

Move detailed equations into numerical documentation.

Move model status into capability/state manifests.

Move scientific maturity definitions into the validation/maturity documents.

Prevent README from becoming an ever-growing historical database.

---

# 10. PROJECT_STATE.yaml

Create a machine-readable current-state authority.

Example conceptual structure:

```yaml
repository:
  expected_branch: main
  observed_head: <live sha>

product:
  systems:
    - MFC
    - MEC
    - biosensor

runtime:
  coupled_0d:
    status: executable
    case_runner: true

  coupled_1d:
    status: development_api_only
    case_runner: false
    persisted: false

  cell_2d:
    status: not_implemented

  cell_3d:
    status: not_implemented

physics:
  spatial_flow: not_implemented
  species_convection: not_implemented
  solid_charge_field: not_implemented
  electrolyte_charge_field: not_implemented
  gas_multiphase: not_implemented

numerics:
  fem_runtime: absent
  mesh_runtime: absent
  sparse_spatial_solver: absent

product_integration:
  async_simulation_jobs: absent
  spatial_artifact_storage: absent
  spatial_viewer: absent
```

The exact schema should be designed carefully.

Avoid duplicating information that can be derived reliably from code, but store information that cannot otherwise be queried consistently.

Create validation tests for the manifest where possible.

---

# 11. ROADMAP.yaml

Convert the complete implementation program into machine-readable capability/work items.

Each item should include approximately:

```yaml
id:
title:
phase:
workstream:
status:

depends_on:

affected_layers:

owned_paths:

required_gates:

scientific_dependencies:

evidence_dependencies:

product_dependencies:

completion_requires:

blockers:

notes:
```

A roadmap item must never be marked complete solely because one source file was implemented.

---

# 12. DEPENDENCY_GRAPH.yaml

Encode implementation ordering.

The graph should make dependencies similar to these explicit:

```text
Spatial contracts
        ↓
Physics composition
        ↓
Geometry/domain model
        ↓
Mesh runtime
        ↓
PDE abstraction
        ↓
Flow
Species
Charge
Reaction
Circuit
        ↓
Coupled 2D cell
        ↓
Numerical verification
        ↓
Async jobs
        ↓
Persistence
        ↓
Spatial artifacts
        ↓
Product API
        ↓
Viewer
        ↓
Case runner
        ↓
P2 gate
        ↓
Dimension-independent generalization
        ↓
3D
```

Agents must consult this dependency graph before starting major implementation.

---

# 13. CAPABILITY_MATRIX.yaml

Track actual capability separately across dimensions and layers.

At minimum cover:

```text
mass balance
species diffusion
species convection
ionic migration
solid potential
liquid potential
hydraulics
biofilm spatial resolution
membrane transport
Donnan/fixed charge
cathode spatial model
gas transport
thermal physics
circuit closure
persistence
case runner
API
UI visualization
reports
numerical verification
experimental comparison
independent validation
```

for:

```text
0D
1D
2D
3D
macro stack
micro porous electrode
nano-informed interfaces
```

---

# 14. ACCEPTANCE_GATES.yaml

Define formal gates including at least:

```text
GATE-CONTRACT
GATE-PROVENANCE
GATE-UNITS
GATE-MASS-CONSERVATION
GATE-CHARGE-CONSERVATION
GATE-POSITIVITY
GATE-LIMITING-CASE
GATE-MESH-REFINEMENT
GATE-TIME-REFINEMENT
GATE-NONLINEAR-CONVERGENCE
GATE-CASE-RUNNER
GATE-PERSISTENCE
GATE-SPATIAL-ARTIFACT
GATE-API
GATE-UI
GATE-E2E
GATE-EXPERIMENTAL-COMPARISON
GATE-INDEPENDENT-VALIDATION
```

Each capability should reference required gates.

Avoid vague completion concepts such as:

```text
tests passed
```

Specify exactly which evidence demonstrates each gate.

---

# 15. SCIENTIFIC_MATURITY.yaml

Formalize maturity states.

Use approximately:

```text
specified
implemented
numerically_verified
development_integrated
experimentally_compared
calibrated
independently_validated
production_eligible
```

Scientific maturity and product integration must remain separate.

For example:

```yaml
cell_2d:
  numerical_maturity: numerically_verified
  product_maturity: development_integrated
  experimental_maturity: no_matched_dataset
```

Prevent phrases like `production-ready` from being inferred merely from execution success.

---

# 16. RISK_REGISTER.yaml

Create an active technical/scientific risk registry.

Include risks such as:

- inappropriate transfer of literature parameters;
- hidden unit mismatches;
- model identifiability;
- overparameterization;
- unstable nonlinear coupling;
- mesh dependence;
- convergence masking;
- excessive 3D computational cost;
- database abuse with large artifacts;
- incorrect stack-to-domain mapping;
- mismatch between SVG and numerical geometry;
- unsupported model claims appearing in UI;
- candidate evidence accidentally becoming decision evidence;
- stale governance manifests;
- TypeScript/Python contract drift;
- numerical runtime version drift.

Each risk should include:

```text
severity
likelihood
affected capabilities
mitigation
verification
owner role
status
```

---

# 17. CUSTOM AGENTS

Create focused agents rather than one enormous coding persona.

## technical-program-manager

Responsible for:

- current-state inspection;
- roadmap;
- capability IDs;
- dependency graph;
- scope control;
- work decomposition;
- determining which specialist should act;
- ensuring work crosses all necessary product layers;
- phase-gate readiness.

It should not independently rewrite scientific equations without scientific/numerical review.

## scientific-architect

Responsible for:

- governing physics;
- domains;
- state variables;
- constitutive laws;
- biological/electrochemical assumptions;
- sign conventions;
- applicability boundaries;
- scientific references;
- model abstraction decisions.

It must not claim empirical validation.

## numerical-methods-engineer

Responsible for:

- discretization;
- weak forms;
- FEM;
- time integration;
- nonlinear solvers;
- sparse linear algebra;
- preconditioning;
- convergence;
- stabilization;
- mesh/time refinement;
- manufactured/analytic verification.

## solver-runtime-engineer

Responsible for:

- sidecar;
- runtime protocol;
- execution lifecycle;
- numerical service;
- geometry/mesh plumbing;
- artifact creation;
- cancellation;
- timeout;
- reproducibility.

## scientific-data-engineer

Responsible for:

- literature/datasets;
- extraction;
- provenance;
- condition matching;
- development benchmarks;
- calibration/validation roles;
- source quality.

It must not promote pending candidate evidence without the proper gate.

## product-integration-engineer

Responsible for:

- case runner;
- API;
- queue;
- persistence;
- UI;
- viewer;
- reports;
- runtime/product mapping.

## verification-engineer

Responsible for independent checking of:

- conservation;
- limiting cases;
- analytical tests;
- refinement;
- reproducibility;
- contract consistency;
- failure behavior.

It should not quietly modify a solver simply to make a failing test pass.

## release-auditor

Responsible for:

- checking acceptance gates;
- checking maturity labels;
- checking CI;
- checking docs/code consistency;
- checking unsupported claims;
- checking project-state updates;
- determining whether a capability can be called complete.

---

# 18. SKILLS

Create repeatable skills.

## plan-model-capability

Must determine:

- capability ID;
- prerequisites;
- scientific formulation;
- contracts;
- runtime impact;
- persistence impact;
- API impact;
- UI impact;
- tests;
- required gates.

## add-physics-module

Must require:

- physics ID;
- domains;
- governing equation;
- units;
- sign convention;
- source;
- state variables;
- parameters;
- boundary conditions;
- supported dimensions;
- numerical tests;
- unsupported boundaries.

## add-spatial-solver

Must cover:

- geometry;
- mesh;
- fields;
- BCs;
- discretization;
- solver;
- convergence;
- conservation;
- artifact outputs;
- integration.

## add-boundary-condition

Must cover:

- mathematical form;
- physical interpretation;
- unit;
- domain/interface;
- compatibility;
- tests.

## verify-numerical-model

Must cover:

- analytical/manufactured solution where possible;
- zero reaction;
- zero flow;
- diffusion limit;
- charge limit;
- mass/charge conservation;
- mesh refinement;
- timestep refinement;
- nonlinear tolerance;
- reproducibility.

## integrate-solver-product

Must trace:

```text
solver
→ runtime
→ job
→ persistence
→ API
→ case evaluation
→ UI
→ report
→ export
```

## add-evidence-benchmark

Must preserve:

- source;
- license;
- locator;
- protocol;
- geometry;
- units;
- extraction method;
- uncertainty;
- dataset role;
- compatibility;
- exclusion reasons.

## audit-release-readiness

Must verify every required gate and prevent false completion claims.

---

# 19. PATH-SPECIFIC INSTRUCTIONS

Create `.github/instructions/*.instructions.md`.

For solver paths, require:

```text
Any governing-equation change SHALL:
- identify the equation;
- identify scientific source/support;
- declare units;
- declare sign convention;
- declare applicable domain;
- declare supported dimension;
- declare unsupported physics;
- include conservation tests where applicable;
- include limiting-case tests;
- update capability state.
```

For database paths:

```text
Large spatial arrays must not be persisted blindly as JSON.

PostgreSQL stores:
- run state;
- metadata;
- hashes;
- summaries;
- references.

Large spatial artifacts belong in artifact storage.
```

For UI:

```text
Never display development output as validated.

Always expose:
- model fidelity;
- units;
- source/model status;
- unsupported physics where material.

Conceptual SVG is not numerical mesh.
```

For evidence:

```text
candidate
reviewed
accepted
development benchmark
calibration
independent validation
```

must remain separate.

---

# 20. ADRs

Remove the current absolute prohibition against all ADRs.

Do not create unnecessary ADR proliferation.

Create only high-cost-to-reverse decisions.

At minimum evaluate ADRs for:

## ADR-001 — spatial runtime boundary

Likely architecture:

```text
TypeScript/Node
= product/control plane

Python numerical sidecar
= spatial numerical runtime
```

## ADR-002 — FEM and mesh toolchain

Evaluate and document a concrete choice, with strong consideration for:

```text
FEniCSx
PETSc
Gmsh
```

Do not choose merely because it was suggested here; verify compatibility and tradeoffs.

## ADR-003 — physics composition

Stack configuration resolves activated physics modules and equation graph.

## ADR-004 — spatial artifacts

PostgreSQL metadata + external artifact representation/storage.

## ADR-005 — async simulation jobs

2D/3D solves are not long blocking Fastify requests.

## ADR-006 — multiscale separation

Cell scale, pore scale and nano scale remain distinct with explicit homogenization/parameter-transfer boundaries.

## ADR-007 — verification vs validation

Formal separation between numerical correctness and experimental predictive claims.

---

# 21. GOVERNING_EQUATION AUTHORITY

Create an authoritative governing-equation registry/document.

Give stable IDs to formulations.

Example:

```text
EQ-SP-001 species conservation
EQ-FL-001 incompressible continuity
EQ-FL-002 momentum
EQ-CH-001 electrolyte charge conservation
EQ-CH-002 solid charge conservation
EQ-RX-001 Butler-Volmer
EQ-BIO-001 biological substrate uptake
EQ-MEM-001 Nernst-Planck
```

Each definition must include:

```text
formula
variables
SI units
sign convention
domain
supported dimensions
assumptions
boundary requirements
scientific support
implementation path
tests
limitations
```

Prevent duplicated incompatible equations across solver files.

---

# 22. PARAMETER AUTHORITY

Create a canonical parameter authority covering at minimum:

```text
parameter ID
physical meaning
canonical SI unit
scalar/field
domain
allowed source kinds
derivable or not
derivation rule
provenance requirement
applicable physics
applicable dimensions
```

Pay particular attention to:

```text
a_v
porosity
tortuosity
diffusivity
effective diffusivity
conductivity
permeability
exchange current density
kinetic coefficients
biofilm parameters
membrane fixed charge
partition coefficients
gas transfer coefficients
```

---

# 23. VERIFICATION MATRIX

Create a verification matrix tracking dimensions.

Example concept:

```text
                         1D      2D      3D
mass conservation        PASS    TODO    TODO
charge conservation      PASS    TODO    TODO
zero reaction limit      PASS    TODO    TODO
diffusion analytic       PASS    TODO    TODO
mesh convergence         PART    TODO    TODO
time convergence         N/A     TODO    TODO
1D reduction             —       TODO    TODO
2D reduction             —       —       TODO
```

Where possible this should be derived or checked automatically rather than maintained as unverified prose.

---

# 24. CI MUST BECOME PHASE-AWARE

Preserve existing CI:

```text
validate
validate-postgres
validate-local
validate-advanced
CodeQL
```

Add relevant numerical/spatial gates when the runtime exists.

Possible fast gates:

```text
validate-contracts
validate-runtime
validate-numerics-fast
validate-conservation
validate-spatial-contracts
validate-mesh-smoke
validate-product-integration
```

Possible expensive workflows:

```text
numerical-regression.yml
mesh-refinement.yml
spatial-nightly.yml
phase-gate.yml
```

Do not make every trivial UI PR solve expensive 3D meshes.

---

# 25. CHANGE IMPACT CONTRACT

Create an explicit change-impact format for substantial PRs.

Each relevant PR should state:

```text
Capability IDs affected:
Physics modules affected:
Dimensions affected:
Contracts changed:
Database changed:
API changed:
UI changed:
Evidence requirements changed:
Numerical assumptions changed:
New unsupported boundaries:
Verification performed:
Experimental comparison performed:
Maturity before:
Maturity after:
```

Automate validation of these relationships where practical.

---

# 26. DEFINITION OF DONE

For a numerical capability, compilation is not completion.

A full capability Definition of Done must consider:

```text
scientific formulation declared
+
contract exists
+
implementation exists
+
units checked
+
provenance preserved
+
failure modes explicit
+
conservation tested
+
limiting case tested
+
convergence tested where applicable
+
case-runner integration where required
+
persistence where required
+
API where required
+
UI or explicit API-only state
+
documentation
+
capability registry update
+
CI pass
```

Experimental validation may remain pending without blocking implementation, but must remain explicitly pending.

---

# 27. WORKSTREAMS

Organize the following implementation program into workstreams approximately like:

```text
Architecture foundation
Numerical infrastructure
Physics
2D integration
Product integration
3D generalization
Multiscale
Evidence and validation
```

Do not treat the 40 points as independent unordered tickets.

---

# 28. COMPLETE 40-POINT IMPLEMENTATION PROGRAM

The following requirements must remain present in this task in full.

Do not summarize them into a shorter roadmap and then discard their detail.

---

## 1. Close the common engine architecture before writing large 2D PDE code

- Replace the conceptual role of the current `runConfiguredElectrochemicalModel()` dispatcher with a Physics/Model Composition Runtime.
- Stack configuration must automatically determine which modules are active:
  - reactor/hydraulics;
  - anode;
  - biofilm;
  - membrane/separator;
  - cathode;
  - circuit;
  - gas;
  - thermal;
  - other declared physical modules.
- Create canonical interfaces for:
  - `Domain`;
  - `Geometry`;
  - `MaterialField`;
  - `Species`;
  - `ReactionLaw`;
  - `TransportLaw`;
  - `ChargeTransport`;
  - `BoundaryCondition`;
  - `InitialCondition`;
  - `CircuitBoundary`;
  - `SolverConfiguration`;
  - `RequestedOutput`.
- Adapt the existing 0D model to this architecture without unnecessary rewriting.
- Adapt Gatti, porous-anode-1D, membrane-ion-1D and coupled-cell-1D into reusable modules/implementations where scientifically appropriate.
- Stop treating components as end-user-selectable disconnected solvers.
- Integrate the coupled 1D model into the same persisted case/evaluation pathway before 2D.
- Remove the architectural limitation where 1D is available only through `/api/modeling/coupled-cell-1d`.
- Create an explicit compatibility matrix among architecture, physics and fidelity.
- Unsupported combinations return `not_implemented` with explicit missing physics/module information.
- Never silently fall back to 0D.

---

## 2. Create a real spatial input contract

The current input model remains heavily 0D-oriented.

Create a versioned `SpatialModelInput`.

Include:

- `dimension: 1 | 2 | 3`;
- coordinate system;
- domain geometry;
- domain tags:
  - bulk liquid;
  - anode;
  - biofilm;
  - membrane;
  - separator;
  - cathode;
  - gas region;
  - walls;
  - inlet;
  - outlet;
  - other required regions;
- interfaces between domains;
- mesh generation/reference;
- initial conditions;
- boundary conditions.

Support at minimum:

```text
Dirichlet
Neumann
Robin
flux
symmetry
interface continuity
circuit coupling
```

Every scientific value must retain:

```text
value
unit
source_kind
source_reference
```

Support:

- constant fields;
- piecewise fields;
- position-dependent fields;
- full spatial fields where justified.

Explicitly define whether properties belong to:

- bulk;
- electrode;
- biofilm;
- membrane;
- interface.

Version contracts independently of numerical implementation.

Maintain compatibility with existing 0D persisted cases.

---

## 3. Expand the physical vocabulary needed by PDE models

Add or formalize:

- fluid density;
- dynamic viscosity;
- kinematic viscosity where useful;
- porous permeability;
- Darcy parameters;
- Brinkman parameters;
- species identities;
- species valence;
- molecular diffusivity;
- effective diffusivity;
- ion mobility or declared derivation;
- inlet concentrations;
- pressures;
- flow rates;
- velocities;
- electronic conductivity;
- ionic conductivity;
- membrane fixed charge;
- partition coefficients;
- Donnan interface quantities;
- Henry coefficients where applicable;
- gas solubility;
- gas-liquid transfer;
- complete reaction stoichiometry;
- electron count;
- proton count;
- volumetric accessible reactive area `a_v(x,y,z)`;
- porosity fields;
- tortuosity fields;
- permeability fields;
- conductivity fields;
- initial biomass fields;
- initial biofilm thickness;
- growth;
- decay;
- detachment;
- buffer/acid-base parameters;
- temperature boundary/field;
- thermal properties when the thermal module is active.

Never derive `a_v` automatically from porosity alone.

Scientific properties remain source-backed.

---

## 4. Activate the future numerical sidecar architecture

The contracts already anticipate concepts similar to:

```text
internal_model
future_sidecar
```

Turn the spatial sidecar into a real execution boundary.

Maintain:

```text
TypeScript / Node
→ product/control plane
```

Use a specialized numerical environment for spatial PDEs.

Strongly evaluate:

```text
Python
FEniCSx
PETSc
Gmsh
```

instead of implementing an entire 3D FEM stack manually in TypeScript.

Prepare interoperable scientific artifact formats such as:

```text
XDMF
HDF5
VTU
```

as appropriate.

Containerize the numerical service.

Add:

- healthcheck;
- fixed toolchain versions;
- solver version metadata;
- mesh version/hash;
- contract version;
- runtime version;
- provenance.

The numerical sidecar should not own business persistence directly.

METREV's product/control plane remains responsible for persistence and authorization.

Create a strongly typed Node↔solver request/response protocol.

Support:

- timeout;
- cancellation;
- structured failures;
- reproducibility metadata.

---

## 5. Build geometry and mesh infrastructure before broad 2D physics

Create an initial canonical 2D MFC/MEC geometry.

Begin with a controlled planar rectangular configuration where appropriate.

Represent regions such as:

- anode;
- biofilm;
- bulk liquid;
- membrane/separator;
- cathode;
- inlet;
- outlet;
- walls.

Define physical groups.

Define interface orientation and normal directions.

Generate parameterized meshes.

Calculate mesh-quality metrics.

Store mesh hashes.

Map numerical mesh regions to METREV stack components.

Support local refinement.

Implement at least coarse/medium/fine mesh levels for refinement studies.

Later extend to:

- tubular;
- single-chamber;
- double-chamber;
- air-cathode;
- other supported geometries.

The existing SVG remains a conceptual/product representation and must not be treated as a numerical mesh.

---

## 6. Implement a conservative spatial mathematical core

Implement spatial species conservation of a form appropriate to the selected physics, conceptually including:

```text
∂(εC)/∂t
+
∇·(
  uC
  − D_eff∇C
  − z F D_eff C ∇φ_l / RT
)
=
R_C
```

where physically applicable.

Implement appropriate combinations of:

- convection;
- diffusion;
- electromigration;
- reactions.

Implement electrolyte charge continuity.

Implement solid charge continuity.

Conceptually support relations such as:

```text
∇·i_l = a_v j_F
∇·i_s = -a_v j_F
```

Resolve:

```text
φ_l
φ_s
```

where the selected fidelity requires them.

Reuse Butler–Volmer, Monod and other laws only where scientifically justified.

Do not impose local electrode potential when the chosen spatial fidelity requires solving it.

Implement interface conservation among:

- electrode;
- biofilm;
- liquid;
- membrane;
- cathode.

Implement global electrical circuit closure.

Maintain one sign convention for MFC/MEC.

MEC electrical power remains consumption.

Integrate physically represented losses explicitly.

---

## 7. Implement 2D hydraulics

Start with a physically justified incompressible regime.

Use:

- Navier–Stokes;
- Stokes;
- Darcy;
- Brinkman;

where appropriate to the selected domain/regime.

Define bulk↔porous interfaces.

Support:

- inlet flow/velocity;
- outlet pressure/compatible flux;
- wall conditions;
- symmetry where appropriate.

Calculate:

- velocity field;
- pressure field;
- pressure drop.

Feed velocity into species transport.

Do not label the result as turbulent CFD unless a turbulence model is actually implemented and verified.

---

## 8. Generalize anode/biofilm physics from 1D to real 2D

Reuse verified kinetics/transport where possible.

Replace slice-only representations with spatial domain discretization.

Resolve as applicable:

- local substrate;
- solid potential;
- electrolyte potential;
- Faradaic current;
- `a_v(x,y)`;
- biomass/biofilm field;
- pH field;
- local substrate limitation;
- local ohmic limitation;
- local activation limitation.

Implement spatial growth/decay/detachment before describing the full research 2D biofilm profile as fully implemented.

If an early 2D version uses fixed biofilm geometry, create an explicitly restricted fidelity/model ID rather than overstating completeness.

---

## 9. Generalize membrane physics beyond the restricted 1D reduction

Extend Nernst–Planck transport spatially.

Resolve ionic potential where required.

Generalize beyond:

```text
equal concentration
equal diffusivity
monovalent binary pair
```

when the selected model claims broader transport.

Implement as justified:

- electroneutrality closure;
- fixed membrane charge;
- Donnan partition;
- interface relations;
- species crossover.

Differentiate:

```text
ion exchange membrane
porous separator
```

Add convection/water transport only when explicitly part of the fidelity.

Treat fouling as a separate model/module rather than hiding it in arbitrary resistance changes.

---

## 10. Implement a resolved cathode model

Create a separate cathode domain/layer.

For MFC:

- ORR;
- O₂ transport;
- local transfer limitation;
- local charge transfer.

For MEC:

- HER;
- H₂ production;
- local charge transfer.

Resolve near-surface concentration where required.

Use source-backed:

- catalyst loading;
- active area;
- kinetic quantities.

For air cathodes, represent gas/liquid boundaries only when that physics is actually included.

Gas bubbles/multiphase behavior can be a subsequent module.

Preserve distinction among:

- theoretical/gross H₂;
- captured H₂;
- uncaptured H₂;
- side losses.

---

## 11. Implement a robust numerical strategy

Do not merely "solve everything together" without a defined strategy.

Define weak forms.

Evaluate:

- segregated/Picard approaches;
- Newton/SNES;
- block systems;
- PETSc sparse solvers;
- preconditioners;
- field splitting.

Use implicit time integration for stiff spatial PDE systems where appropriate.

A first transient baseline may use something like backward Euler if scientifically/numerically justified.

Evolve to more advanced/adaptive strategies where needed.

Record:

- absolute tolerance;
- relative tolerance;
- nonlinear iteration count;
- linear iteration count;
- convergence reason;
- timestep information.

Never hide non-convergence.

Do not silently clip negative concentrations.

Implement positivity/stabilization strategies where required.

Use SUPG or related stabilization only where justified and verified.

---

## 12. Turn the 2D research profile into actual executable functionality

Implement a real executable 2D cell profile.

If necessary create a new explicit model ID rather than overloading an existing biofilm-only research profile.

The 2D run must originate from a real normalized METREV case rather than only a special fixture.

MFC and MEC should use the same modular runtime with different boundaries/modules.

The run must cover, according to selected physics:

- geometry;
- mesh;
- flow;
- transport;
- reaction;
- charge;
- membrane;
- cathode;
- circuit.

Return:

- scalar outputs;
- spatial fields;
- conservation residuals;
- convergence diagnostics;
- warnings;
- unsupported-physics declarations.

Only promote model status after the fidelity contract is actually fulfilled.

---

## 13. Create mathematical verification before treating papers as validation

Implement verification cases including:

- pure diffusion with analytical solution;
- known advection-diffusion cases where practical;
- zero reaction;
- zero current;
- zero flow;
- high/infinite conductivity limit where appropriate;
- zero membrane resistance limit where meaningful;
- geometries that reduce the higher-dimensional formulation to lower-dimensional behavior.

Compare:

```text
2D reduced case
vs
1D solver
```

where appropriate.

Verify:

- mass conservation;
- charge conservation;
- species balance;
- electrical accounting;
- MFC power sign;
- MEC power-consumption sign;
- mesh refinement;
- timestep refinement;
- nonlinear tolerance sensitivity.

Numerical verification does not establish empirical validation.

---

## 14. Create a spatial result contract

The current `SimulationEnrichment` model is not enough for large spatial fields.

Create a spatial simulation result model including:

- domain manifest;
- mesh artifact reference;
- field manifests;
- scalar fields;
- vector fields;
- timestamps;
- field units;
- domain/component associations;
- min/max;
- mean;
- integral;
- conservation residuals;
- convergence history;
- warnings;
- artifact hashes.

Do not serialize millions of mesh nodes into ordinary API JSON responses.

---

## 15. Correct persistence before large spatial results arrive

Inspect the current persistence relationship between:

```text
SimulationEnrichment
SimulationArtifactRecord
sensitivity_analysis
series
other model output
```

Repair missing persistence of scientifically important runtime data before adding 2D/3D state.

Create a spatial simulation run entity/lifecycle.

Potential states:

```text
queued
preparing_geometry
meshing
solving
postprocessing
completed
failed
cancelled
```

Persist:

- input hash;
- solver version;
- runtime version;
- mesh hash;
- state;
- progress;
- scalar summaries;
- artifact metadata.

Large fields should live in artifact storage rather than huge JSON database fields.

Runs must be reproducible and idempotent where practical.

---

## 16. Do not execute large 2D/3D simulations synchronously inside Fastify requests

Create asynchronous simulation jobs.

Reuse useful patterns from `research-worker`.

Create a spatial simulation worker/service.

API flow should support approximately:

```text
POST create simulation job
GET job status
GET result summary
GET artifact/field
POST/DELETE cancel
controlled retry
```

Add:

- idempotency;
- time limits;
- memory limits;
- CPU limits where appropriate;
- structured logs;
- failure reason;
- progress.

---

## 17. Integrate 2D with the actual case runner

`createPersistedCaseEvaluation()` or its successor must become capable of resolving requested fidelity.

Flow:

```text
stack configuration
→ physics modules
→ input requirements
→ fidelity resolution
→ runtime dispatch
```

0D/1D may execute internally where appropriate.

2D/3D may enqueue sidecar jobs.

Store all runs consistently under the product's evaluation concept.

Maintain:

```text
insufficient_data
not_implemented
failed
```

as separate states.

Never silently downgrade fidelity.

---

## 18. Turn the modeling workbench into a real solver configurator

Current selectors must increasingly affect the real spatial model input.

Selections for:

- system;
- architecture;
- electrode;
- membrane/separator;
- cathode;
- model fidelity;

must affect the actual configuration sent to the engine.

Show:

- enabled physics modules;
- parameter provenance;
- missing inputs;
- supported fidelities;
- unsupported physics;
- geometry;
- mesh preview.

Allow advanced boundary/refinement editing only where appropriate.

Selecting components in the SVG should map to corresponding physical/numerical domains.

---

## 19. Build proper 2D visualization

Support visualization for fields such as:

- substrate/concentration;
- pH;
- electrical potential;
- current density;
- biomass;
- velocity magnitude;
- pressure;
- reaction rate;
- ohmic loss;
- activation loss.

Support vector displays where useful:

- flow velocity;
- current/flux.

Support:

- line probes;
- slices;
- time slider for transient runs;
- run comparison.

Never visually conflate modeled fields with experimental measurements.

---

## 20. Define when Phase 2 is actually complete

Phase 2 is functional only when the complete pathway exists:

- executable 2D from case runner;
- MFC/MEC under common modular runtime;
- real geometry;
- real mesh;
- flow;
- transport;
- charge;
- reaction;
- membrane/cathode/circuit coupling according to declared fidelity;
- spatial outputs;
- conservation;
- convergence;
- mesh refinement;
- timestep refinement where transient;
- persistence;
- async execution;
- UI;
- reports;
- tests;
- provenance.

Scientific maturity may still remain `development_only` if independent experimental validation is absent.

---

## 21. Reuse the same mathematical/runtime architecture for 3D

Do not create a second unrelated 3D engine.

Generalize weak forms to dimension-independent implementations where possible.

The same conceptual modules should operate across:

```text
1D
2D
3D
```

for:

- species;
- charge;
- reaction;
- BCs;
- materials;
- outputs.

Change geometry/mesh/dimension, not the entire architecture.

---

## 22. Create cell-scale 3D geometry

Support real geometry parameters such as:

- length;
- width;
- height;
- electrode gap;
- electrode volumes/surfaces;
- biofilm domains;
- membrane;
- cathode;
- channels;
- inlets;
- outlets;
- gas boundaries where relevant.

Preserve physical tags.

Use appropriate tetrahedral/hexahedral strategies.

Support local interface refinement.

Apply mesh-quality gates before solve.

---

## 23. Extend hydraulics to 3D

Resolve:

- 3D velocity;
- 3D pressure;
- recirculation zones;
- dead zones;
- flow distribution;
- porous regions;
- residence-time-derived metrics.

Do not claim turbulence modeling until a turbulence formulation is truly implemented and verified.

---

## 24. Extend species, charge and reaction to 3D

Support fields conceptually including:

```text
C_i(x,y,z,t)
φ_l(x,y,z,t)
φ_s(x,y,z,t)
j_F(x,y,z,t)
a_v(x,y,z)
```

and as applicable:

- pH;
- biomass;
- biofilm;
- cathode fluxes;
- membrane fluxes;
- gas/product fields.

Preserve interface conservation and circuit closure.

---

## 25. Do not resolve nano/pore geometry inside the full cell mesh by default

Maintain scale separation.

Cell-scale 3D should use effective properties.

Micro-scale porous electrode modeling should be a separate submodel.

Potential micro-scale outputs:

- `D_eff`;
- permeability;
- `a_v`;
- effective conductivity;
- effective kinetic behavior.

These can parameterize the cell-scale model through a declared scale-transfer/homogenization map.

Nano scale is not "3D with a smaller mesh".

Nano information should enter through scientifically supported material/interface parameters unless a specific nano model is separately developed.

---

## 26. Implement porous-electrode micro-3D as a separate capability

Potentially support:

- voxel/imaging geometry;
- synthetic microstructure;
- pore-space transport;
- wetting;
- local reaction;
- electronic transport;
- ionic transport;
- homogenization;
- representative elementary volume analysis.

This should not block the first functional cell-scale 3D engine.

---

## 27. Keep stack-network modeling separate from cell-scale 3D

`stack-network-macro-research-v1` represents another mathematical layer.

Develop network/graph modeling for:

- cell voltage/current;
- series/parallel topology;
- contact resistance;
- shunt currents;
- hydraulic manifold;
- flow maldistribution;
- auxiliary loads.

It may consume reduced-order results from cell-scale solvers.

Do not attempt to CFD-mesh an entire stack as the first stack model.

---

## 28. Prepare real 3D performance architecture

Use appropriate sparse numerical infrastructure.

Consider:

- PETSc;
- block preconditioners;
- field split;
- MPI;
- memory estimation;
- DOF limits;
- checkpoint/restart;
- iteration diagnostics;
- wall-clock metrics;
- mesh/operator caching.

Prevent accidental massive runs with inappropriate resource requirements.

---

## 29. Build a scientific 3D viewer

Add an appropriate scientific field visualization library.

Evaluate `vtk.js` or another suitable option.

Support:

- surface rendering;
- volume rendering where appropriate;
- X/Y/Z slices;
- iso-surfaces;
- streamlines where appropriate;
- vector fields;
- probe points;
- domain hide/show;
- synchronized component selection;
- time slider;
- run comparison.

The existing SVG remains a schematic navigator.

---

## 30. Extend experimental comparison to spatial observations

Support spatial coordinates:

```text
x,y
x,y,z
```

Support:

- timestamps;
- profiles;
- lines;
- surfaces;
- volumetric observations where available.

Define explicit interpolation/mapping policy.

Never compare mesh points implicitly without declaring mapping.

Support metrics as scientifically appropriate:

- RMSE;
- MAE;
- L2;
- L-infinity/max error;
- integrated flux residual;
- region-specific residual;
- spatial correlation where justified.

Preserve experimental uncertainty.

Keep calibration separate from independent holdout validation.

---

## 31. Make data acquisition solver-oriented rather than paper-count-oriented

The target is not merely "500 papers".

Acquire coverage for required variables and conditions.

Prioritize matched cases covering:

### MFC wastewater
- geometry;
- flow;
- COD;
- current;
- voltage;
- pH;
- time;
- spatial observations where available.

### MEC
- applied voltage;
- COD;
- current;
- hydrogen;
- operating conditions.

### Porous anode
- geometry;
- porosity;
- tortuosity;
- internal/accessibility area;
- diffusivity.

### Membrane
- species;
- concentrations;
- ionic flux;
- conductivity;
- selectivity;
- voltage drop.

### Cathode
- polarization;
- oxygen transfer;
- HER;
- gas.

### Biofilm
- thickness;
- profiles;
- growth;
- spatial pH where available.

### Hydraulics
- velocity;
- residence-time data;
- RTD;
- pressure where available.

Every record should preserve:

- raw units;
- replicate identity;
- uncertainty if reported;
- source locator;
- conditions;
- dataset role.

The existing CORA data remain useful component evidence but are not full-cell validation.

---

## 32. Create graded scientific benchmarks

Use a validation ladder.

### Tier A
Analytical/manufactured numerical tests.

### Tier B
Reproduction of published models.

### Tier C
Component experimental comparisons.

### Tier D
Condition-matched full-cell experiments.

### Tier E
Independent held-out validation.

2D/3D implementation can progress through A→B→C before D/E are available.

Predictive/validated claims require the appropriate higher-tier evidence.

---

## 33. Build field-to-decision reduction

Do not send millions of field values directly into the rule engine.

Derive meaningful model observables/features such as:

- current uniformity;
- peak current density;
- dead-zone fraction;
- substrate-starved area/volume;
- pH excursion fraction;
- maximum overpotential;
- membrane flux imbalance;
- pressure drop;
- energy-loss breakdown;
- spatial utilization factor;
- active electrode fraction;
- hotspot coordinates;
- H₂ production integrals;
- H₂ capture integrals.

Represent derived values as modeled observations with provenance.

---

## 34. Update reports and narrative for spatial models

Reports must declare:

- model fidelity;
- geometry;
- mesh;
- mesh convergence;
- timestep convergence;
- enabled physics;
- disabled physics;
- conservation residuals;
- unsupported physics;
- hotspot summaries;
- spatial image/slice artifacts;
- artifact references.

The LLM may explain deterministic results.

The LLM must not infer validation that evidence/numerical gates have not established.

---

## 35. Add tests specific to spatial runtime

Include:

- TypeScript↔Python contract tests;
- geometry tests;
- mesh topology tests;
- mesh tag tests;
- unit conversion;
- boundary-condition tests;
- physics-module unit tests;
- coupling tests;
- 2D integration test;
- tiny 3D integration test;
- conservation tests;
- refinement tests;
- non-convergence tests;
- restart/reproducibility tests;
- artifact hash tests;
- database lifecycle;
- queue/API tests;
- UI field-viewer tests.

---

## 36. Expand CI without making every PR prohibitively expensive

Each relevant PR should run:

- contracts;
- unit tests;
- a tiny/coarse 2D numerical smoke where relevant.

Relevant spatial-runtime PRs should include a tiny 3D smoke once available.

Move expensive:

- mesh-refinement;
- full 3D regression;
- performance testing;

to dedicated/nightly/manual workflows where appropriate.

Docker Compose should eventually include the spatial numerical service.

Test:

- Node↔solver communication;
- PostgreSQL;
- artifacts;
- Chromium UI;
- numerical regression.

Preserve security/static checks.

---

## 37. Clean format debt before the spatial codebase becomes much larger

The last known PR state still indicated approximately 79 repository-wide Prettier mismatches outside the changed diff.

Re-evaluate current live state.

If still present:

- fix formatting in a mechanical isolated change;
- make `pnpm run format` pass;
- avoid mixing mass formatting noise into major solver PRs.

---

## 38. Create explicit maturity gates per model

Use states more expressive than one `executable` label.

Examples:

```text
research_profile_only
numerically_implemented
numerically_verified
development_api_only
case_runner_development
experimentally_compared
independently_validated
production_eligible
```

Exact naming may be refined.

The key requirement is preventing software execution from being confused with predictive scientific maturity.

---

## 39. Follow a practical implementation sequence

A good starting sequence is:

### PR A
Formatting cleanup + persistence alignment for existing scientific output such as sensitivity analysis.

### PR B
Spatial contracts + module interfaces + numerical sidecar scaffold.

### PR C
Integrate restricted coupled 1D into case runner through the new architecture.

### PR D
Gmsh + domain/geometry/mesh system + spatial artifact contract/storage.

### PR E
2D flow + transport baseline + analytical verification.

### PR F
2D charge + reaction + anode/membrane/cathode/circuit coupling.

### PR G
Mesh/time refinement + conservation + complete numerical verification.

### PR H
Async simulation jobs + persistence + case/evaluation integration.

### PR I
2D viewer + workbench + reporting integration.

At this point Phase 2 may be considered functionally implemented if all Phase 2 gates pass.

### PR J
Dimension-independent generalization + 3D geometry/mesh.

### PR K
3D flow/species/charge/reaction coupled runtime.

### PR L
Performance/PETSc/MPI/checkpoint/refinement.

### PR M
3D viewer + field artifacts + report integration.

### PR N
Micro-3D homogenization interface.

### PR O
Experimental spatial comparison + matched benchmarks.

At this point Phase 3 may be considered functionally implemented if all required gates pass.

Afterwards proceed toward:

- stack network;
- richer biology;
- gas multiphase;
- membrane fouling;
- thermal coupling;
- deeper calibration;
- independent validation.

Adapt the PR grouping if repository reality reveals a superior decomposition, but preserve dependency logic.

---

## 40. Do not take architectural shortcuts

Do not:

- create one giant `solver-2d.ts`;
- duplicate the entire engine into `solver-3d`;
- use SVG/Three.js as numerical geometry;
- describe the conceptual SVG as a mesh;
- dump huge spatial fields into PostgreSQL JSON;
- call 2D/3D experimentally validated because a nonlinear solver converges;
- infer `a_v`, diffusivity, conductivity or kinetics without scientific provenance;
- treat the CORA component dataset as full-cell validation;
- model cell scale and pore scale on one indiscriminate mesh;
- equate stack modeling with 3D;
- let an LLM fill missing scientific parameters;
- hide non-convergence;
- hide conservation failures;
- silently fall back 3D→2D→1D→0D;
- let a UI selector advertise a capability the runtime cannot execute;
- promote maturity merely because a test suite passes.

---

# 29. DESIRED ARCHITECTURAL TRANSFORMATION

The current conceptual state is approximately:

```text
case
→ 0D runner

1D
→ development solver/API paths

2D/3D
→ catalog + ontology + requirements + UI concepts
```

The target is:

```text
case / stack
        ↓
physics resolver
        ↓
domains + interfaces
        ↓
geometry
        ↓
equation graph
        ↓
boundary/initial conditions
        ↓
numerical runtime
        ↓
mesh
        ↓
PDE solve
        ↓
conservation + convergence
        ↓
spatial artifacts
        ↓
derived observations
        ↓
persistence
        ↓
API
        ↓
UI / viewer
        ↓
reports
        ↓
evidence comparison
        ↓
decision support
```

---

# 30. BRANCH AND GIT STRATEGY

Prefer a simple branch topology.

The user strongly prefers `main` as the long-lived branch.

Do not create many persistent feature branches.

Use:

```text
main
```

as the long-lived source of truth.

For large changes:

- create one short-lived feature branch;
- implement a coherent dependency-bounded increment;
- test;
- create PR;
- merge;
- delete/abandon the branch;
- re-anchor the next task from the latest `main`.

Do not maintain parallel long-lived experimental branches unnecessarily.

Before every new implementation unit:

```bash
git fetch
git checkout main
git pull --ff-only
```

or equivalent safe synchronization.

Verify clean working tree.

---

# 31. WORK EXECUTION PROTOCOL

For each roadmap capability:

## Step 1 — establish current state

Read:

```text
PROJECT_STATE
ROADMAP
CAPABILITY_MATRIX
DEPENDENCY_GRAPH
ACCEPTANCE_GATES
relevant path instructions
relevant ADRs
relevant scientific/numerical docs
```

## Step 2 — identify implementation surface

Determine impact across:

```text
science
contracts
runtime
database
API
UI
tests
evidence
documentation
CI
```

## Step 3 — formulate

For scientific/numerical features define:

```text
equations
variables
units
sign convention
domains
interfaces
BCs
ICs
assumptions
unsupported physics
```

## Step 4 — implement smallest coherent vertical capability

Avoid disconnected proof-of-concept islands unless explicitly labeled as such.

## Step 5 — verify

Run narrow tests first.

Then broader gates.

## Step 6 — integrate

Trace:

```text
configuration
→ solver
→ execution
→ persistence
→ API
→ UI
→ report
```

## Step 7 — audit

Use verification/release-auditor logic.

## Step 8 — update governance state

Only update status after evidence/tests justify it.

## Step 9 — PR

Report:

```text
what changed
why
capability IDs
scientific boundary
tests
gates
remaining blockers
maturity before
maturity after
```

---

# 32. DO NOT USE DOCUMENTATION AS A SUBSTITUTE FOR IMPLEMENTATION

Do not satisfy this task by creating:

- dozens of Markdown files;
- roadmaps with no consumers;
- diagrams with no corresponding code;
- fictitious future modules.

The orchestration/control-plane refactor is successful only if it actively improves how subsequent implementation is executed.

At least some governance artifacts should be validated or consumed programmatically where practical.

Examples:

- semantic lint;
- capability-state validation;
- roadmap dependency validation;
- maturity transition validation;
- tests ensuring model IDs align with capability state;
- checks preventing `production_eligible` without required gates;
- checks ensuring implemented fidelity IDs correspond to runtime consumers.

---

# 33. SELF-CONSISTENCY / DRIFT PREVENTION

Implement mechanisms to detect drift such as:

```text
model exists in catalog but not capability matrix
model marked executable but no runtime consumer
model marked case-runner integrated but dispatcher cannot reach it
maturity promoted without required gate
governing equation ID referenced but undefined
parameter unit disagrees across authority and contract
roadmap item completed while dependency remains incomplete
spatial field declared but result contract cannot represent it
UI exposes fidelity unavailable in backend
```

Do not rely purely on manual review for these invariants.

---

# 34. ORCHESTRATION SHOULD ACT, NOT MERELY ADVISE

The Technical Program Manager agent must be allowed to block invalid sequencing.

Example:

If asked to implement full 3D before:

```text
spatial input contracts
geometry system
mesh runtime
PDE abstraction
spatial result contract
sidecar protocol
```

exist, it should explicitly mark the 3D task blocked by those dependencies and execute the prerequisites first when task scope permits.

Likewise:

If a physics module is numerically implemented but not connected to persistence/UI, do not mark the full product capability complete.

---

# 35. SOLVER MODULE CONTRACT

Design a formal module abstraction roughly equivalent to:

```typescript
interface PhysicsModule {
  id: string
  supportedDimensions: SpatialDimension[]

  requiredDomains: DomainType[]
  requiredParameters: ParameterRequirement[]

  equations: EquationDefinition[]
  boundaryRequirements: BoundaryRequirement[]
  stateVariables: StateVariableDefinition[]

  outputs: OutputDefinition[]
}
```

The exact implementation may differ.

The important architectural property is:

```text
stack configuration
→ physics composition
→ equations/domains/BCs
→ numerical solve
```

rather than:

```text
hardcoded model name
→ enormous switch statement
→ unrelated solver implementation
```

---

# 36. MULTI-CONFIGURATION REQUIREMENT

The engine must eventually support configuration-driven variations including, as scientifically implemented:

```text
MFC
MEC

single chamber
double chamber
other declared reactor architectures

batch
continuous flow

electrode material variants
electrode geometries

membrane
separator
membrane-less where scientifically supported

different cathode configurations

biofilm representations

flow configurations

sensor integration

different fidelity levels
```

The runtime must determine compatibility.

Not every theoretical combination needs immediate implementation.

Unsupported combinations must be explicit.

---

# 37. MULTISCALE REQUIREMENT

Maintain clear scale layers:

```text
macro / stack
cell / reactor
component
micro / porous electrode
nano-informed material/interface
```

Define scale-transfer interfaces.

Do not pretend direct simulation at every scale is required.

Use homogenized/effective properties where scientifically appropriate.

Every transfer must preserve provenance.

---

# 38. EVIDENCE AND CORPUS STRATEGY

The repository currently contains evidence/research infrastructure but remains far from a broad independently validated corpus.

Known state around the current baseline included approximately:

```text
curated manifest:
10 sources
10 claims
all pending

candidate registry:
12 source candidates
9 local artifacts
26 reported-claim candidates

CORA:
39,540 current-density/LSV coordinate/value rows
290 EIS pairs
```

These figures must be rechecked live.

Do not interpret candidate counts as validated evidence.

Do not optimize research toward arbitrary corpus quantity.

Optimize toward:

```text
model parameter coverage
boundary-condition coverage
geometry coverage
component coverage
full-cell calibration coverage
independent validation coverage
```

---

# 39. LLM ROLE

The repository supports an LLM adapter.

LLMs may assist with:

- source extraction;
- narrative;
- documentation;
- comparison explanation;
- report generation;
- structured reasoning.

LLMs must not:

- fabricate parameters;
- fabricate observations;
- override solver status;
- override evidence acceptance;
- declare validation;
- silently fill scientific gaps.

Keep deterministic/scientific authority outside narrative generation.

---

# 40. PHASE-GATE DEFINITIONS

## P2 functional

Do not call Phase 2 functional until:

```text
stack→physics resolution works
2D contract works
2D geometry works
mesh works
flow works for declared regime
species transport works
charge transport works
reaction works
membrane/cathode/circuit coupling works for declared fidelity
2D conservation works
2D refinement works
async execution works
persistence works
spatial result artifacts work
case runner works
API works
UI works
reporting works
tests/CI pass
```

Experimental maturity can remain lower.

## P3 functional

Do not call Phase 3 functional until:

```text
2D architecture generalized rather than duplicated
3D geometry works
3D mesh works
3D flow works
3D species works
3D charge works
3D reaction works
coupling works
conservation works
3D refinement/smoke verification works
resource controls exist
artifacts work
viewer works
case/product integration works
CI covers appropriate 3D gates
```

Again, predictive validation is a separate maturity axis.

---

# 41. INITIAL EXECUTION ORDER FOR THIS WORK TASK

Begin by doing the following in order:

1. Fetch and inspect the current `main`.
2. Confirm live HEAD.
3. Confirm working tree.
4. Inspect all existing orchestration/governance files.
5. Inspect model catalog/fidelity catalog.
6. Inspect all existing solvers.
7. Inspect contracts.
8. Inspect persistence.
9. Inspect API/case runner.
10. Inspect UI modeling workbench.
11. Inspect tests and CI.
12. Inspect evidence/model-development datasets.
13. Produce an internal current-state reconciliation.
14. Design the minimal non-duplicative control-plane architecture.
15. Implement the governance/orchestration architecture.
16. Add validation/tests so governance is not passive prose.
17. Run applicable repository checks.
18. Create a PR for this governance/control-plane change if a short-lived branch is required.
19. Re-anchor on merged `main`.
20. Use the resulting control plane to select the first executable prerequisite from the 40-point program.
21. Continue implementation according to dependency order rather than merely producing another roadmap.

Do not stop after step 18 unless repository/environment constraints prevent continued execution.

---

# 42. REPORTING FORMAT DURING THE TASK

Maintain a concise execution ledger.

Use categories such as:

```text
IMPLEMENTED
VERIFIED
INTEGRATED
BLOCKED
DEFERRED BY DEPENDENCY
```

Never say "done" when only documentation exists.

For numerical capabilities include:

```text
Formulation:
Implementation:
Numerical verification:
Product integration:
Experimental status:
Remaining limitations:
```

---

# 43. REQUIRED FINAL REPORT

At the end of each substantial Work execution cycle report:

```text
Repository
Branch
HEAD
Working tree

Capabilities changed
Roadmap IDs changed

Files added
Files modified
Files removed

Architectural decisions

Scientific changes
Numerical changes
Runtime changes
Persistence changes
API changes
UI changes
Evidence changes

Tests executed
Tests passed
Tests failed
Tests blocked

Acceptance gates satisfied
Acceptance gates remaining

Maturity transitions

Known blockers

Next executable dependency
```

Do not hide failed or unavailable checks.

---

# 44. FINAL META-REVIEW BEFORE RESPONDING

Before producing the final response for any major milestone, perform an internal review of the work.

Check explicitly:

- Did I implement rather than merely document?
- Did I preserve every relevant scientific boundary?
- Did I invent a parameter?
- Did I silently simplify fidelity?
- Did I create duplicate sources of truth?
- Did I introduce a capability with no product integration plan?
- Did I confuse numerical verification with validation?
- Did I skip persistence?
- Did I skip API?
- Did I skip UI when product integration is required?
- Did I update governance state prematurely?
- Did I satisfy required gates?
- Did I preserve backward compatibility where required?
- Did I create unnecessary architecture?
- Did I leave an easier generalization path from 2D to 3D?
- Did I preserve reproducibility?
- Did I test failure behavior?
- Did I verify that documentation matches executable reality?

Correct deficiencies before finalizing whenever the environment allows it.

Optionally include only a concise section:

`Self-audit and improvements applied`

Do not expose private chain-of-thought.

---

# 45. SUCCESS CRITERION FOR THE MASTER TASK

The success condition is not a long set of documents.

The success condition is that METREV evolves into a repository where:

```text
project state is machine-readable
roadmap dependencies are explicit
agents know their responsibilities
skills encode repeatable engineering workflows
scientific authority is traceable
numerical authority is traceable
maturity cannot be overstated
governance drift is testable
2D/3D implementation follows a coherent common runtime
solver code reaches the real product
evidence remains correctly separated
verification is systematic
future coding agents can continue without reconstructing project intent from chat history
```

The long-term technical destination is:

```text
Stack configuration
        ↓
Physics composition
        ↓
Domain + geometry
        ↓
Equation graph
        ↓
Mesh
        ↓
Configurable spatial numerical runtime
        ↓
1D / 2D / 3D solve
        ↓
Conservation / convergence
        ↓
Artifacts
        ↓
Derived observations
        ↓
Persistence
        ↓
API / case runner
        ↓
Workbench / SVG / spatial viewer
        ↓
Reports
        ↓
Evidence comparison
        ↓
Decision support
```

Build toward that architecture without overstating what has actually been achieved.
