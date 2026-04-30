import fixture from '../fixtures/raw-case-input.json';

import { describe, expect, it } from 'vitest';

import {
  canonicalOutputSections,
  createRawInputFromDomainTemplate,
  loadContractInputDefinition,
  loadContractOutputDefinition,
  normalizeCaseInput,
  normalizedCaseInputSchema,
  rawCaseInputSchema,
  runtimeAuthorityDecision,
  runtimeFutureFacingReferenceFiles,
  runtimeLoadedCanonicalFiles,
  runtimeReferenceOnlyFiles,
  runtimeValidationReferenceFiles,
} from '@metrev/domain-contracts';

describe('domain-contract runtime alignment', () => {
  it('normalizes the runtime fixture into the contract-aligned shape', () => {
    const raw = rawCaseInputSchema.parse(fixture);
    const normalized = normalizeCaseInput(raw);

    expect(normalizedCaseInputSchema.parse(normalized)).toEqual(normalized);
    expect(normalized.case_id).toBe('CASE-001');
    expect(normalized.technology_family).toBe('microbial_fuel_cell');
  });

  it('maps legacy aliases and typed evidence into canonical normalized fields', () => {
    const normalized = normalizeCaseInput(
      rawCaseInputSchema.parse({
        case_id: 'CASE-EVIDENCE-001',
        technology_family: 'hybrid_or_other_met',
        architecture_family: 'modular_stack',
        primary_objective: 'other',
        technology_context: {
          current_trl: 'pilot',
        },
        evidence_records: [
          {
            evidence_type: 'supplier_claim',
            title: 'Vendor stack brief',
            summary:
              'Claims improved serviceability and lower maintenance burden.',
            applicability_scope: {},
            strength_level: 'weak',
            provenance_note: 'Submitted during intake.',
          },
        ],
      }),
    );

    expect(normalized.technology_family).toBe(
      'microbial_electrochemical_technology',
    );
    expect(
      normalized.cross_cutting_layers.evidence_and_provenance.typed_evidence,
    ).toHaveLength(1);
    expect(normalized.cross_cutting_layers.risk_and_maturity.trl).toBe(5);
  });

  it('marks penalized evidence as a trace-limited evidence profile during normalization', () => {
    const normalized = normalizeCaseInput(
      rawCaseInputSchema.parse({
        ...fixture,
        case_id: 'CASE-EVIDENCE-TRACE-001',
        evidence_records: [
          {
            evidence_id: 'catalog:trace-penalty-001',
            evidence_type: 'literature_evidence',
            title: 'Pending PDF-derived benchmark',
            summary:
              'The source is relevant, but metadata completeness and review state still limit confidence.',
            applicability_scope: {
              source_document_id: 'source-doc-trace-001',
            },
            strength_level: 'strong',
            provenance_note:
              'Imported from a local PDF and awaiting final review.',
            review_status: 'pending',
            metadata_quality: {
              score: 0.36,
              level: 'low',
              present_fields: ['source_document_id'],
              missing_fields: ['doi', 'license'],
              categories: {},
              notes: ['Incomplete artifact metadata.'],
            },
            veracity_score: {
              score: 0.48,
              level: 'medium',
              components: {
                source_rigor: 0.72,
                metadata_completeness: 0.36,
                measurement_quality: 0.55,
                extraction_method: 0.7,
                trace_quality: 0.4,
                normalization_support: 0.2,
                review_status: 0.3,
                relevance: 0.76,
                recency_context_fit: 0.7,
                corroboration_conflict: 0.52,
              },
              confidence_penalties: [
                'pending_or_unaccepted_review',
                'low_metadata_quality',
              ],
              notes: ['Awaiting analyst review and fuller metadata.'],
            },
          },
        ],
      }),
    );

    expect(
      normalized.cross_cutting_layers.evidence_and_provenance.evidence_profile,
    ).toBe('single_source_with_trace_penalties');
    expect(
      normalized.cross_cutting_layers.evidence_and_provenance.typed_evidence[0],
    ).toEqual(
      expect.objectContaining({
        review_status: 'pending',
        applicability_scope: expect.objectContaining({
          source_document_id: 'source-doc-trace-001',
        }),
      }),
    );
  });

  it('records invalid core classifications as explicit fallback usage', () => {
    const normalized = normalizeCaseInput(
      rawCaseInputSchema.parse({
        case_id: 'CASE-INVALID-001',
        technology_family: 'typo_value',
        architecture_family: 'single_chamber',
        primary_objective: 'not_a_real_objective',
        technology_context: {
          current_trl: 'not_a_real_trl',
        },
      }),
    );

    expect(normalized.defaults_used).toEqual(
      expect.arrayContaining([
        'technology_family:invalid_input_fallback',
        'primary_objective:invalid_input_fallback',
        'technology_context.current_trl:invalid_input_fallback',
      ]),
    );
    expect(normalized.missing_data).toEqual(
      expect.arrayContaining([
        'technology_family',
        'primary_objective',
        'technology_context.current_trl',
      ]),
    );
  });

  it('normalizes the domain case template into a valid runtime case', () => {
    const raw = createRawInputFromDomainTemplate();
    const normalized = normalizeCaseInput(raw);

    expect(normalizedCaseInputSchema.safeParse(normalized).success).toBe(true);
    expect(normalized.cross_cutting_layers).toBeDefined();
    expect(normalized.stack_blocks.reactor_architecture).toBeDefined();
  });

  it('loads contract required field metadata from the canonical contract boundary', () => {
    const contractInput = loadContractInputDefinition();

    expect(contractInput.normalized_case_input.required_fields).toEqual(
      expect.arrayContaining([
        'case_id',
        'technology_family',
        'architecture_family',
        'primary_objective',
      ]),
    );
  });

  it('keeps the executed authority split explicit and reviewable', () => {
    expect(runtimeAuthorityDecision.executed_rule_authority).toBe(
      'contract-first',
    );
    expect(runtimeLoadedCanonicalFiles).toEqual(
      expect.arrayContaining([
        'bioelectrochem_agent_kit/domain/cases/templates/client-case-template.yml',
        'bioelectro-copilot-contracts/contracts/rules/defaults.yaml',
        'bioelectro-copilot-contracts/contracts/rules/compatibility.yaml',
        'bioelectro-copilot-contracts/contracts/rules/diagnostics.yaml',
        'bioelectro-copilot-contracts/contracts/rules/improvements.yaml',
        'bioelectro-copilot-contracts/contracts/rules/scoring.yaml',
        'bioelectro-copilot-contracts/contracts/rules/sensitivity.yaml',
        'bioelectro-copilot-contracts/contracts/output_contract.yaml',
      ]),
    );
    expect(runtimeValidationReferenceFiles).toEqual(
      expect.arrayContaining([
        'bioelectro-copilot-contracts/contracts/input_schema.yaml',
        'bioelectro-copilot-contracts/contracts/ontology/stack.yaml',
        'bioelectro-copilot-contracts/contracts/ontology/property_dictionary.yaml',
        'bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml',
      ]),
    );
    expect(runtimeReferenceOnlyFiles).toContain('stack.md');
    expect(runtimeFutureFacingReferenceFiles).toEqual(
      expect.arrayContaining([
        'bioelectrochem_agent_kit/domain/ontology/component-graph.yml',
        'bioelectro-copilot-contracts/contracts/ontology/relations.yaml',
        'bioelectro-copilot-contracts/contracts/reports/consulting_report_template.md',
        'bioelectro-copilot-contracts/contracts/reports/diagnostic_summary_template.md',
      ]),
    );
  });

  it('keeps canonical output sections aligned with the hardened output contract', () => {
    const contractOutput = loadContractOutputDefinition();

    expect(contractOutput.normalized_decision_output.required_sections).toEqual(
      expect.arrayContaining(canonicalOutputSections),
    );
    expect(canonicalOutputSections).toHaveLength(
      contractOutput.normalized_decision_output.required_sections.length,
    );
  });
});
