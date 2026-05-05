from __future__ import annotations

import re
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACTS_ROOT = REPO_ROOT / "bioelectro-copilot-contracts" / "contracts"
ONTOLOGY_ROOT = CONTRACTS_ROOT / "ontology"
RULES_ROOT = CONTRACTS_ROOT / "rules"
RESEARCH_CONTRACTS_ROOT = CONTRACTS_ROOT / "research"
DOMAIN_ONTOLOGY_ROOT = REPO_ROOT / "bioelectrochem_agent_kit" / "domain" / "ontology"
DOMAIN_RULES_ROOT = REPO_ROOT / "bioelectrochem_agent_kit" / "domain" / "rules"


FORBIDDEN_COMPACT_FIELD_PREFIXES = {
    "stack.",
    "anode.",
    "cathode.",
    "membrane_separator.",
    "biology.",
    "bop.",
    "sensors_analytics.",
    "economics.",
}

REFERENCE_TOKEN_PATTERN = re.compile(r"[A-Za-z_][A-Za-z0-9_./-]*")


def _load_yaml(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def _collect_nested_paths(root_prefix: str, node) -> set[str]:
    collected: set[str] = set()

    if isinstance(node, dict):
        for key, value in node.items():
            current = f"{root_prefix}.{key}" if root_prefix else key
            collected.add(current)
            if isinstance(value, dict):
                collected |= _collect_nested_paths(current, value)

    return collected


def _allowed_stack_fields() -> set[str]:
    stack_schema = _load_yaml(ONTOLOGY_ROOT / "stack.yaml")
    entities = (
        stack_schema.get("canonical_entities") or stack_schema.get("entities") or {}
    )
    allowed = set()

    for entity_name, entity_payload in entities.items():
        fields = entity_payload.get("fields", {})
        for field_name in fields:
            allowed.add(f"{entity_name}.{field_name}")

        nested_fields = entity_payload.get("nested_fields", {})
        for group_name, group_payload in nested_fields.items():
            group_root = f"{entity_name}.{group_name}"
            allowed.add(group_root)
            allowed |= _collect_nested_paths(group_root, group_payload)

    return allowed


def _allowed_metric_names() -> set[str]:
    property_dictionary = _load_yaml(ONTOLOGY_ROOT / "property_dictionary.yaml")
    return {item["name"] for item in property_dictionary["properties"]}


def _iter_nodes(node):
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from _iter_nodes(value)
    elif isinstance(node, list):
        for value in node:
            yield from _iter_nodes(value)


def _iter_strings(node):
    if isinstance(node, dict):
        for key, value in node.items():
            yield str(key)
            yield from _iter_strings(value)
    elif isinstance(node, list):
        for value in node:
            yield from _iter_strings(value)
    elif isinstance(node, str):
        yield node


def test_rule_field_references_use_only_contract_stack_paths() -> None:
    allowed = _allowed_stack_fields()
    used = []

    for path in sorted(RULES_ROOT.glob("*.yaml")):
        data = _load_yaml(path)
        for node in _iter_nodes(data):
            if isinstance(node, dict) and "field" in node:
                used.append((path.name, node["field"]))

    invalid = [(filename, value) for filename, value in used if value not in allowed]
    assert not invalid, f"Invalid canonical field references found: {invalid}"


def test_rule_metric_references_use_only_property_dictionary_metrics() -> None:
    allowed = _allowed_metric_names()
    used = []

    for path in sorted(RULES_ROOT.glob("*.yaml")):
        data = _load_yaml(path)
        for node in _iter_nodes(data):
            if isinstance(node, dict) and "metric" in node:
                used.append((path.name, node["metric"]))

    invalid = [(filename, value) for filename, value in used if value not in allowed]
    assert not invalid, f"Invalid metric references found: {invalid}"


def test_defaults_policy_keys_use_only_contract_stack_paths() -> None:
    allowed = _allowed_stack_fields()
    defaults = _load_yaml(RULES_ROOT / "defaults.yaml")
    used = list((defaults.get("defaults_policy") or {}).get("defaults", {}).keys())

    invalid = [value for value in used if value not in allowed]
    assert not invalid, f"Invalid defaults paths found: {invalid}"


def test_rule_files_do_not_reintroduce_compact_noncanonical_field_prefixes() -> None:
    violations = []

    for path in sorted(RULES_ROOT.glob("*.yaml")):
        data = _load_yaml(path)
        for text in _iter_strings(data):
            for token in REFERENCE_TOKEN_PATTERN.findall(text):
                if "/" in token:
                    continue

                normalized = token.strip(".,:;()[]{}\"'")
                for prefix in FORBIDDEN_COMPACT_FIELD_PREFIXES:
                    if normalized.startswith(prefix):
                        violations.append((path.name, normalized))

    assert not violations, f"Compact noncanonical field prefixes found: {violations}"


def test_output_contract_declares_canonical_lifecycle_states() -> None:
    output_contract = _load_yaml(CONTRACTS_ROOT / "output_contract.yaml")
    lifecycle = (output_contract.get("canonical_lifecycle") or {}).get("states") or {}

    assert set(lifecycle) == {"raw", "parsed", "normalized", "reviewed"}

    for state_name, payload in lifecycle.items():
        assert payload.get("produced_by"), f"Missing producer for {state_name}"
        assert payload.get("validated_by"), f"Missing validator for {state_name}"
        assert payload.get("persisted_as"), f"Missing persistence mapping for {state_name}"


def test_output_contract_recommendation_metadata_covers_runtime_trace_fields() -> None:
    output_contract = _load_yaml(CONTRACTS_ROOT / "output_contract.yaml")
    recommendation_record = output_contract.get("recommendation_record") or {}
    optional_fields = set(recommendation_record.get("optional_fields") or [])

    assert {
        "rule_refs",
        "evidence_refs",
        "provenance_notes",
        "priority_score",
    }.issubset(optional_fields)


def test_evidence_decision_context_contract_carries_admission_trace_fields() -> None:
    contract = _load_yaml(ONTOLOGY_ROOT / "evidence_schema.yaml")
    domain = _load_yaml(DOMAIN_ONTOLOGY_ROOT / "evidence-schema.yml")
    context_contract = (
        ((contract.get("evidence_registry") or {}).get("evidence_decision_context"))
        or {}
    )
    contract_fields = set(
        context_contract.get("matched_evidence_required_fields") or []
    )
    domain_fields = set(
        (domain.get("evidence_decision_context") or {}).get(
            "matched_evidence_trace_fields"
        )
        or []
    )

    required_trace_fields = {
        "review_status",
        "source_state",
        "access_status",
        "source_license",
        "source_text_hash",
        "source_locator",
        "evidence_quality",
    }

    assert required_trace_fields.issubset(contract_fields)
    assert required_trace_fields.issubset(domain_fields)


def test_domain_property_dictionary_declares_control_metadata_for_core_fields() -> None:
    property_dictionary = _load_yaml(DOMAIN_ONTOLOGY_ROOT / "property-dictionary.yml")
    properties = property_dictionary.get("properties") or {}

    required_fields = [
        "case_id",
        "technology_family",
        "primary_objective",
        "architecture_family",
        "missing_data",
        "defaults_used",
        "cross_cutting_layers.evidence_and_provenance.typed_evidence",
        "supplier_context.preferred_suppliers",
    ]

    for field_name in required_fields:
        field_payload = properties.get(field_name)
        assert field_payload is not None, f"Missing property dictionary entry for {field_name}"
        assert field_payload.get("provenance_source"), (
            f"Missing provenance_source for {field_name}"
        )
        assert field_payload.get("confidence_impact"), (
            f"Missing confidence_impact for {field_name}"
        )


def test_domain_property_dictionary_uses_canonical_technology_family() -> None:
    property_dictionary = _load_yaml(DOMAIN_ONTOLOGY_ROOT / "property-dictionary.yml")
    technology_family = (property_dictionary.get("properties") or {}).get(
        "technology_family", {}
    )

    assert "microbial_electrochemical_technology" in technology_family.get(
        "allowed", []
    )
    assert "hybrid_or_other_met" in technology_family.get("legacy_aliases", [])


def test_research_contract_pack_declares_core_boundaries() -> None:
    required_files = {
        "paper.schema.yaml",
        "review-table.schema.yaml",
        "column-definition.schema.yaml",
        "extraction-result.schema.yaml",
        "evidence-pack.schema.yaml",
        "source-artifact.schema.yaml",
        "metadata-quality.schema.yaml",
        "evidence-veracity.schema.yaml",
    }

    existing_files = {path.name for path in RESEARCH_CONTRACTS_ROOT.glob("*.yaml")}
    assert required_files.issubset(existing_files)


def test_research_taxonomy_and_contracts_align_on_active_surface_eligibility() -> None:
    domain = _load_yaml(DOMAIN_ONTOLOGY_ROOT / "research-taxonomy.yml")
    paper_contract = _load_yaml(RESEARCH_CONTRACTS_ROOT / "paper.schema.yaml")
    extraction_contract = _load_yaml(
        RESEARCH_CONTRACTS_ROOT / "extraction-result.schema.yaml"
    )

    active_surface = (domain.get("scope") or {}).get("active_surface_eligibility") or {}
    required_scope = set(active_surface.get("required_technology_scope") or [])
    technology_contract = set(
        ((extraction_contract.get("enums") or {}).get("technology_class") or {}).get(
            "allowed"
        )
        or []
    )
    eligibility_reasons = set(
        ((paper_contract.get("enums") or {}).get("eligibility_reason") or {}).get(
            "allowed"
        )
        or []
    )

    assert {"MFC", "MEC", "MET"}.issubset(required_scope)
    assert {"MFC", "MEC", "MET"}.issubset(technology_contract)
    assert {
        "full_access_traceable",
        "missing_full_text_link",
        "out_of_scope_technology",
        "supplier_or_market_context_only",
    }.issubset(eligibility_reasons)


def test_research_component_parameter_contract_uses_rooted_keys() -> None:
    extraction_contract = _load_yaml(
        RESEARCH_CONTRACTS_ROOT / "extraction-result.schema.yaml"
    )
    property_dictionary = _load_yaml(ONTOLOGY_ROOT / "property_dictionary.yaml")
    parameter_fields = set(
        (extraction_contract.get("component_parameter") or {}).get(
            "required_fields"
        )
        or []
    )
    metric_names = _allowed_metric_names()

    assert {
        "parameter_key",
        "component_type",
        "parameter_kind",
        "evidence_trace",
        "confidence",
    }.issubset(parameter_fields)
    assert {
        "component_parameters.anode_surface_area",
        "component_parameters.catalyst_loading",
        "component_parameters.membrane_separator_thickness",
        "component_parameters.biofilm_startup_time",
        "component_parameters.reactor_temperature",
        "component_parameters.reactor_hydraulic_retention_time",
    }.issubset(metric_names)

    compact_metric_names = [
        item["name"]
        for item in property_dictionary["properties"]
        if any(item["name"].startswith(prefix) for prefix in FORBIDDEN_COMPACT_FIELD_PREFIXES)
    ]
    assert not compact_metric_names, (
        f"Compact component prefixes found in property dictionary: {compact_metric_names}"
    )

    extraction_result = _load_yaml(
        RESEARCH_CONTRACTS_ROOT / "extraction-result.schema.yaml"
    )
    required_fields = set(
        (extraction_result.get("extraction_result") or {}).get("required_fields")
        or []
    )

    assert {
        "answer",
        "evidence_trace",
        "confidence",
        "missing_fields",
        "validation_errors",
        "normalized_payload",
    }.issubset(required_fields)

    rules_text = " ".join(extraction_result.get("rules") or [])
    assert "evidence trace" in rules_text.lower()
    assert "original values" in rules_text.lower()


def test_research_domain_taxonomy_and_metric_rules_cover_runtime_terms() -> None:
    taxonomy = _load_yaml(DOMAIN_ONTOLOGY_ROOT / "research-taxonomy.yml")
    technologies = set((taxonomy.get("scope") or {}).get("primary_technologies") or [])

    assert {
        "MFC",
        "MEC",
        "MDC",
        "BES",
        "bioelectrochemical_sensor",
        "hybrid_system",
    }.issubset(technologies)

    metric_rules = _load_yaml(DOMAIN_RULES_ROOT / "research-metric-normalization.yml")
    rule_ids = {rule.get("id") for rule in metric_rules.get("rules") or []}

    assert {
        "research_metric.power_density.mw_m2_to_w_m2",
        "research_metric.power_density.w_m2_identity",
        "research_metric.current_density.a_m2_identity",
        "research_metric.current_density.ma_cm2_to_a_m2",
        "research_metric.coulombic_efficiency.percent_identity",
        "research_metric.cod_removal.percent_identity",
        "research_metric.internal_resistance.ohm_identity",
        "research_metric.voltage.v_identity",
        "research_metric.voltage.mv_to_v",
        "research_metric.hydrogen_production.ml_l_d_identity",
        "research_metric.ammonium_recovery.percent_identity",
        "research_metric.conductivity.ms_cm_identity",
        "research_metric.hrt.hours_identity",
        "research_metric.energy_input.kwh_m3_identity",
    }.issubset(rule_ids)

    applications = set((taxonomy.get("application_areas") or {}).keys())
    assert {
        "electrode_materials",
        "nutrient_recovery",
        "hydrogen_recovery",
        "co2_valorisation",
        "desalination",
        "bioremediation",
        "industrial_bioproduction",
        "industrial_adoption",
    }.issubset(applications)


def test_metadata_taxonomy_declares_veracity_and_local_ingestion_boundaries() -> None:
    metadata = _load_yaml(DOMAIN_ONTOLOGY_ROOT / "metadata-taxonomy.yml")
    categories = set((metadata.get("metadata_categories") or {}).keys())

    assert {
        "signal_generation",
        "signal_quality",
        "contextual_annotations",
        "data_lineage",
        "access_and_licensing",
        "review_state",
    }.issubset(categories)

    source_artifact = _load_yaml(
        RESEARCH_CONTRACTS_ROOT / "source-artifact.schema.yaml"
    )
    required_fields = set(
        (source_artifact.get("source_artifact") or {}).get("required_fields") or []
    )

    assert {
        "file_hash",
        "extraction_method",
        "metadata_quality",
        "veracity_score",
    }.issubset(required_fields)
