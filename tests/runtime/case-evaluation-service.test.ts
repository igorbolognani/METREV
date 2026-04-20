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
    expect(evaluation.simulation_enrichment?.status).toBe('completed');
    expect(
      evaluation.simulation_enrichment?.derived_observations.length,
    ).toBeGreaterThan(0);
    expect(
      evaluation.audit_record.agent_pipeline_trace.find(
        (stage) => stage.stage_id === 'simulation_enrichment',
      )?.status,
    ).toBe('completed');
    expect(logger.warn).not.toHaveBeenCalled();

    const persisted = await repository.getEvaluation(evaluation.evaluation_id);

    expect(persisted).not.toBeNull();
    expect(persisted?.evaluation_id).toBe(evaluation.evaluation_id);
    expect(persisted?.case_id).toBe(evaluation.case_id);
    expect(persisted?.simulation_enrichment?.status).toBe('completed');
  });

  it('marks simulation enrichment as insufficient_data when operating anchors are absent', async () => {
    const logger = {
      warn: vi.fn(),
    } as Pick<FastifyBaseLogger, 'warn'>;

    const evaluation = await createPersistedCaseEvaluation({
      rawInput: rawCaseInputSchema.parse({
        ...fixture,
        feed_and_operation: {
          influent_type: fixture.feed_and_operation.influent_type,
        },
      }),
      actor,
      evaluationRepository: repository,
      logger,
      environment: 'test',
    });

    expect(evaluation.simulation_enrichment?.status).toBe('insufficient_data');
    expect(evaluation.simulation_enrichment?.series).toHaveLength(0);
    expect(
      evaluation.audit_record.agent_pipeline_trace.find(
        (stage) => stage.stage_id === 'simulation_enrichment',
      )?.status,
    ).toBe('degraded');
  });

  it('supports explicitly disabling simulation enrichment', async () => {
    const logger = {
      warn: vi.fn(),
    } as Pick<FastifyBaseLogger, 'warn'>;

    const evaluation = await createPersistedCaseEvaluation({
      rawInput: rawCaseInputSchema.parse(fixture),
      actor,
      evaluationRepository: repository,
      logger,
      environment: 'test',
      simulationMode: 'disabled',
    });

    expect(evaluation.simulation_enrichment?.status).toBe('disabled');
    expect(
      evaluation.audit_record.agent_pipeline_trace.find(
        (stage) => stage.stage_id === 'simulation_enrichment',
      )?.status,
    ).toBe('skipped');
  });
});
