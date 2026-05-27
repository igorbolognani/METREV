import {
  funnelStageCountSchema,
  type FunnelStageCount,
} from '@metrev/domain-contracts';

export interface FunnelCountInput {
  stage: string;
  count: number;
}

export function buildFunnelMetrics(
  counts: FunnelCountInput[],
): FunnelStageCount[] {
  return counts.map((entry, index) => {
    const previous = index === 0 ? null : (counts[index - 1]?.count ?? null);
    const conversionRate =
      previous === null
        ? null
        : previous === 0
          ? entry.count === 0
            ? 1
            : 0
          : entry.count / previous;

    return funnelStageCountSchema.parse({
      stage: entry.stage,
      count: entry.count,
      conversion_rate:
        conversionRate === null
          ? null
          : Math.max(0, Math.min(1, conversionRate)),
    });
  });
}
