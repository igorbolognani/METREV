'use client';

import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';

export const evaluationConfidenceFilterValues = [
  'all',
  'high',
  'medium',
  'low',
] as const;

export const evaluationSortKeyValues = [
  'created_at',
  'confidence_level',
  'case_id',
] as const;

export const evaluationSortDirectionValues = ['asc', 'desc'] as const;

export type EvaluationConfidenceFilter =
  (typeof evaluationConfidenceFilterValues)[number];
export type EvaluationSortKey = (typeof evaluationSortKeyValues)[number];
export type EvaluationSortDirection =
  (typeof evaluationSortDirectionValues)[number];

const searchParser = parseAsString
  .withDefault('')
  .withOptions({ clearOnDefault: true, history: 'replace' });

const confidenceParser = parseAsStringLiteral(evaluationConfidenceFilterValues)
  .withDefault('all')
  .withOptions({ clearOnDefault: true, history: 'push' });

const sortKeyParser = parseAsStringLiteral(evaluationSortKeyValues)
  .withDefault('created_at')
  .withOptions({ clearOnDefault: true, history: 'push' });

const sortDirectionParser = parseAsStringLiteral(evaluationSortDirectionValues)
  .withDefault('desc')
  .withOptions({ clearOnDefault: true, history: 'push' });

export function useEvaluationsListQueryState() {
  const [searchInput, setSearchInput] = useQueryState('q', searchParser);
  const [confidenceFilter, setConfidenceFilter] = useQueryState(
    'confidence',
    confidenceParser,
  );
  const [sortKey, setSortKey] = useQueryState('sort', sortKeyParser);
  const [sortDirection, setSortDirection] = useQueryState(
    'dir',
    sortDirectionParser,
  );

  return {
    confidenceFilter,
    searchInput,
    setConfidenceFilter,
    setSearchInput,
    setSortDirection,
    setSortKey,
    sortDirection,
    sortKey,
  };
}
