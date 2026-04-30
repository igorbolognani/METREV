import rawFixture from '../fixtures/raw-case-input.json';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import type { SessionActor } from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import { rawCaseInputSchema } from '@metrev/domain-contracts';
import {
    buildEvaluationComparison,
    buildEvaluationWorkspace,
} from '../../apps/api-server/src/presenters/workspace-presenters';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';
import { buildSimulationChartRows } from '../../apps/web-ui/src/components/charts/simulation-multi-line-chart';
import { EvaluationAuditTab } from '../../apps/web-ui/src/components/evaluation/evaluation-audit-tab';
import { EvaluationEvidenceTab } from '../../apps/web-ui/src/components/evaluation/evaluation-evidence-tab';
import { EvaluationModelingTab } from '../../apps/web-ui/src/components/evaluation/evaluation-modeling-tab';
import {
    EvaluationRecommendationsTable,
    sortRecommendations,
} from '../../apps/web-ui/src/components/evaluation/evaluation-recommendations-table';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

const actor: SessionActor = {
  userId: 'user-analyst-001',
  email: 'analyst@metrev.local',
  role: 'ANALYST',
  sessionId: 'session-workbench-tests',
  sessionToken: 'workbench-tests',
};

const logger = {
  warn: vi.fn(),
};

describe('workspace presenters', () => {
  it('builds a dedicated comparison payload instead of relying on frontend heuristics', async () => {
    const repository = new MemoryEvaluationRepository();

    try {
      const baseline = await createPersistedCaseEvaluation({
        rawInput: rawCaseInputSchema.parse(rawFixture),
        actor,
        evaluationRepository: repository,
        logger,
        environment: 'test',
      });
      const current = await createPersistedCaseEvaluation({
        rawInput: rawCaseInputSchema.parse({
          ...rawFixture,
          feed_and_operation: {
            ...rawFixture.feed_and_operation,
            temperature_c: 31,
            pH: 7.4,
          },
        }),
        actor,
        evaluationRepository: repository,
        logger,
        environment: 'test',
      });

      const comparison = buildEvaluationComparison({
        current,
        baseline,
        versions: current.audit_record.runtime_versions,
      });

      expect(comparison.metric_deltas.length).toBeGreaterThan(0);
      expect(comparison.recommendation_deltas.length).toBeGreaterThan(0);
      expect(comparison.conclusion.summary).toContain(current.case_id);
      expect(comparison.meta.versions.workspace_schema_version).toBe('015.0.0');
    } finally {
      await repository.disconnect();
    }
  });

  it('renders stage 2 recommendation, modeling, and audit surfaces from workspace payloads', async () => {
    const repository = new MemoryEvaluationRepository();

    try {
      const baseline = await createPersistedCaseEvaluation({
        rawInput: rawCaseInputSchema.parse(rawFixture),
        actor,
        evaluationRepository: repository,
        logger,
        environment: 'test',
      });
      const current = await createPersistedCaseEvaluation({
        rawInput: rawCaseInputSchema.parse({
          ...rawFixture,
          feed_and_operation: {
            ...rawFixture.feed_and_operation,
            temperature_c: 31,
            pH: 7.4,
          },
        }),
        actor,
        evaluationRepository: repository,
        logger,
        environment: 'test',
      });
      const history = await repository.getCaseHistory(current.case_id);
      const workspace = buildEvaluationWorkspace({
        evaluation: current,
        history,
        versions: current.audit_record.runtime_versions,
      });
      const firstSeries = workspace.evaluation.simulation_enrichment?.series[0];
      const operatingWindowSeries =
        workspace.evaluation.simulation_enrichment?.series.find(
          (series) => series.series_type === 'operating_window',
        ) ?? null;

      expect(firstSeries).toBeDefined();
      expect(operatingWindowSeries).toBeDefined();

      const rows = buildSimulationChartRows([
        firstSeries!,
        {
          ...firstSeries!,
          points: firstSeries!.points.map((point, index) => ({
            ...point,
            y: typeof point.y === 'number' ? point.y + index + 1 : point.y,
          })),
          series_id: `${firstSeries!.series_id}-alt`,
          title: `${firstSeries!.title} alt`,
        },
      ]);

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.some((row) => `${firstSeries!.series_id}-alt` in row)).toBe(
        true,
      );

      const sortedRecommendations = sortRecommendations(
        workspace.evaluation.decision_output.prioritized_improvement_options,
        'priority_score',
        'desc',
      );

      expect(sortedRecommendations[0]?.priority_score).toBeGreaterThanOrEqual(
        sortedRecommendations.at(-1)?.priority_score ?? -1,
      );

      const recommendationHtml = renderToStaticMarkup(
        React.createElement(EvaluationRecommendationsTable, {
          defaultExpandedIds: [
            workspace.evaluation.decision_output
              .prioritized_improvement_options[0]!.recommendation_id,
          ],
          evaluationId: current.evaluation_id,
          recommendations:
            workspace.evaluation.decision_output
              .prioritized_improvement_options,
        }),
      );

      expect(recommendationHtml).toContain('Economic Plausibility');
      expect(recommendationHtml).toContain('Prerequisite actions');
      expect(recommendationHtml).toContain('Missing data dependencies');
      expect(recommendationHtml).toContain('/evaluations/');
      expect(recommendationHtml).toContain('/evidence/review?q=');

      const modelingHtml = renderToStaticMarkup(
        React.createElement(EvaluationModelingTab, {
          evaluation: {
            ...workspace.evaluation,
            simulation_enrichment: workspace.evaluation.simulation_enrichment
              ? {
                  ...workspace.evaluation.simulation_enrichment,
                  series: operatingWindowSeries ? [operatingWindowSeries] : [],
                }
              : null,
          },
        }),
      );

      expect(modelingHtml).toContain('Operating window map');
      expect(modelingHtml).toContain(
        'Sensitivity map from x/y operating conditions to modeled operating-window score.',
      );
      expect(modelingHtml).toContain('simulation-heatmap__cell');

      const failedModelingHtml = renderToStaticMarkup(
        React.createElement(EvaluationModelingTab, {
          evaluation: {
            ...workspace.evaluation,
            simulation_enrichment: workspace.evaluation.simulation_enrichment
              ? {
                  ...workspace.evaluation.simulation_enrichment,
                  failure_detail: {
                    reason: 'Model diverged during iteration 4',
                  },
                  status: 'failed',
                }
              : null,
          },
        }),
      );

      expect(failedModelingHtml).toContain(
        'Modeling could not complete successfully',
      );
      expect(failedModelingHtml).toContain('Model payload');
      expect(failedModelingHtml).toContain('Simulation provenance');

      const evidenceQualityRecord = {
        evidence_id: 'evidence-ui-quality-001',
        evidence_type: 'literature_evidence' as const,
        title: 'UI quality evidence fixture',
        summary: 'Evidence record with visible metadata and veracity context.',
        applicability_scope: {},
        strength_level: 'moderate' as const,
        provenance_note: 'Fixture evidence for UI quality disclosure.',
        quantitative_metrics: {},
        operating_conditions: {},
        block_mapping: [],
        limitations: [],
        contradiction_notes: [],
        tags: [],
        metadata_quality: {
          score: 0.92,
          level: 'high',
          present_fields: ['doi', 'publisher'],
          missing_fields: [],
          categories: {},
          notes: [],
        },
        review_status: 'accepted',
        source_artifact_ids: ['source-artifact-ui-001'],
        source_locator_refs: ['page:7'],
        veracity_score: {
          score: 0.71,
          level: 'medium',
          components: {
            source_rigor: 0.8,
            metadata_completeness: 0.92,
            measurement_quality: 0.7,
            extraction_method: 0.7,
            trace_quality: 0.7,
            normalization_support: 0.7,
            review_status: 0.9,
            relevance: 0.8,
            recency_context_fit: 0.6,
            corroboration_conflict: 0.5,
          },
          confidence_penalties: ['single source trace'],
          notes: [],
        },
      };
      const qualityTypedEvidence =
        workspace.evaluation.audit_record.typed_evidence.length > 0
          ? workspace.evaluation.audit_record.typed_evidence.map(
              (record, index) =>
                index === 0
                  ? {
                      ...record,
                      metadata_quality: evidenceQualityRecord.metadata_quality,
                      review_status: evidenceQualityRecord.review_status,
                      source_artifact_ids:
                        evidenceQualityRecord.source_artifact_ids,
                      source_locator_refs:
                        evidenceQualityRecord.source_locator_refs,
                      veracity_score: evidenceQualityRecord.veracity_score,
                    }
                  : record,
            )
          : [evidenceQualityRecord];

      const evidenceHtml = renderToStaticMarkup(
        React.createElement(EvaluationEvidenceTab, {
          workspace: {
            ...workspace,
            evaluation: {
              ...workspace.evaluation,
              audit_record: {
                ...workspace.evaluation.audit_record,
                typed_evidence: qualityTypedEvidence,
              },
              source_usages: [
                {
                  id: 'source-usage-001',
                  evaluation_id: current.evaluation_id,
                  source_document_id: 'source-crossref-001',
                  usage_type: 'attached_input',
                  note: 'Accepted for analyst intake.',
                  created_at: current.audit_record.timestamp,
                },
              ],
              claim_usages: [
                {
                  id: 'claim-usage-001',
                  evaluation_id: current.evaluation_id,
                  claim_id: 'claim-001',
                  usage_type: 'input_support',
                  note: 'Used to support deterministic intake selection.',
                  created_at: current.audit_record.timestamp,
                },
              ],
              workspace_snapshots: [
                {
                  id: 'snapshot-001',
                  evaluation_id: current.evaluation_id,
                  case_id: current.case_id,
                  snapshot_type: 'evaluation',
                  payload: { fixture: true },
                  created_at: current.audit_record.timestamp,
                },
              ],
            },
          },
        }),
      );

      expect(evidenceHtml).toContain('Persisted source usage');
      expect(evidenceHtml).toContain('Metadata High');
      expect(evidenceHtml).toContain('Veracity Medium');
      expect(evidenceHtml).toContain('source-artifact-ui-001');
      expect(evidenceHtml).toContain('Accepted for analyst intake.');
      expect(evidenceHtml).toContain('Workspace snapshot inventory');

      const auditHtml = renderToStaticMarkup(
        React.createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          React.createElement(EvaluationAuditTab, {
            evaluationId: current.evaluation_id,
            workspace: {
              ...workspace,
              evaluation: {
                ...workspace.evaluation,
                source_usages: [
                  {
                    id: 'source-usage-001',
                    evaluation_id: current.evaluation_id,
                    source_document_id: 'source-crossref-001',
                    usage_type: 'attached_input',
                    note: 'Accepted for analyst intake.',
                    created_at: current.audit_record.timestamp,
                  },
                ],
                claim_usages: [
                  {
                    id: 'claim-usage-001',
                    evaluation_id: current.evaluation_id,
                    claim_id: 'claim-001',
                    usage_type: 'input_support',
                    note: 'Used to support deterministic intake selection.',
                    created_at: current.audit_record.timestamp,
                  },
                ],
                workspace_snapshots: [
                  {
                    id: 'snapshot-001',
                    evaluation_id: current.evaluation_id,
                    case_id: current.case_id,
                    snapshot_type: 'evaluation',
                    payload: { fixture: true },
                    created_at: current.audit_record.timestamp,
                  },
                ],
              },
            },
          }),
        ),
      );

      expect(auditHtml).toContain('Assumptions and defaults audit');
      expect(auditHtml).toContain('Confidence and uncertainty summary');
      expect(auditHtml).toContain('Traceability payload');
      expect(auditHtml).toContain('View raw evaluation data');
    } finally {
      await repository.disconnect();
    }
  });
});
