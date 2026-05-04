import { describe, expect, it, vi } from 'vitest';

import {
  assertLocalEvaluationResetAllowed,
  collectEvaluationResetSummary,
  resetEvaluations,
} from '../../packages/database/src/evaluation-reset';

function createPrismaStub() {
  return {
    evaluationRecord: {
      count: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0),
      deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
      findMany: vi.fn().mockResolvedValue([
        { id: 'eval-001', caseId: 'CASE-001' },
        { id: 'eval-002', caseId: 'CASE-001' },
        { id: 'eval-003', caseId: 'CASE-002' },
      ]),
    },
    simulationArtifactRecord: {
      count: vi.fn().mockResolvedValue(2),
    },
    evaluationSourceUsage: {
      count: vi.fn().mockResolvedValue(7),
    },
    evaluationClaimUsage: {
      count: vi.fn().mockResolvedValue(5),
    },
    workspaceSnapshotRecord: {
      count: vi.fn().mockResolvedValue(9),
    },
    reportConversationSession: {
      count: vi.fn().mockResolvedValue(2),
      findMany: vi
        .fn()
        .mockResolvedValue([{ id: 'conv-001' }, { id: 'conv-002' }]),
    },
    reportConversationTurn: {
      count: vi.fn().mockResolvedValue(6),
    },
    supplierShortlistItem: {
      count: vi.fn().mockResolvedValue(4),
    },
    auditEvent: {
      count: vi.fn().mockResolvedValue(11),
    },
  };
}

describe('evaluation reset', () => {
  it('summarizes the evaluation-owned slice before deletion', async () => {
    const prisma = createPrismaStub();

    const summary = await collectEvaluationResetSummary(prisma);

    expect(summary).toEqual({
      evaluationCount: 3,
      caseCount: 2,
      simulationArtifactCount: 2,
      sourceUsageCount: 7,
      claimUsageCount: 5,
      snapshotCount: 9,
      reportConversationCount: 2,
      reportConversationTurnCount: 6,
      shortlistItemCount: 4,
      auditEventCount: 11,
    });
  });

  it('refuses non-local database targets', () => {
    expect(() =>
      assertLocalEvaluationResetAllowed({
        databaseUrl:
          'postgresql://metrev:metrev@db.example.com:5432/metrev?schema=public',
      }),
    ).toThrow('Evaluation reset is restricted to local databases');
  });

  it('keeps dry-run mode non-destructive and executes only when requested', async () => {
    const dryRunPrisma = createPrismaStub();
    const dryRun = await resetEvaluations(dryRunPrisma, { execute: false });

    expect(dryRun.executed).toBe(false);
    expect(dryRun.deletedEvaluationCount).toBe(0);
    expect(dryRun.remainingEvaluationCount).toBe(3);
    expect(dryRunPrisma.evaluationRecord.deleteMany).not.toHaveBeenCalled();

    const executePrisma = createPrismaStub();
    executePrisma.evaluationRecord.count = vi.fn().mockResolvedValueOnce(0);

    const executed = await resetEvaluations(executePrisma, { execute: true });

    expect(executed.executed).toBe(true);
    expect(executed.deletedEvaluationCount).toBe(3);
    expect(executed.remainingEvaluationCount).toBe(0);
    expect(executePrisma.evaluationRecord.deleteMany).toHaveBeenCalledTimes(1);
  });
});
