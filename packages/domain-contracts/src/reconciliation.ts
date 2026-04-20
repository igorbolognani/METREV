export interface ReconciliationEntry {
  concern: string;
  domain_source: string;
  contract_source: string;
  runtime_path: string;
  ui_surface: string;
  note: string;
}

export type RuntimeAuthorityRole =
  | 'semantic_source'
  | 'runtime_loaded'
  | 'validation_reference'
  | 'reference_only'
  | 'future_facing_reference';

export interface RuntimeAuthoritySource {
  concern: string;
  file_path: string;
  authority_role: RuntimeAuthorityRole;
  runtime_consumer?: string;
  note: string;
}

export const runtimeAuthorityDecision = {
  semantic_source_root: 'bioelectrochem_agent_kit/domain',
  contract_boundary_root: 'bioelectro-copilot-contracts/contracts',
  executed_rule_authority: 'contract-first' as const,
  note: 'The current runtime loads deterministic rule behavior primarily from the hardened contract boundary while preserving domain semantics as the canonical vocabulary source.',
};

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
    ui_surface: 'apps/web-ui/src/components/case-form.tsx#CaseForm',
    note: 'Canonical runtime value uses microbial_electrochemical_technology; the legacy hybrid_or_other_met label is treated only as an intake alias during normalization.',
  },
  {
    concern: 'reactor_architecture',
    domain_source:
      'bioelectrochem_agent_kit/domain/cases/templates/client-case-template.yml#stack_blocks',
    contract_source:
      'bioelectro-copilot-contracts/contracts/ontology/stack.yaml#canonical_entities.case.nested_fields.stack_blocks.reactor_architecture',
    runtime_path: 'normalized_case.stack_blocks.reactor_architecture',
    ui_surface: 'apps/web-ui/src/components/case-form.tsx#CaseForm',
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
    ui_surface: 'apps/web-ui/src/components/case-form.tsx#CaseForm',
    note: 'Supplier claims remain typed evidence, never silently upgraded to validated evidence.',
  },
  {
    concern: 'defaults_missing_data',
    domain_source: 'bioelectrochem_agent_kit/domain/rules/defaults.yml',
    contract_source:
      'bioelectro-copilot-contracts/contracts/rules/defaults.yaml',
    runtime_path:
      'normalized_case.defaults_used | normalized_case.missing_data | decision_output.assumptions_and_defaults_audit',
    ui_surface:
      'apps/web-ui/src/components/evaluation-cockpit.tsx#EvaluationCockpit',
    note: 'Defaults and missing-data flags must stay visible in both decision output and history views.',
  },
  {
    concern: 'output_sections',
    domain_source:
      'bioelectrochem_agent_kit/domain/ontology/stack-taxonomy.yml#decision_outputs',
    contract_source:
      'bioelectro-copilot-contracts/contracts/output_contract.yaml#normalized_decision_output.required_sections',
    runtime_path: 'decision_output',
    ui_surface:
      'apps/web-ui/src/components/evaluation-cockpit.tsx#EvaluationCockpit',
    note: 'UI rendering and runtime validation must fail if any canonical output section drifts.',
  },
];

