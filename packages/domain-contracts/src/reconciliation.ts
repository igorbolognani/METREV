export interface ReconciliationEntry {
  concern: string;
  domain_source: string;
  contract_source: string;
  runtime_path: string;
  ui_surface: string;
  note: string;
}

export const canonicalOutputSections = [
  'current_stack_diagnosis',
  'prioritized_improvement_options',
  'impact_map',
  'supplier_shortlist',
  'phased_roadmap',
  'assumptions_and_defaults_audit',
  'confidence_and_uncertainty_summary',
] as const;

export const runtimeCanonicalReconciliationMatrix: ReconciliationEntry[] = [
  {
    concern: 'technology_family',
    domain_source:
      'bioelectrochem_agent_kit/domain/ontology/stack-taxonomy.yml#scope.primary_technologies',
    contract_source:
      'bioelectro-copilot-contracts/contracts/ontology/stack.yaml#canonical_entities.case.fields.technology_family',
    runtime_path: 'normalized_case.technology_family',
    ui_surface: 'apps/web-ui/src/components/case-form.tsx#technologyFamily',
    note: 'Canonical runtime value uses microbial_electrochemical_technology; the legacy hybrid_or_other_met label is treated only as an intake alias during normalization.',
  },
  {
    concern: 'reactor_architecture',
    domain_source:
      'bioelectrochem_agent_kit/domain/cases/templates/client-case-template.yml#stack_blocks',
    contract_source:
      'bioelectro-copilot-contracts/contracts/ontology/stack.yaml#canonical_entities.case.nested_fields.stack_blocks.reactor_architecture',
    runtime_path: 'normalized_case.stack_blocks.reactor_architecture',
    ui_surface: 'apps/web-ui/src/components/case-form.tsx#architectureFamily',
    note: 'Runtime fills canonical architecture_type/serviceability/solids_tolerance fields while preserving legacy notes as supplemental context.',
  },
  {
    concern: 'typed_evidence',
    domain_source:
      'bioelectrochem_agent_kit/domain/ontology/evidence-schema.yml',
    contract_source:
      'bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml',
    runtime_path:
      'normalized_case.cross_cutting_layers.evidence_and_provenance.typed_evidence',
    ui_surface: 'apps/web-ui/src/components/case-form.tsx#evidenceRecords',
    note: 'Supplier claims remain typed evidence, never silently upgraded to validated evidence.',
  },
  {
    concern: 'defaults_missing_data',
    domain_source: 'bioelectrochem_agent_kit/domain/rules/defaults.yml',
    contract_source:
      'bioelectro-copilot-contracts/contracts/rules/defaults.yaml',
    runtime_path:
      'normalized_case.defaults_used | normalized_case.missing_data | decision_output.assumptions_and_defaults_audit',
    ui_surface: 'apps/web-ui/src/components/evaluation-result-view.tsx',
    note: 'Defaults and missing-data flags must stay visible in both decision output and history views.',
  },
  {
    concern: 'output_sections',
    domain_source:
      'bioelectrochem_agent_kit/domain/ontology/stack-taxonomy.yml#decision_outputs',
    contract_source:
      'bioelectro-copilot-contracts/contracts/output_contract.yaml#normalized_decision_output.required_sections',
    runtime_path: 'decision_output',
    ui_surface: 'apps/web-ui/src/components/evaluation-result-view.tsx',
    note: 'UI rendering and runtime validation must fail if any canonical output section drifts.',
  },
];
