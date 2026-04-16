import fixture from '../fixtures/raw-case-input.json';

import type { FastifyBaseLogger } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SessionActor } from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import {
  evaluationResponseSchema,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';

const actor: SessionActor = {
  userId: 'user-analyst-001',
  email: 'analyst@metrev.local',
  role: 'ANALYST',
  sessionId: 'session-analyst-001',
  sessionToken: 'analyst-session',
};

describe('case evaluation service', () => {
  const repository = new MemoryEvaluationRepository();

  afterEach(async () => {
    await repository.disconnect();
  });

  it('creates and persists an evaluation without route-specific coupling', async () => {
    const logger = {
      warn: vi.fn(),
    } as Pick<FastifyBaseLogger, 'warn'>;

    const evaluation = await createPersistedCaseEvaluation({
      rawInput: rawCaseInputSchema.parse(fixture),
      actor,
      evaluationRepository: repository,
      logger,
      environment: 'test',
    });

    expect(evaluationResponseSchema.parse(evaluation)).toEqual(evaluation);
    expect(evaluation.audit_record.actor_id).toBe(actor.userId);
    expect(evaluation.audit_record.actor_role).toBe(actor.role);
    expect(logger.warn).not.toHaveBeenCalled();

    const persisted = await repository.getEvaluation(evaluation.evaluation_id);

    expect(persisted).not.toBeNull();
    expect(persisted?.evaluation_id).toBe(evaluation.evaluation_id);
    expect(persisted?.case_id).toBe(evaluation.case_id);
  });
});
