import rawFixture from '../fixtures/raw-case-input.json';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import type { SessionActor } from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import {
  rawCaseInputSchema,
  type EvaluationResponse,
} from '@metrev/domain-contracts';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';
import { EvaluationCockpit } from '../../apps/web-ui/src/components/evaluation-cockpit';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/lib/api', () => ({
  fetchEvaluation: vi.fn(),
}));

const actor: SessionActor = {
  userId: 'user-analyst-001',
  email: 'analyst@metrev.local',
  role: 'ANALYST',
  sessionId: 'session-web-ui-tests',
  sessionToken: 'web-ui-tests',
};

const logger = {
  warn: vi.fn(),
};

afterEach(() => {
  vi.clearAllMocks();
});

async function buildEvaluation(input?: {
  overrides?: Record<string, unknown>;
  simulationMode?: string;
  repository?: MemoryEvaluationRepository;
}): Promise<{
  evaluation: EvaluationResponse;
  repository: MemoryEvaluationRepository;
}> {
  const repository = input?.repository ?? new MemoryEvaluationRepository();
  const rawInput = rawCaseInputSchema.parse({
    ...rawFixture,
    ...(input?.overrides ?? {}),
  });

  const evaluation = await createPersistedCaseEvaluation({
    rawInput,
    actor,
    evaluationRepository: repository,
    logger,
    environment: 'test',
    simulationMode: input?.simulationMode,
  });

  return { evaluation, repository };
}

function renderCockpit(input: {
  evaluation: EvaluationResponse;
  history?: Awaited<ReturnType<MemoryEvaluationRepository['getCaseHistory']>>;
  initialTab?: 'summary' | 'evidence' | 'modeling' | 'audit';
  initialComparisonEvaluationId?: string | null;
  comparisonEvaluation?: EvaluationResponse | null;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(EvaluationCockpit, {
        evaluationId: input.evaluation.evaluation_id,
        evaluation: input.evaluation,
        history: input.history ?? undefined,
        historyLoading: false,
        initialTab: input.initialTab,
        initialComparisonEvaluationId: input.initialComparisonEvaluationId,
        comparisonEvaluation: input.comparisonEvaluation,
      }),
    ),
  );
}

describe('evaluation cockpit', () => {
  it('renders the summary workspace when the evaluation has no simulation artifact', async () => {
    const { evaluation, repository } = await buildEvaluation();

    try {
      const history = await repository.getCaseHistory(evaluation.case_id);
      const html = renderCockpit({
        evaluation: {
          ...evaluation,
          simulation_enrichment: undefined,
        },
        history,
      });

      expect(html).toContain('Decision workspace');
      expect(html).toContain('analyst workbench');
      expect(html).toContain('model Unavailable');
      expect(html).toContain('Decision posture');
      expect(html).toContain('Delivery readiness');
      expect(html).toContain('Critical gap');
      expect(html).toContain('Validation pressure');
      expect(html).toContain('Comparison dock');
    } finally {
      await repository.disconnect();
    }
  });

  it('renders completed modeling charts when a full simulation artifact is available', async () => {
    const { evaluation, repository } = await buildEvaluation();

    try {
      const history = await repository.getCaseHistory(evaluation.case_id);
      const html = renderCockpit({
        evaluation,
        history,
        initialTab: 'modeling',
      });

      expect(evaluation.simulation_enrichment?.status).toBe('completed');
      expect(html).toContain('Simulation enrichment');
      expect(html).toContain('Technical charts');
      expect(html).toContain('Polarization curve');
      expect(html).toContain('Power curve');
    } finally {
      await repository.disconnect();
    }
  });

  it('renders degraded modeling state when operating anchors are insufficient', async () => {
    const { evaluation, repository } = await buildEvaluation({
      overrides: {
        feed_and_operation: {
          influent_type: rawFixture.feed_and_operation.influent_type,
        },
      },
    });

    try {
      const history = await repository.getCaseHistory(evaluation.case_id);
      const html = renderCockpit({
        evaluation,
        history,
        initialTab: 'modeling',
      });

      expect(evaluation.simulation_enrichment?.status).toBe(
        'insufficient_data',
      );
      expect(html).toContain('No chart-ready model artifact');
      expect(html).toContain('Insufficient Data');
    } finally {
      await repository.disconnect();
    }
  });

  it('renders a two-run comparison dock when a baseline evaluation is provided', async () => {
    const repository = new MemoryEvaluationRepository();

    try {
      const { evaluation: baseline } = await buildEvaluation({ repository });
      const { evaluation: current } = await buildEvaluation({
        repository,
        overrides: {
          feed_and_operation: {
            ...rawFixture.feed_and_operation,
            temperature_c: 31,
            pH: 7.4,
          },
        },
      });
      const history = await repository.getCaseHistory(current.case_id);
      const html = renderCockpit({
        evaluation: current,
        history,
        initialComparisonEvaluationId: baseline.evaluation_id,
        comparisonEvaluation: baseline,
      });

      expect(html).toContain('2 evaluations loaded');
      expect(html).toContain('Current density');
      expect(html).toContain('Baseline');
      expect(html).toContain('Current');
    } finally {
      await repository.disconnect();
    }
  });
});
