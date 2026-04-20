import fixture from '../fixtures/raw-case-input.json';

import { describe, expect, it } from 'vitest';

import { createAuditRecord } from '@metrev/audit';
import {
  evaluationResponseSchema,
  normalizeCaseInput,
  type RawCaseInput,
} from '@metrev/domain-contracts';
import { runCaseEvaluation } from '@metrev/rule-engine';
import { deriveSupplierPersistencePlan } from '../../packages/database/src/supplier-persistence';

describe('supplier persistence planning', () => {
  it('projects supplier preferences, shortlist links, and evidence links into relational records', () => {
    const rawInput: RawCaseInput = {
      ...fixture,
      supplier_context: {
        current_suppliers: ['Current Supplier'],
        preferred_suppliers: ['Preferred Supplier'],
        excluded_suppliers: ['Blocked Supplier'],
        supplier_preference_notes: 'Maintain current service coverage while qualifying one preferred vendor.',
      },
      evidence_records: [
        {
          evidence_type: 'supplier_claim',
          title: 'Preferred supplier datasheet',
          summary: 'A membrane supplier claims compatibility with the target chemistry.',
          strength_level: 'weak',
          provenance_note: 'Supplier-provided datasheet pending independent validation.',
          supplier_name: 'Preferred Supplier',
        },
      ],
    };

    const normalizedCase = normalizeCaseInput(rawInput);
    const decisionOutput = runCaseEvaluation(normalizedCase);
    const auditRecord = createAuditRecord({
      actorRole: 'ANALYST',
      actorId: 'user-analyst-001',
      decisionOutput,
      normalizedCase,
      rawInput,
      runtimeVersions: {
        contract_version: '0.3',
        ontology_version: '0.3',
        ruleset_version: '0.3',
        prompt_version: 'phase-3-supplier-persistence-test',
        model_version: 'not_applicable',
        workspace_schema_version: '014.0.0',
      },
      entrypoint: 'test',
      evaluationId: 'evaluation-supplier-001',
    });

    const evaluation = evaluationResponseSchema.parse({
      evaluation_id: 'evaluation-supplier-001',
      case_id: normalizedCase.case_id,
      normalized_case: normalizedCase,
      decision_output: decisionOutput,
      audit_record: auditRecord,
      narrative: null,
      narrative_metadata: {
        mode: 'stub',
        status: 'generated',
        provider: 'deterministic-runtime',
        model: null,
        fallback_used: false,
        prompt_version: 'phase-3-supplier-persistence-test',
        generated_at: auditRecord.timestamp,
      },
    });

    const plan = deriveSupplierPersistencePlan(evaluation);

    expect(plan.suppliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedName: 'current supplier',
          displayName: 'Current Supplier',
        }),
        expect.objectContaining({
          normalizedName: 'preferred supplier',
          displayName: 'Preferred Supplier',
          category: 'preferred_suppliers',
        }),
        expect.objectContaining({
          normalizedName: 'blocked supplier',
          displayName: 'Blocked Supplier',
        }),
      ]),
    );

    expect(plan.casePreferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          supplierLabel: 'Current Supplier',
          preferenceType: 'CURRENT',
          sourceState: 'NORMALIZED',
        }),
        expect.objectContaining({
          supplierLabel: 'Preferred Supplier',
          preferenceType: 'PREFERRED',
          sourceState: 'NORMALIZED',
        }),
        expect.objectContaining({
          supplierLabel: 'Blocked Supplier',
          preferenceType: 'EXCLUDED',
          sourceState: 'NORMALIZED',
        }),
      ]),
    );

    expect(plan.shortlistItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateLabel: 'Preferred Supplier',
          category: 'preferred_suppliers',
          supplierNormalizedName: 'preferred supplier',
          reviewStatus: 'REVIEWED',
        }),
      ]),
    );

    expect(plan.evidenceLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          supplierNormalizedName: 'preferred supplier',
        }),
      ]),
    );
  });
});
