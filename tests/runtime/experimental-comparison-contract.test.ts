import { describe, expect, it } from 'vitest';

import {
  developmentComparisonBlockedResultSchema,
  developmentComparisonResidualResultSchema,
  experimentalComparisonBlockedResultSchema,
  experimentalComparisonCoordinateSchema,
  experimentalComparisonReasonSchema,
  experimentalComparisonRequestSchema,
  experimentalComparisonResidualResultSchema,
  experimentalModelPredictionSchema,
  experimentalObservationSchema,
  loadExperimentalComparisonContract,
  runtimeCanonicalReconciliationMatrix,
  runtimeValidationReferenceFiles,
} from '@metrev/domain-contracts';

type RuntimeFieldSchema = { isOptional: () => boolean };
type RuntimeObjectShape = Record<string, RuntimeFieldSchema>;

function getObjectShape(schema: unknown): RuntimeObjectShape {
  const candidate = schema as {
    shape?: RuntimeObjectShape;
    _def?: { schema?: { shape?: RuntimeObjectShape } };
  };
  const shape = candidate.shape ?? candidate._def?.schema?.shape;

  if (!shape) {
    throw new Error('Expected a Zod object schema.');
  }

  return shape;
}

function getEnumOptions(schema: unknown): string[] {
  const candidate = schema as { options?: readonly string[] };

  if (!candidate.options) {
    throw new Error('Expected a Zod enum schema.');
  }

  return [...candidate.options];
}

function getLiteralValue(schema: unknown): unknown {
  const candidate = schema as { value?: unknown; _def?: { value?: unknown } };
  const value = candidate.value ?? candidate._def?.value;

  if (value === undefined) {
    throw new Error('Expected a Zod literal schema.');
  }

  return value;
}