export const runtimeAuthoritySources: RuntimeAuthoritySource[] = [
  {
    concern: 'domain_semantics',
    file_path: 'bioelectrochem_agent_kit/domain/ontology/stack-taxonomy.yml',
    authority_role: 'semantic_source',
    note: 'Domain vocabulary and stack decomposition remain semantically authoritative here.',
  },
  {
    concern: 'domain_case_template',
    file_path:
      'bioelectrochem_agent_kit/domain/cases/templates/client-case-template.yml',
    authority_role: 'runtime_loaded',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadDomainCaseTemplate',
    note: 'The runtime still loads the domain case template directly during normalization.',
  },
  {
    concern: 'contract_defaults_policy',
    file_path: 'bioelectro-copilot-contracts/contracts/rules/defaults.yaml',
    authority_role: 'runtime_loaded',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractDefaultsPolicy',
    note: 'Executed defaults and missing-data policy are contract-first.',
  },
  {
    concern: 'contract_compatibility_rules',
    file_path:
      'bioelectro-copilot-contracts/contracts/rules/compatibility.yaml',
    authority_role: 'runtime_loaded',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractCompatibilityDefinition',
    note: 'Executed compatibility checks are loaded from the hardened contract boundary.',
  },
  {
    concern: 'contract_diagnostics_rules',
    file_path: 'bioelectro-copilot-contracts/contracts/rules/diagnostics.yaml',
    authority_role: 'runtime_loaded',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractDiagnosticsDefinition',
    note: 'Executed diagnostics are loaded from the hardened contract boundary.',
  },
  {
    concern: 'contract_improvement_rules',
    file_path: 'bioelectro-copilot-contracts/contracts/rules/improvements.yaml',
    authority_role: 'runtime_loaded',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractImprovementsDefinition',
    note: 'Executed recommendation-building inputs are contract-first.',
  },
  {
    concern: 'contract_scoring_model',
    file_path: 'bioelectro-copilot-contracts/contracts/rules/scoring.yaml',
    authority_role: 'runtime_loaded',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractScoringModel',
    note: 'Priority scoring remains loaded from the hardened contract boundary.',
  },
  {
    concern: 'contract_sensitivity_policy',
    file_path: 'bioelectro-copilot-contracts/contracts/rules/sensitivity.yaml',
    authority_role: 'runtime_loaded',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractSensitivityPolicy',
    note: 'Sensitivity framing remains loaded from the hardened contract boundary.',
  },
  {
    concern: 'contract_output_definition',
    file_path: 'bioelectro-copilot-contracts/contracts/output_contract.yaml',
    authority_role: 'runtime_loaded',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractOutputDefinition',
    note: 'Required decision-output sections and lifecycle validation remain contract-first.',
  },
  {
    concern: 'contract_input_definition',
    file_path: 'bioelectro-copilot-contracts/contracts/input_schema.yaml',
    authority_role: 'validation_reference',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractInputDefinition',
    note: 'This file remains a contract and test reference surface rather than a direct runtime hot-path loader.',
  },
  {
    concern: 'contract_stack_ontology',
    file_path: 'bioelectro-copilot-contracts/contracts/ontology/stack.yaml',
    authority_role: 'validation_reference',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractStackOntology',
    note: 'The ontology loader exists for shared validation and reconciliation, not the main evaluation hot path.',
  },
  {
    concern: 'contract_property_dictionary',
    file_path:
      'bioelectro-copilot-contracts/contracts/ontology/property_dictionary.yaml',
    authority_role: 'validation_reference',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractPropertyDictionary',
    note: 'The property dictionary remains a validation and reconciliation reference surface.',
  },
  {
    concern: 'contract_evidence_schema',
    file_path:
      'bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml',
    authority_role: 'validation_reference',
    runtime_consumer:
      'packages/domain-contracts/src/loaders.ts#loadContractEvidenceSchema',
    note: 'Evidence typing remains referenced through the shared contracts package even when not on the main hot path.',
  },
  {
    concern: 'stack_brief',
    file_path: 'stack.md',
    authority_role: 'reference_only',
    note: 'The stack brief is retained as a historical reference and is no longer a live runtime authority surface.',
  },
  {
    concern: 'component_graph',
    file_path: 'bioelectrochem_agent_kit/domain/ontology/component-graph.yml',
    authority_role: 'future_facing_reference',
    note: 'This relational ontology remains useful background context but has no current runtime consumer.',
  },
  {
    concern: 'contract_relations',
    file_path: 'bioelectro-copilot-contracts/contracts/ontology/relations.yaml',
    authority_role: 'future_facing_reference',
    note: 'The contract relation notes remain future-facing until a validated runtime or report consumer exists.',
  },
  {
    concern: 'consulting_report_template',
    file_path:
      'bioelectro-copilot-contracts/contracts/reports/consulting_report_template.md',
    authority_role: 'future_facing_reference',
    note: 'The consulting report template is not consumed by the current runtime.',
  },
  {
    concern: 'diagnostic_summary_template',
    file_path:
      'bioelectro-copilot-contracts/contracts/reports/diagnostic_summary_template.md',
    authority_role: 'future_facing_reference',
    note: 'The diagnostic summary template is not consumed by the current runtime.',
  },
];

export const runtimeLoadedCanonicalFiles = runtimeAuthoritySources
  .filter((entry) => entry.authority_role === 'runtime_loaded')
  .map((entry) => entry.file_path);

export const runtimeValidationReferenceFiles = runtimeAuthoritySources
  .filter((entry) => entry.authority_role === 'validation_reference')
  .map((entry) => entry.file_path);

export const runtimeReferenceOnlyFiles = runtimeAuthoritySources
  .filter((entry) => entry.authority_role === 'reference_only')
  .map((entry) => entry.file_path);

export const runtimeFutureFacingReferenceFiles = runtimeAuthoritySources
  .filter((entry) => entry.authority_role === 'future_facing_reference')
  .map((entry) => entry.file_path);
