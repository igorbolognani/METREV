'use client';

import {
    CoverageHeatmap,
    FunnelChart,
    InstrumentPanel as Panel,
    SignalBadge,
    StatusBar,
} from '@metrev/design-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
    fetchAcquisitionStatus,
    fetchDiscoveryStatus,
    fetchEvidenceQualityReport,
    runEvidenceDiscovery,
    triggerEvidenceQualityAudit,
} from '@/lib/api';
import { formatToken } from '@/lib/formatting';

void React;

function qualityTone(level: string): 'healthy' | 'warning' | 'critical' {
  if (level === 'ready' || level === 'strong' || level === 'sufficient') {
    return 'healthy';
  }

  if (level === 'partial' || level === 'sparse' || level === 'aging') {
    return 'warning';
  }

  return 'critical';
}

function actionTone(action: string): 'healthy' | 'warning' | 'critical' {
  if (action === 'keep') {
    return 'healthy';
  }

  if (
    action === 'reacquire_full_text' ||
    action === 'rerun_extraction' ||
    action === 'quarantine_for_review'
  ) {
    return 'warning';
  }

  return 'critical';
}

export function EvidenceQualityWorkspace() {
  const queryClient = useQueryClient();
  const reportQuery = useQuery({
    queryKey: ['evidence-quality-report'],
    queryFn: fetchEvidenceQualityReport,
    retry: false,
  });
  const discoveryStatusQuery = useQuery({
    queryKey: ['evidence-discovery-status'],
    queryFn: fetchDiscoveryStatus,
  });
  const acquisitionStatusQuery = useQuery({
    queryKey: ['evidence-acquisition-status'],
    queryFn: fetchAcquisitionStatus,
  });
  const auditMutation = useMutation({
    mutationFn: () => triggerEvidenceQualityAudit(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['evidence-quality-report'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['evidence-discovery-status'],
      });
    },
  });
  const discoveryMutation = useMutation({
    mutationFn: () => runEvidenceDiscovery(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['evidence-discovery-status'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['evidence-acquisition-status'],
      });
    },
  });

  const report = reportQuery.data?.report ?? null;
  const discoveryStatus = discoveryStatusQuery.data;
  const acquisitionStatus = acquisitionStatusQuery.data;
  const readinessLevel = report?.readiness_scores.some(
    (score) => score.readiness_level === 'insufficient',
  )
    ? 'insufficient'
    : report?.readiness_scores.some(
          (score) => score.readiness_level === 'partial',
        )
      ? 'partial'
      : report
        ? 'ready'
        : 'no_audit';
  const criticalGaps =
    report?.gaps.filter((gap) => gap.severity === 'critical') ?? [];
  const topGaps = report?.gaps.slice(0, 8) ?? [];
  const topOutliers = report?.outliers.slice(0, 6) ?? [];
  const acceptedRecordReadiness = report?.accepted_record_readiness ?? [];

  return (
    <section className="evidence-quality-workspace">
      <div className="workspace-hero workspace-hero--instrument">
        <div>
          <span className="workspace-kicker">Evidence intelligence</span>
          <h1>Quality audit</h1>
          <p>
            Coverage, recency, gaps, outliers, and acquisition status for the
            decision evidence base.
          </p>
        </div>
        <div className="workspace-hero__actions">
          <Button
            disabled={auditMutation.isPending}
            onClick={() => auditMutation.mutate()}
          >
            {auditMutation.isPending ? 'Running audit' : 'Run audit'}
          </Button>
          <Button
            disabled={discoveryMutation.isPending || !report}
            onClick={() => discoveryMutation.mutate()}
            variant="outline"
          >
            {discoveryMutation.isPending
              ? 'Running discovery'
              : 'Run discovery'}
          </Button>
        </div>
      </div>

      <StatusBar
        items={[
          {
            key: 'readiness',
            label: 'readiness',
            value: formatToken(readinessLevel),
            tone: qualityTone(readinessLevel),
          },
          {
            key: 'critical-gaps',
            label: 'critical gaps',
            value: String(report?.summary.critical_gap_count ?? 0),
            tone: criticalGaps.length > 0 ? 'critical' : 'healthy',
          },
          {
            key: 'coverage',
            label: 'coverage',
            value:
              report?.summary.coverage_ratio == null
                ? 'n/a'
                : `${Math.round(report.summary.coverage_ratio * 100)}%`,
            tone:
              (report?.summary.coverage_ratio ?? 0) >= 0.7
                ? 'healthy'
                : 'warning',
          },
          {
            key: 'table-ready',
            label: 'table ready',
            value: String(
              report?.accepted_record_summary?.table_ready_records ?? 0,
            ),
            tone:
              (report?.accepted_record_summary?.table_ready_records ?? 0) > 0
                ? 'healthy'
                : 'warning',
          },
          {
            key: 'discovery-queue',
            label: 'discovery queue',
            value: String(discoveryStatus?.queued_targets ?? 0),
            tone:
              (discoveryStatus?.queued_targets ?? 0) > 0
                ? 'warning'
                : 'healthy',
          },
          {
            key: 'acquisition-queue',
            label: 'acquisition queue',
            value: String(acquisitionStatus?.queued_attempts ?? 0),
            tone:
              (acquisitionStatus?.queued_attempts ?? 0) > 0
                ? 'warning'
                : 'healthy',
          },
        ]}
      />

      {reportQuery.isError ? (
        <Panel className="workspace-empty-panel" title="No audit report">
          <p className="muted">
            Run the first quality audit to create a benchmark coverage matrix
            and discovery targets.
          </p>
        </Panel>
      ) : null}

      <div className="instrument-grid instrument-grid--two">
        <Panel
          title="Coverage matrix"
          meta={
            report ? new Date(report.created_at).toLocaleString() : 'pending'
          }
        >
          {report ? (
            <CoverageHeatmap entries={report.coverage_matrix} />
          ) : (
            <p className="muted">No matrix is available yet.</p>
          )}
        </Panel>
        <Panel title="Evidence funnel" meta="ingestion to benchmark">
          {report ? (
            <FunnelChart stages={report.funnel_metrics} />
          ) : (
            <p className="muted">No funnel metrics are available yet.</p>
          )}
        </Panel>
      </div>

      <div className="instrument-grid instrument-grid--three">
        <Panel
          title="Readiness scores"
          meta={`${report?.readiness_scores.length ?? 0} archetypes`}
        >
          <div className="quality-list">
            {(report?.readiness_scores ?? []).slice(0, 8).map((score) => (
              <div className="quality-list__row" key={score.case_archetype}>
                <SignalBadge level={qualityTone(score.readiness_level)}>
                  {formatToken(score.readiness_level)}
                </SignalBadge>
                <strong>{score.case_archetype}</strong>
                <span>{score.primary_metrics_coverage} primary metrics</span>
              </div>
            ))}
            {report && report.readiness_scores.length === 0 ? (
              <p className="muted">
                No saved golden-case archetypes were available for scoring.
              </p>
            ) : null}
          </div>
        </Panel>
        <Panel title="Gap queue" meta={`${topGaps.length} visible`}>
          <div className="quality-list">
            {topGaps.map((gap) => (
              <div className="quality-list__row" key={gap.gap_id}>
                <SignalBadge level={qualityTone(gap.severity)}>
                  {formatToken(gap.severity)}
                </SignalBadge>
                <strong>{formatToken(gap.metric_type)}</strong>
                <span>{gap.recommended_query}</span>
              </div>
            ))}
            {topGaps.length === 0 ? (
              <p className="muted">No gaps are currently queued.</p>
            ) : null}
          </div>
        </Panel>
        <Panel title="Outlier review" meta={`${topOutliers.length} visible`}>
          <div className="quality-list">
            {topOutliers.map((outlier) => (
              <div className="quality-list__row" key={outlier.fact_id}>
                <SignalBadge level={qualityTone(outlier.action)}>
                  {formatToken(outlier.action)}
                </SignalBadge>
                <strong>{formatToken(outlier.metric_type)}</strong>
                <span>z {outlier.z_score.toFixed(1)}</span>
              </div>
            ))}
            {topOutliers.length === 0 ? (
              <p className="muted">No outliers need review.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel
        title="Accepted record readiness"
        meta={`${acceptedRecordReadiness.length} visible`}
      >
        <div className="quality-list">
          {acceptedRecordReadiness.slice(0, 8).map((record) => (
            <div className="quality-list__row" key={record.catalog_item_id}>
              <SignalBadge level={actionTone(record.recommended_action)}>
                {formatToken(record.recommended_action)}
              </SignalBadge>
              <strong>{record.title}</strong>
              <span>
                {record.decision_ready_fact_count} ready fact(s) ·{' '}
                {record.decision_ready_benchmark_count} ready benchmark row(s) ·{' '}
                {record.source_text_chunk_count} chunk(s)
              </span>
            </div>
          ))}
          {report && acceptedRecordReadiness.length === 0 ? (
            <p className="muted">
              No accepted records were available for per-record readiness
              triage.
            </p>
          ) : null}
        </div>
      </Panel>

      {(auditMutation.error || discoveryMutation.error) && (
        <Panel className="workspace-empty-panel" title="Action failed">
          <p className="muted">
            {auditMutation.error instanceof Error
              ? auditMutation.error.message
              : discoveryMutation.error instanceof Error
                ? discoveryMutation.error.message
                : 'The evidence intelligence action failed.'}
          </p>
        </Panel>
      )}
    </section>
  );
}
