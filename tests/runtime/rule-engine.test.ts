import fixture from '../fixtures/raw-case-input.json';

import { describe, expect, it } from 'vitest';

import {
  decisionOutputSchema,
  normalizeCaseInput,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import { runCaseEvaluation } from '@metrev/rule-engine';

describe('rule engine', () => {
  it('produces a structured decision output for a normalized case', () => {
    const normalized = normalizeCaseInput(rawCaseInputSchema.parse(fixture));
    const decisionOutput = runCaseEvaluation(normalized);

    expect(decisionOutputSchema.parse(decisionOutput)).toEqual(decisionOutput);
    expect(
      decisionOutput.prioritized_improvement_options.length,
    ).toBeGreaterThan(0);
    expect(
      decisionOutput.confidence_and_uncertainty_summary.next_tests.length,
    ).toBeGreaterThan(0);
  });
});
