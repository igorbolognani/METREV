export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface CoverageEntryLike {
  coverage_level: 'absent' | 'sparse' | 'sufficient' | 'strong';
  recency_status: 'current' | 'aging' | 'stale' | 'unknown';
  system_type: string | null;
  metric_type: string;
  component_type: string | null;
  material: string | null;
  record_count: number;
}

export interface FunnelStageCountLike {
  stage: string;
  count: number;
  conversion_rate?: number | null;
}
