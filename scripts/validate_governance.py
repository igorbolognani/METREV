"""Offline guard against roadmap, catalog, and maturity drift."""

from __future__ import annotations

import json
import re
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
GOV = ROOT / "governance"


def read(name: str):
    return yaml.safe_load((GOV / name).read_text(encoding="utf-8"))


def validate() -> None:
    roadmap = read("ROADMAP.yaml")
    graph = read("DEPENDENCY_GRAPH.yaml")
    gates = {gate["id"] for gate in read("ACCEPTANCE_GATES.yaml")["gates"]}
    maturity = read("SCIENTIFIC_MATURITY.yaml")
    matrix = read("CAPABILITY_MATRIX.yaml")
    state = read("PROJECT_STATE.yaml")
    timeline = read("DEVELOPMENT_TIMELINE.yaml")
    risks = read("RISK_REGISTER.yaml")
    brief = (GOV / "MASTER_EXECUTION_TASK.md").read_text(encoding="utf-8")
    program = brief.split("# 28. COMPLETE 40-POINT IMPLEMENTATION PROGRAM", 1)[1].split(
        "# 29. DESIRED ARCHITECTURAL TRANSFORMATION", 1
    )[0]
    sections = {
        f"28.{number}": title
        for number, title in re.findall(r"^## (\d+)\. (.+)$", program, re.M)
    }
    assert len(sections) == 40, "Full 40-point source program was lost"
    items = {item["id"]: item for item in roadmap["work_items"]}
    assert len(items) == 40 and len(roadmap["work_items"]) == 40
    assert set(items) == {f"P{i:02d}" for i in range(1, 41)}
    assert roadmap["source"] == "MASTER_EXECUTION_TASK.md"
    assert graph["source"] == "ROADMAP.yaml"
    assert state["roadmap"] == "ROADMAP.yaml"
    assert state["model_registry"] == "CAPABILITY_MATRIX.yaml"
    assert state["development_timeline"] == "DEVELOPMENT_TIMELINE.yaml"
    assert (ROOT / state["reconciliation_checkpoint"]).is_file()
    assert timeline["observed_on"] == state["snapshot"]["observed_on"]
    assert timeline["current_requirements"] == "governance/MASTER_EXECUTION_TASK.md"
    assert timeline["current_operating_rules"] == "AGENTS.md"
    assert timeline["checkpoint"] == state["reconciliation_checkpoint"]
    assert timeline["phase_2_functional"] is False
    assert timeline["phase_3_functional"] is False
    stages = timeline["stages"]
    assert len({stage["id"] for stage in stages}) == len(stages)
    for stage in stages:
        assert stage["period"] and stage["meaning"] and stage["sources"]
        if stage["state"] in {"current_requirements", "integrated_main", "development_pr_not_merged"}:
            assert all((ROOT / path).is_file() for path in stage["sources"])
    integrated_pr_stages = [
        stage
        for stage in stages
        if stage["state"] == "integrated_main" and "pull_request" in stage
    ]
    assert any(
        stage["pull_request"] == state["snapshot"]["integrated_main_pr"]
        and stage["head_sha"] == state["snapshot"]["verified_runtime_head"]
        and stage.get("merge_commit") == state["snapshot"]["integrated_main_head"]
        for stage in integrated_pr_stages
    ), "Latest integrated PR must match the live main snapshot"

    open_stages = [
        stage
        for stage in stages
        if stage["state"] == "development_pr_not_merged"
    ]
    open_prs = state["snapshot"].get("open_development_prs", [])
    assert len(open_prs) == len(open_stages) > 0
    assert len({entry["pull_request"] for entry in open_prs}) == len(open_prs)
    open_by_number = {entry["pull_request"]: entry for entry in open_prs}
    for stage in open_stages:
        entry = open_by_number[stage["pull_request"]]
        assert stage["base_main"] == state["snapshot"]["integrated_main_head"]
        assert stage["branch"] == entry["branch"]
        assert stage["head_sha"] == entry["head_sha"]
        assert stage["review_state"] == entry["review_state"]
        assert stage["ci_state"] == entry["ci_state"]
        assert stage["codeql_state"] == entry["codeql_state"]
        assert stage["ci_run"] == entry["ci_run"]
        assert stage["codeql_run"] == entry["codeql_run"]
        assert str(stage["ci_run"]).isdigit() and str(stage["codeql_run"]).isdigit()
        assert stage["review_state"] in {"draft", "ready_for_review"}
        assert stage["ci_state"] and stage["codeql_state"]
    assert len(risks["risks"]) >= 10
    for risk in risks["risks"]:
        assert risk["severity"] and risk["likelihood"] and risk["verification"]
        assert risk["affected_capabilities"] and set(risk["affected_capabilities"]) <= set(items)

    edges = {(edge["from"], edge["to"]) for edge in graph["edges"]}
    assert len(edges) == len(graph["edges"]), "Duplicate dependency edge"
    for item in items.values():
        assert item["title"] == sections[item["source_section"]], item["id"]
        assert item["status"] in {"pending", "partial", "blocked", "complete"}
        assert item["required_gates"] and set(item["required_gates"]) <= gates
        assert all(dependency in items for dependency in item["depends_on"])
        assert all((dependency, item["id"]) in edges for dependency in item["depends_on"])
        if item["status"] == "complete":
            assert not item["depends_on"] or all(
                items[dep]["status"] == "complete" for dep in item["depends_on"]
            ), f"{item['id']} completed ahead of prerequisites"
            assert item.get("gate_evidence"), f"{item['id']} lacks gate evidence"
            assert set(item["gate_evidence"]) == set(item["required_gates"])

    def visit(node: str, active: set[str], done: set[str]) -> None:
        assert node not in active, f"Dependency cycle at {node}"
        if node in done:
            return
        for dependency in items[node]["depends_on"]:
            visit(dependency, active | {node}, done)
        done.add(node)

    done: set[str] = set()
    for item_id in items:
        visit(item_id, set(), done)

    domain = yaml.safe_load(
        (ROOT / "bioelectrochem_agent_kit/domain/ontology/model-fidelity.yml").read_text()
    )
    spatial_authority = json.loads(
        (ROOT / "bioelectrochem_agent_kit/domain/ontology/spatial-parameter-authority.json").read_text()
    )
    assert spatial_authority["schema_version"] == 1
    assert len(spatial_authority["parameters"]) >= 15
    assert set(spatial_authority["allowed_source_kinds"]) == {
        "measured", "literature", "default", "assumption", "test_fixture"
    }
    for parameter_id, spec in spatial_authority["parameters"].items():
        catalog_spec = domain["component_parameter_catalog"].get(parameter_id)
        if catalog_spec:
            assert spec["unit"] == catalog_spec["unit"], parameter_id
        assert spec["meaning"] and spec["unit"] and spec["domains"] and spec["physics"]
        assert spec["dimensions"] and set(spec["dimensions"]) <= {1, 2, 3}
        assert spec["form"] in {"scalar", "field", "scalar_or_field"}
        assert isinstance(spec["derivable"], bool)
        assert bool(spec["derivation_rule"]) == spec["derivable"]
    catalog = {profile["id"]: profile for profile in domain["fidelities"]}
    models = {entry["model_id"]: entry for entry in matrix["models"]}
    assert matrix["coverage_scope"] == "catalog_case_runner_fidelities"
    assert len(models) == len(matrix["models"]) and set(models) == set(catalog)
    profiles = matrix["development_profiles"]
    assert len({profile["model_id"] for profile in profiles}) == len(profiles)
    for profile in profiles:
        identifier = profile["model_id"]
        assert identifier not in models, "A development profile must not silently activate a catalog fidelity"
        assert profile["numerical_maturity"] == "numerically_implemented"
        assert profile["experimental_maturity"] == "none"
        assert profile["case_runner"] is True
        assert profile["case_runner_scope"] == "explicit_saved_evaluation_planar_stack_development_only"
        assert profile["product_admission"] is False
        assert profile["decision_eligible"] is False
        for key in ("runtime_source", "validator_source", "worker_source", "adapter_source",
                    "api_configuration_source", "ui_source", "numerical_test", "worker_api_test",
                    "refinement_test", "refinement_record", "postgres_test", "browser_test", "browser_config", "report_source",
                    "case_composition_source", "case_service_source", "case_api_source", "case_ui_source",
                    "case_runtime_test", "case_postgres_test", "equation_graph_source"):
            assert (ROOT / profile[key]).is_file(), (identifier, key)
        validator = (ROOT / profile["validator_source"]).read_text()
        numerical_runtime = (ROOT / profile["runtime_source"]).read_text()
        assert identifier in validator and identifier in numerical_runtime
        assert profile["input_contract"] in validator and profile["input_contract"] in numerical_runtime
        assert profile["result_contract"] in (ROOT / profile["worker_source"]).read_text()
        assert set(profile["dimensions"]) == {2, 3}
        boundary = yaml.safe_load((ROOT / "bioelectro-copilot-contracts/contracts/spatial_cell_input_v1.yaml").read_text())
        equations = yaml.safe_load((ROOT / boundary["scientific_authority"]).read_text())
        assert boundary["runtime_validator"] == profile["validator_source"]
        assert boundary["model_id"] == equations["model_id"] == identifier
        assert boundary["version"] == profile["input_contract"]
        assert boundary["results"]["version"] == profile["result_contract"]
        assert equations["supported_dimensions"] == profile["dimensions"]
        assert equations["product_decision_eligibility"] is False
        assert equations["independent_validation"] == "absent"
        assert equations["verification"] == profile["numerical_test"]
        equation_graph = (ROOT / profile["equation_graph_source"]).read_text()
        assert set(re.findall(r"'(?P<id>cell-[a-z-]+-v1)'", equation_graph)) == {equation["id"] for equation in equations["equations"]}
        assert boundary["results"]["equation_graph"]["runtime_projection"] == profile["equation_graph_source"]
        assert boundary["optional_case_context"]["runtime_projection"] == "packages/domain-contracts/src/structured-cell-case-context.ts"
        assert profile["remaining_gates"], "Development maturity requires explicit remaining gates"
    required_scales = {"0D", "1D", "2D", "3D", "macro_stack", "micro_porous_electrode", "nano_interface"}
    required_features = {
        "mass_balance", "species_diffusion", "species_convection", "ionic_migration",
        "solid_potential", "liquid_potential", "hydraulics", "biofilm_spatial_resolution",
        "membrane_transport", "donnan_fixed_charge", "resolved_cathode", "gas_transport",
        "thermal_physics", "circuit_closure", "persistence", "case_runner", "api",
        "ui_visualization", "reports", "numerical_verification", "experimental_comparison",
        "independent_validation",
    }
    assert set(matrix["feature_coverage"]) == required_features
    for feature in matrix["feature_coverage"].values():
        assert set(feature) == required_scales
        assert all(status in {"absent", "partial", "restricted", "restricted_1D_component",
                              "implemented", "development_only"} for status in feature.values())
    sidecar_contract = (ROOT / "packages/domain-contracts/src/spatial-sidecar-schema.ts").read_text()
    sidecar_runtime = (ROOT / "apps/spatial-sidecar/metrev_spatial/__main__.py").read_text()
    operations = matrix["development_operations"]
    assert len({item["operation"] for item in operations}) == len(operations)
    for operation in operations:
        identifier = operation["operation"]
        assert sidecar_contract.count(f"operation: z.literal('{identifier}')") == 2, identifier
        assert identifier in sidecar_runtime, identifier
        assert operation["dimension"] == 2 and operation["product_admission"] is False
        assert operation["experimental_maturity"] == "none"
        verification = (ROOT / operation["native_verification_source"]).read_text()
        assert identifier in verification
        if operation["worker_source"]:
            assert identifier in (ROOT / operation["worker_source"]).read_text()
            assert (ROOT / operation["native_worker_test"]).is_file()
        else:
            assert operation["native_worker_test"] is None
    runtime = (ROOT / "packages/electrochem-models/src/index.ts").read_text()
    case_runner = (ROOT / "apps/api-server/src/services/case-evaluation.ts").read_text()
    for identifier, model in models.items():
        assert model["catalog_status"] == catalog[identifier]["status"], identifier
        assert model["numerical_maturity"] in maturity["states"]
        if model["runtime"]:
            assert identifier in runtime, f"{identifier} has no runtime dispatch"
        if model["case_runner"]:
            assert model["runtime"]
            # 0D routes through evaluateSimulationEnrichment; explicit selection is
            # separately checked by the behavior tests, not by this lexical check.
            assert "evaluateSimulationEnrichment" in case_runner
        if model["numerical_maturity"] in {
            "experimentally_compared", "calibrated", "independently_validated", "production_eligible"
        }:
            assert model.get("maturity_evidence"), identifier
        if model["numerical_maturity"] == "production_eligible":
            assert set(maturity["production_requires"]) <= set(model["maturity_evidence"])
    # Agent profiles, skills and path-specific instructions must be consumable
    # rather than arbitrary markdown files with no frontmatter or matching scope.
    for path in (ROOT / ".github/agents").glob("*.agent.md"):
        front = yaml.safe_load(path.read_text().split("---", 2)[1])
        assert front["name"] == path.name.removesuffix(".agent.md")
        assert front["description"]
    assert len(list((ROOT / ".github/agents").glob("*.agent.md"))) == 8
    for path in (ROOT / ".github/skills").glob("*/SKILL.md"):
        front = yaml.safe_load(path.read_text().split("---", 2)[1])
        assert front["name"] == path.parent.name and front["description"]
    assert len(list((ROOT / ".github/skills").glob("*/SKILL.md"))) == 8
    for path in (ROOT / ".github/instructions").glob("*.instructions.md"):
        front = yaml.safe_load(path.read_text().split("---", 2)[1])
        assert front["applyTo"]
    assert len(list((ROOT / ".github/instructions").glob("*.instructions.md"))) == 8
    for number in range(1, 8):
        matches = list((ROOT / "docs/adr").glob(f"ADR-{number:03d}-*.md"))
        assert len(matches) == 1, f"ADR-{number:03d} missing or duplicated"
        assert "Status:" in matches[0].read_text()
    equations = (ROOT / "docs/numerics/GOVERNING_EQUATIONS.md").read_text()
    for identifier in ("EQ-SP-001", "EQ-FL-001", "EQ-CH-001", "EQ-RX-001", "EQ-MEM-001"):
        assert equations.count(identifier) == 1, identifier
    assert (ROOT / "docs/numerics/VERIFICATION_MATRIX.md").is_file()
    print("governance: 40 source sections, dependencies, gates, catalog, maturity and risks aligned")


if __name__ == "__main__":
    validate()
