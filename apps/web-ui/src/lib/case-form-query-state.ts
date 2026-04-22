'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';

export const caseFormStepValues = [
  'context',
  'operation',
  'suppliers-evidence',
  'review-submit',
] as const;

export type CaseFormStep = (typeof caseFormStepValues)[number];

export const caseFormSteps = [
  {
    description: 'System context, deployment posture, and decision framing.',
    label: 'Context',
    value: 'context',
  },
  {
    description: 'Operating envelope, pain points, and numeric conditions.',
    label: 'Operation',
    value: 'operation',
  },
  {
    description: 'Supplier posture, membrane context, and evidence intake.',
    label: 'Suppliers & Evidence',
    value: 'suppliers-evidence',
  },
  {
    description: 'Final review, assumptions, autosave status, and submit.',
    label: 'Review & Submit',
    value: 'review-submit',
  },
] as const satisfies ReadonlyArray<{
  description: string;
  label: string;
  value: CaseFormStep;
}>;

const caseFormStepParser = parseAsStringLiteral(caseFormStepValues)
  .withDefault('context')
  .withOptions({ history: 'push' });

export function getCaseFormStepIndex(step: CaseFormStep): number {
  return caseFormStepValues.indexOf(step);
}

export function useCaseFormStep() {
  return useQueryState('step', caseFormStepParser);
}
