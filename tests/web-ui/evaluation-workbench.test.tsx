import rawFixture from '../fixtures/raw-case-input.json';

import { describe, expect, it, vi } from 'vitest';

import type { SessionActor } from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import { rawCaseInputSchema } from '@metrev/domain-contracts';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';
import { buildEvaluationComparison } from '../../apps/api-server/src/presenters/workspace-presenters';

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
});
