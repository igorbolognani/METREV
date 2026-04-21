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
      expect(comparison.meta.versions.workspace_schema_version).toBe('014.0.0');
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

      expect(firstSeries).toBeDefined();

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
                  failure_detail: {
                    reason: 'Model diverged during iteration 4',
                  },
                  status: 'failed',
                }
              : null,
          },
        }),
      );

      expect(modelingHtml).toContain(
        'Modeling could not complete successfully',
      );
      expect(modelingHtml).toContain('Model diverged during iteration 4');
      expect(modelingHtml).toContain('Simulation provenance');

      const auditHtml = renderToStaticMarkup(
        React.createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          React.createElement(EvaluationAuditTab, {
            evaluationId: current.evaluation_id,
            workspace,
          }),
        ),
      );

      expect(auditHtml).toContain('Assumptions and defaults audit');
      expect(auditHtml).toContain('Confidence and uncertainty summary');
      expect(auditHtml).toContain('View audit record');
      expect(auditHtml).toContain('View raw evaluation data');
    } finally {
      await repository.disconnect();
    }
  });
});
