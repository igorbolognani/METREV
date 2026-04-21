'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';

export const evaluationTabValues = [
  'overview',
  'recommendations',
  'modeling',
  'roadmap',
  'audit',
] as const;

export type EvaluationTab = (typeof evaluationTabValues)[number];

const evaluationTabParser = parseAsStringLiteral(evaluationTabValues)
  .withDefault('overview')
  .withOptions({ history: 'push' });

export function useEvaluationTab() {
  return useQueryState('tab', evaluationTabParser);
}
