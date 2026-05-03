type EvaluationIdRecord = {
  id: string;
  caseId: string;
};

type ConversationIdRecord = {
  id: string;
};

type CountResult = {
  count: number;
};

export interface EvaluationResetSummary {
  evaluationCount: number;
  caseCount: number;
  simulationArtifactCount: number;
  sourceUsageCount: number;
  claimUsageCount: number;
  snapshotCount: number;
  reportConversationCount: number;
  reportConversationTurnCount: number;
  shortlistItemCount: number;
  auditEventCount: number;
}

export interface EvaluationResetResult {
  executed: boolean;
  deletedEvaluationCount: number;
  remainingEvaluationCount: number;
  summary: EvaluationResetSummary;
}

export interface EvaluationResetPrismaLike {
  evaluationRecord: {
    count(args?: { where?: Record<string, unknown> }): Promise<number>;
    deleteMany(args?: {
      where?: Record<string, unknown>;
    }): Promise<CountResult>;
    findMany(args: {
      select: { id: true; caseId: true };
    }): Promise<EvaluationIdRecord[]>;
  };
  simulationArtifactRecord: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  evaluationSourceUsage: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  evaluationClaimUsage: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  workspaceSnapshotRecord: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  reportConversationSession: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findMany(args: {
      where: Record<string, unknown>;
      select: { id: true };
    }): Promise<ConversationIdRecord[]>;
  };
  reportConversationTurn: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  supplierShortlistItem: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  auditEvent: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
}

const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1']);

export function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);
    return LOCAL_DATABASE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function assertLocalEvaluationResetAllowed(input: {
  databaseUrl?: string | null;
}) {
  const databaseUrl = input.databaseUrl?.trim();

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required to inspect or reset evaluations.',
    );
  }

  if (!isLocalDatabaseUrl(databaseUrl)) {
    throw new Error(
      'Evaluation reset is restricted to local databases addressed by localhost or 127.0.0.1.',
    );
  }
}

export async function collectEvaluationResetSummary(
  prisma: EvaluationResetPrismaLike,
): Promise<EvaluationResetSummary> {
  const evaluations = await prisma.evaluationRecord.findMany({
    select: {
      id: true,
      caseId: true,
    },
  });

  const evaluationIds = evaluations.map((evaluation) => evaluation.id);
  const uniqueCaseIds = new Set(
    evaluations.map((evaluation) => evaluation.caseId),
  );

  if (evaluationIds.length === 0) {
    return {
      evaluationCount: 0,
      caseCount: 0,
      simulationArtifactCount: 0,
      sourceUsageCount: 0,
      claimUsageCount: 0,
      snapshotCount: 0,
      reportConversationCount: 0,
      reportConversationTurnCount: 0,
      shortlistItemCount: 0,
      auditEventCount: 0,
    };
  }

  const evaluationIdFilter = {
    in: evaluationIds,
  };

  const reportConversations = await prisma.reportConversationSession.findMany({
    where: {
      evaluationId: evaluationIdFilter,
    },
    select: {
      id: true,
    },
  });
  const reportConversationIds = reportConversations.map(
    (conversation) => conversation.id,
  );

  const [
    simulationArtifactCount,
    sourceUsageCount,
    claimUsageCount,
    snapshotCount,
    reportConversationCount,
    reportConversationTurnCount,
    shortlistItemCount,
    auditEventCount,
  ] = await Promise.all([
    prisma.simulationArtifactRecord.count({
      where: { evaluationId: evaluationIdFilter },
    }),
    prisma.evaluationSourceUsage.count({
      where: { evaluationId: evaluationIdFilter },
    }),
    prisma.evaluationClaimUsage.count({
      where: { evaluationId: evaluationIdFilter },
    }),
    prisma.workspaceSnapshotRecord.count({
      where: { evaluationId: evaluationIdFilter },
    }),
    prisma.reportConversationSession.count({
      where: { evaluationId: evaluationIdFilter },
    }),
    reportConversationIds.length > 0
      ? prisma.reportConversationTurn.count({
          where: { conversationId: { in: reportConversationIds } },
        })
      : Promise.resolve(0),
    prisma.supplierShortlistItem.count({
      where: { evaluationId: evaluationIdFilter },
    }),
    prisma.auditEvent.count({
      where: { evaluationId: evaluationIdFilter },
    }),
  ]);

  return {
    evaluationCount: evaluationIds.length,
    caseCount: uniqueCaseIds.size,
    simulationArtifactCount,
    sourceUsageCount,
    claimUsageCount,
    snapshotCount,
    reportConversationCount,
    reportConversationTurnCount,
    shortlistItemCount,
    auditEventCount,
  };
}

export async function resetEvaluations(
  prisma: EvaluationResetPrismaLike,
  input: { execute: boolean },
): Promise<EvaluationResetResult> {
  const summary = await collectEvaluationResetSummary(prisma);

  if (!input.execute) {
    return {
      executed: false,
      deletedEvaluationCount: 0,
      remainingEvaluationCount: summary.evaluationCount,
      summary,
    };
  }

  const deletion = await prisma.evaluationRecord.deleteMany();
  const remainingEvaluationCount = await prisma.evaluationRecord.count();

  return {
    executed: true,
    deletedEvaluationCount: deletion.count,
    remainingEvaluationCount,
    summary,
  };
}
