from __future__ import annotations

import re
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACTS_ROOT = REPO_ROOT / "bioelectro-copilot-contracts" / "contracts"
ONTOLOGY_ROOT = CONTRACTS_ROOT / "ontology"
RULES_ROOT = CONTRACTS_ROOT / "rules"
DOMAIN_ONTOLOGY_ROOT = REPO_ROOT / "bioelectrochem_agent_kit" / "domain" / "ontology"


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