describe('experimental comparison contract reconciliation', () => {
  const contract = loadExperimentalComparisonContract();

  it('publishes a versioned, portable JSON Schema for request and result payloads', () => {
    expect(contract.$schema).toBe(
      'https://json-schema.org/draft/2020-12/schema',
    );
    expect(contract.$id).toBe(
      'urn:metrev:contracts:evaluation:experimental-comparison:1.1.0',
    );
    expect(contract['x-contract-version']).toBe('1.1.0');
    expect(contract.$ref).toBe('#/$defs/ComparisonRequest');
    expect(contract.$defs.ComparisonResult.oneOf).toEqual([
      { $ref: '#/$defs/BlockedResult' },
      { $ref: '#/$defs/ResidualResult' },
    ]);
    expect(contract.$defs.DevelopmentComparisonResult.oneOf).toEqual([
      { $ref: '#/$defs/DevelopmentBlockedResult' },
      { $ref: '#/$defs/DevelopmentResidualResult' },
    ]);
    expect(
      contract.$defs.BlockedResult.properties?.assessment_status.const,
    ).toBe('not_assessed');
    expect(
      contract.$defs.ResidualResult.properties?.assessment_status.const,
    ).toBe('not_assessed');
  });

  it('keeps Zod object fields and required fields aligned with the canonical schema', () => {
    const schemaPairs = [
      ['ComparisonCoordinate', experimentalComparisonCoordinateSchema],
      ['ModeledPrediction', experimentalModelPredictionSchema],
      ['ExperimentalObservation', experimentalObservationSchema],
      ['ComparisonRequest', experimentalComparisonRequestSchema],
      ['BlockedResult', experimentalComparisonBlockedResultSchema],
      ['ResidualResult', experimentalComparisonResidualResultSchema],
      ['DevelopmentBlockedResult', developmentComparisonBlockedResultSchema],
      ['DevelopmentResidualResult', developmentComparisonResidualResultSchema],
    ] as const;

    for (const [contractName, runtimeSchema] of schemaPairs) {
      const definition = contract.$defs[contractName];
      const runtimeShape = getObjectShape(runtimeSchema);
      const runtimeFields = Object.keys(runtimeShape).sort();
      const runtimeRequiredFields = Object.entries(runtimeShape)
        .filter(([, fieldSchema]) => !fieldSchema.isOptional())
        .map(([fieldName]) => fieldName)
        .sort();

      expect(Object.keys(definition.properties ?? {}).sort()).toEqual(
        runtimeFields,
      );
      expect([...(definition.required ?? [])].sort()).toEqual(
        runtimeRequiredFields,
      );
    }
  });

  it('keeps source, review, role, condition, and reason enums aligned', () => {
    const observationShape = getObjectShape(experimentalObservationSchema);
    const observationProperties =
      contract.$defs.ExperimentalObservation.properties ?? {};

    expect(observationProperties.source_kind.enum).toEqual(
      getEnumOptions(observationShape.source_kind),
    );
    expect(observationProperties.review_status.enum).toEqual(
      getEnumOptions(observationShape.review_status),
    );
    expect(observationProperties.dataset_role.enum).toEqual(
      getEnumOptions(observationShape.dataset_role),
    );
    expect(observationProperties.condition_match_status.enum).toEqual(
      getEnumOptions(observationShape.condition_match_status),
    );
    expect(contract.$defs.ComparisonReasonCode.enum).toEqual(
      getEnumOptions(experimentalComparisonReasonSchema),
    );
  });

  it('keeps modeled, blocked, residual, and assessment status literals aligned', () => {
    const predictionShape = getObjectShape(experimentalModelPredictionSchema);
    const blockedShape = getObjectShape(
      experimentalComparisonBlockedResultSchema,
    );
    const residualShape = getObjectShape(
      experimentalComparisonResidualResultSchema,
    );
    const developmentBlockedShape = getObjectShape(
      developmentComparisonBlockedResultSchema,
    );
    const developmentResidualShape = getObjectShape(
      developmentComparisonResidualResultSchema,
    );
    const definitions = contract.$defs;

    expect(definitions.ModeledPrediction.properties?.source_kind.const).toBe(
      getLiteralValue(predictionShape.source_kind),
    );
    expect(definitions.BlockedResult.properties?.status.const).toBe(
      getLiteralValue(blockedShape.status),
    );
    expect(definitions.BlockedResult.properties?.assessment_status.const).toBe(
      getLiteralValue(blockedShape.assessment_status),
    );
    expect(definitions.ResidualResult.properties?.status.const).toBe(
      getLiteralValue(residualShape.status),
    );
    expect(definitions.ResidualResult.properties?.assessment_status.const).toBe(
      getLiteralValue(residualShape.assessment_status),
    );
    expect(definitions.DevelopmentBlockedResult.properties?.status.const).toBe(
      getLiteralValue(developmentBlockedShape.status),
    );
    expect(
      definitions.DevelopmentBlockedResult.properties?.assessment_status.const,
    ).toBe(getLiteralValue(developmentBlockedShape.assessment_status));
    expect(definitions.DevelopmentResidualResult.properties?.status.const).toBe(
      getLiteralValue(developmentResidualShape.status),
    );
    expect(
      definitions.DevelopmentResidualResult.properties?.assessment_status.const,
    ).toBe(getLiteralValue(developmentResidualShape.assessment_status));
  });

  it('records the conditional approval and condition-match requirements', () => {
    expect(contract.$defs.ExperimentalObservation.allOf).toEqual([
      {
        if: {
          properties: { review_status: { const: 'approved' } },
          required: ['review_status'],
        },
        then: { required: ['reviewed_by', 'reviewed_at'] },
      },
      {
        if: {
          properties: { condition_match_status: { const: 'matched' } },
          required: ['condition_match_status'],
        },
        then: { required: ['condition_match_note'] },
      },
    ]);
  });

  it('registers the contract with runtime reconciliation', () => {
    const contractPath =
      'bioelectro-copilot-contracts/contracts/evaluation/experimental-comparison.schema.yaml';

    expect(runtimeValidationReferenceFiles).toContain(contractPath);
    expect(
      runtimeCanonicalReconciliationMatrix.find(
        (entry) => entry.concern === 'experimental_comparison',
      ),
    ).toMatchObject({
      contract_source: `${contractPath}#/$defs/ComparisonRequest | #/$defs/ComparisonResult`,
      runtime_path:
        'packages/domain-contracts/src/experimental-validation.ts#experimentalComparisonRequestSchema | #experimentalComparisonResultSchema',
    });
    expect(
      runtimeCanonicalReconciliationMatrix.find(
        (entry) => entry.concern === 'experimental_comparison_development',
      ),
    ).toMatchObject({
      contract_source: `${contractPath}#/$defs/ComparisonRequest | #/$defs/DevelopmentComparisonResult`,
      runtime_path:
        'packages/domain-contracts/src/experimental-validation.ts#experimentalComparisonRequestSchema | #developmentComparisonResultSchema',
    });
  });
});
