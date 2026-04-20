import rawFixture from '../fixtures/raw-case-input.json';

import { describe, expect, it, vi } from 'vitest';

import type { SessionActor } from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import { rawCaseInputSchema } from '@metrev/domain-contracts';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';
import { buildDecisionWorkspaceOverview } from '../../apps/web-ui/src/lib/evaluation-workbench';

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

describe('evaluation workbench mapper', () => {
  it('maps an evaluation into a decision-first overview', async () => {
    const repository = new MemoryEvaluationRepository();

    try {
      const evaluation = await createPersistedCaseEvaluation({
        rawInput: rawCaseInputSchema.parse(rawFixture),
        actor,
        evaluationRepository: repository,
        logger,
        environment: 'test',
      });

      const overview = buildDecisionWorkspaceOverview(evaluation);

      expect(overview.heroCards.map((card) => card.label)).toEqual(
        expect.arrayContaining([
          'Decision posture',
          'Delivery readiness',
          'Uncertainty frame',
          'Critical gap',
        ]),
      );
      expect(overview.briefCards.map((card) => card.label)).toEqual(
        expect.arrayContaining([
          'Run context',
          'Operating envelope',
          'Evidence posture',
          'Traceability',
        ]),
      );
      expect(overview.leadAction.title).not.toBe('No lead action available');
      expect(overview.roadmap.length).toBeGreaterThan(0);
      expect(overview.impactMap.length).toBeGreaterThan(0);
    } finally {
      await repository.disconnect();
    }
  });
});
