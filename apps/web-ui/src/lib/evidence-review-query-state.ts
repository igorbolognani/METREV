'use client';

import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';

export const evidenceReviewFilterValues = [
  'all',
  'pending',
  'accepted',
  'rejected',
] as const;

export type EvidenceReviewFilter = (typeof evidenceReviewFilterValues)[number];

const filterParser = parseAsStringLiteral(evidenceReviewFilterValues)
  .withDefault('all')
  .withOptions({ history: 'push' });

const searchParser = parseAsString
  .withDefault('')
  .withOptions({ clearOnDefault: true, history: 'replace' });

export function useEvidenceReviewQueryState() {
  const [filter, setFilter] = useQueryState('status', filterParser);
  const [searchInput, setSearchInput] = useQueryState('q', searchParser);

  return {
    filter,
    searchInput,
    setFilter,
    setSearchInput,
  };
}
