'use client';

import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';

export const evidenceReviewFilterValues = [
  'all',
  'pending',
  'accepted',
  'rejected',
] as const;

export type EvidenceReviewFilter = (typeof evidenceReviewFilterValues)[number];

const searchParser = parseAsString
  .withDefault('')
  .withOptions({ clearOnDefault: true, history: 'replace' });

export function useEvidenceReviewQueryState(
  defaultFilter: EvidenceReviewFilter = 'all',
) {
  const filterParser = parseAsStringLiteral(evidenceReviewFilterValues)
    .withDefault(defaultFilter)
    .withOptions({ history: 'push' });
  const [filter, setFilter] = useQueryState('status', filterParser);
  const [searchInput, setSearchInput] = useQueryState('q', searchParser);

  return {
    filter,
    searchInput,
    setFilter,
    setSearchInput,
  };
}
