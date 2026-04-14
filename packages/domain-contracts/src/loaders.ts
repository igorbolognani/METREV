import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { contractsRootPath, domainRootPath } from './paths';

export interface ContractInputDefinition {
  normalized_case_input: {
    description: string;
    required_fields: string[];
    optional_fields?: string[];
  };
  field_groups?: Record<string, unknown>;
  rules?: string[];
}

export type ContractLifecycleSourceState =
  | 'raw'
  | 'parsed'
  | 'normalized'
  | 'reviewed';

export interface ContractOutputFieldDefinition {
  type: string;
  source_state: ContractLifecycleSourceState;
  required: boolean;
  missing_behavior: string;
}

export interface ContractOutputSectionDefinition extends ContractOutputFieldDefinition {
  fields?: Record<string, ContractOutputFieldDefinition>;
}

export interface ContractOutputRecordDefinition {
  required_fields: string[];
  optional_fields?: string[];
  fields?: Record<string, ContractOutputFieldDefinition>;
}

export interface ContractLifecycleStateDefinition {
  produced_by: string;
  validated_by: string[];
  persisted_as: string[];
}

export interface ContractOutputDefinition {
  version?: string;
  normalized_decision_output: {
    required_sections: string[];
    sections?: Record<string, ContractOutputSectionDefinition>;
  };
  recommendation_record: ContractOutputRecordDefinition;
  impact_map_record?: ContractOutputRecordDefinition;
  supplier_shortlist_record?: ContractOutputRecordDefinition;
  phased_roadmap_record?: ContractOutputRecordDefinition;
  canonical_lifecycle?: {
    states: Record<string, ContractLifecycleStateDefinition>;
  };
  guardrails?: string[];
}

export interface ContractDefaultsPolicy {
  defaults_policy: {
    principle: string;
    defaults: Record<
      string,
      { default: string | number; justification: string }
    >;
    missing_data_flags: string[];
    rule: string;
  };
}

export interface ContractCompatibilityDefinition {
  compatibility_rules: Array<{
    id: string;
    condition: Record<string, unknown>;
    finding: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface ContractDiagnosticsDefinition {
  diagnostic_rules: Array<{
    id: string;
    name: string;
    trigger: Record<string, unknown>;
    diagnosis: string;
    confidence: 'low' | 'medium' | 'high';
    expected_effects?: string[];
  }>;
}

export interface ContractImprovementsDefinition {
  improvement_rules: Array<{
    id: string;
    linked_diagnosis: string;
    action: string;
    expected_impacts: Record<string, string>;
  }>;
}

export interface ContractScoringModel {
  scoring_model: {
    principle: string;
    dimensions: Record<
      string,
      {
        weight: number;
        scale: number[];
        invert?: boolean;
      }
    >;
    output: {
      final_priority_score: {
        range: [number, number];
      };
    };
    rule: string;
  };
}

export interface ContractSensitivityPolicy {
  sensitivity_policy: {
    principle: string;
    tracked_factors: string[];
    rule: string;
  };
}

export interface ContractSupplierNormalization {
  supplier_normalization: {
    fields: Record<string, unknown>;
    rule: string;
  };
}

export interface ContractEvidenceSchema {
  evidence_record: {
    required_fields: string[];
    optional_fields?: string[];
  };
  fields: Record<string, unknown>;
  rules?: string[];
}

export interface ContractPropertyDictionary {
  version: string;
  properties: Array<{
    name: string;
    type: string;
    allowed?: string[];
    description?: string;
  }>;
}

export interface ContractStackOntology {
  canonical_entities: Record<string, unknown>;
  stack_blocks: Record<string, unknown>;
  cross_cutting_layers: Record<string, unknown>;
}

export function loadYamlFile<T>(filePath: string): T {
  return yaml.load(readFileSync(filePath, 'utf8')) as T;
}

export function loadContractInputDefinition(): ContractInputDefinition {
  return loadYamlFile<ContractInputDefinition>(
    resolve(contractsRootPath, 'input_schema.yaml'),
  );
}

export function loadContractOutputDefinition(): ContractOutputDefinition {
  return loadYamlFile<ContractOutputDefinition>(
    resolve(contractsRootPath, 'output_contract.yaml'),
  );
}

export function loadContractDefaultsPolicy(): ContractDefaultsPolicy {
  return loadYamlFile<ContractDefaultsPolicy>(
    resolve(contractsRootPath, 'rules/defaults.yaml'),
  );
}

export function loadContractCompatibilityDefinition(): ContractCompatibilityDefinition {
  return loadYamlFile<ContractCompatibilityDefinition>(
    resolve(contractsRootPath, 'rules/compatibility.yaml'),
  );
}

export function loadContractDiagnosticsDefinition(): ContractDiagnosticsDefinition {
  return loadYamlFile<ContractDiagnosticsDefinition>(
    resolve(contractsRootPath, 'rules/diagnostics.yaml'),
  );
}

export function loadContractImprovementsDefinition(): ContractImprovementsDefinition {
  return loadYamlFile<ContractImprovementsDefinition>(
    resolve(contractsRootPath, 'rules/improvements.yaml'),
  );
}

export function loadContractScoringModel(): ContractScoringModel {
  return loadYamlFile<ContractScoringModel>(
    resolve(contractsRootPath, 'rules/scoring.yaml'),
  );
}

export function loadContractSensitivityPolicy(): ContractSensitivityPolicy {
  return loadYamlFile<ContractSensitivityPolicy>(
    resolve(contractsRootPath, 'rules/sensitivity.yaml'),
  );
}

export function loadContractSupplierNormalization(): ContractSupplierNormalization {
  return loadYamlFile<ContractSupplierNormalization>(
    resolve(contractsRootPath, 'suppliers/normalization.yaml'),
  );
}

export function loadContractEvidenceSchema(): ContractEvidenceSchema {
  return loadYamlFile<ContractEvidenceSchema>(
    resolve(contractsRootPath, 'ontology/evidence_schema.yaml'),
  );
}

export function loadContractPropertyDictionary(): ContractPropertyDictionary {
  return loadYamlFile<ContractPropertyDictionary>(
    resolve(contractsRootPath, 'ontology/property_dictionary.yaml'),
  );
}

export function loadContractStackOntology(): ContractStackOntology {
  return loadYamlFile<ContractStackOntology>(
    resolve(contractsRootPath, 'ontology/stack.yaml'),
  );
}

export function loadDomainCaseTemplate(): Record<string, unknown> {
  return loadYamlFile<Record<string, unknown>>(
    resolve(domainRootPath, 'cases/templates/client-case-template.yml'),
  );
}
