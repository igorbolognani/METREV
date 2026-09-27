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
    assert len(models) == len(matrix["models"]) and set(models) == set(catalog)
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
