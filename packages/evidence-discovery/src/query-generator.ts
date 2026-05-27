import { randomUUID } from 'node:crypto';

import {
  discoveryTargetSchema,
  loadEvidenceDiscoveryPolicy,
  type DiscoveryTarget,
  type EvidenceGap,
} from '@metrev/domain-contracts';

function getDimensionMappings(): Record<string, Record<string, string[]>> {
  const policy = loadEvidenceDiscoveryPolicy();
  const queryGeneration = policy.query_generation as {
    dimension_mappings?: Record<string, Record<string, string[]>>;
  };
  return queryGeneration.dimension_mappings ?? {};
}

function getQueryLimits(): { maxTerms: number; maxLength: number } {
  const policy = loadEvidenceDiscoveryPolicy();
  const queryGeneration = policy.query_generation as {
    max_terms_per_query?: unknown;
    max_query_length?: unknown;
  };

  return {
    maxTerms:
      typeof queryGeneration.max_terms_per_query === 'number'
        ? queryGeneration.max_terms_per_query
        : 6,
    maxLength:
      typeof queryGeneration.max_query_length === 'number'
        ? queryGeneration.max_query_length
        : 500,
  };
}

function mappedTerms(
  mappings: Record<string, Record<string, string[]>>,
  dimension: string,
  value: string | null,
): string[] {
  if (!value) {
    return [];
  }

  return mappings[dimension]?.[value] ?? [value.replaceAll('_', ' ')];
}

function queryForGap(gap: EvidenceGap): string {
  const mappings = getDimensionMappings();
  const limits = getQueryLimits();
  const terms = [
    ...mappedTerms(mappings, 'system_type', gap.system_type),
    ...mappedTerms(mappings, 'component_type', gap.component_type),
    gap.material?.replaceAll('_', ' ') ?? '',
    ...mappedTerms(mappings, 'metric_type', gap.metric_type),
  ].filter((term) => term.trim().length > 0);

  return Array.from(new Set(terms))
    .slice(0, limits.maxTerms)
    .join(' ')
    .slice(0, limits.maxLength);
}

export function generateDiscoveryQueries(input: {
  gaps: EvidenceGap[];
  maxQueries?: number;
  auditReportId?: string | null;
}): DiscoveryTarget[] {
  const maxQueries = input.maxQueries ?? 20;

  return input.gaps
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxQueries)
    .map((gap) =>
      discoveryTargetSchema.parse({
        target_id: randomUUID(),
        audit_report_id: input.auditReportId ?? null,
        gap_id: gap.gap_id,
        query: gap.recommended_query ?? queryForGap(gap),
        providers: ['openalex', 'crossref', 'europe_pmc'],
        priority: gap.priority,
        status: 'queued',
        records_found: 0,
        records_staged: 0,
        created_at: new Date().toISOString(),
        completed_at: null,
      }),
    );
}
