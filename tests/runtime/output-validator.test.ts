import fixture from '../fixtures/raw-case-input.json';

import { describe, expect, it, vi } from 'vitest';

import {
  normalizeCaseInput,
  rawCaseInputSchema,
  validateDecisionOutputContract,
} from '@metrev/domain-contracts';
import { runCaseEvaluation } from '@metrev/rule-engine';

function createDecisionOutput() {
  const raw = rawCaseInputSchema.parse(fixture);
  const normalized = normalizeCaseInput(raw);

  return runCaseEvaluation(normalized);
}

describe('output contract validator', () => {
  it('accepts the current deterministic decision output', () => {
    const decisionOutput = createDecisionOutput();
    const logger = vi.fn();

    const result = validateDecisionOutputContract({
      decisionOutput,
      environment: 'test',
      logger,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.decisionOutput).toEqual(decisionOutput);
    expect(logger).not.toHaveBeenCalled();
  });

  it('logs missing required sections without blocking outside production', () => {
    const invalidDecisionOutput: Record<string, unknown> = {
      ...createDecisionOutput(),
    };
    delete invalidDecisionOutput.supplier_shortlist;
    const logger = vi.fn();

    const result = validateDecisionOutputContract({
      decisionOutput: invalidDecisionOutput,
      environment: 'staging',
      logger,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'supplier_shortlist',
          received: undefined,
        }),
      ]),
    );
    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'supplier_shortlist',
        received: undefined,
      }),
    );
  });

  it('blocks invalid decision output in production mode', () => {
    const invalidDecisionOutput: Record<string, unknown> = {
      ...createDecisionOutput(),
    };
    delete invalidDecisionOutput.supplier_shortlist;

    expect(() =>
      validateDecisionOutputContract({
        decisionOutput: invalidDecisionOutput,
        environment: 'production',
        logger: vi.fn(),
      }),
    ).toThrow(/Decision output contract validation failed/);
  });
});
