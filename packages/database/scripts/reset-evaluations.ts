import {
  assertLocalEvaluationResetAllowed,
  resetEvaluations,
} from '../src/evaluation-reset';
import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';

import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function printUsage() {
  console.log(
    [
      'Usage: pnpm --filter @metrev/database reset:evaluations -- --dryRun',
      'Usage: pnpm --filter @metrev/database reset:evaluations -- --execute',
      '',
      'The command only allows DATABASE_URL values pointing to localhost or 127.0.0.1.',
    ].join('\n'),
  );
}

function logSummary(
  summary: Awaited<ReturnType<typeof resetEvaluations>>['summary'],
) {
  console.log(`Evaluations: ${summary.evaluationCount}`);
  console.log(`Cases represented by evaluations: ${summary.caseCount}`);
  console.log(`Simulation artifacts: ${summary.simulationArtifactCount}`);
  console.log(`Source usages: ${summary.sourceUsageCount}`);
  console.log(`Claim usages: ${summary.claimUsageCount}`);
  console.log(`Workspace snapshots: ${summary.snapshotCount}`);
  console.log(`Report conversations: ${summary.reportConversationCount}`);
  console.log(
    `Report conversation turns: ${summary.reportConversationTurnCount}`,
  );
  console.log(`Supplier shortlist items: ${summary.shortlistItemCount}`);
  console.log(`Audit events: ${summary.auditEventCount}`);
}

async function main(): Promise<void> {
  if (hasFlag('--help')) {
    printUsage();
    return;
  }

  const execute = hasFlag('--execute');
  const dryRun = hasFlag('--dryRun') || !execute;
  assertLocalEvaluationResetAllowed({
    databaseUrl: process.env.DATABASE_URL,
  });

  const prisma = getPrismaClient();

  try {
    const result = await resetEvaluations(prisma, { execute: !dryRun });

    console.log(
      dryRun
        ? 'Dry run only. No rows were deleted.'
        : 'Evaluation reset executed.',
    );
    logSummary(result.summary);
    console.log(`Deleted evaluations: ${result.deletedEvaluationCount}`);
    console.log(`Remaining evaluations: ${result.remainingEvaluationCount}`);

    if (dryRun) {
      console.log(
        'Re-run with --execute to clear the local evaluation registry.',
      );
    }
  } finally {
    await disconnectPrismaClient();
  }
}

void main();
