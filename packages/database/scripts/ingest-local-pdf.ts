import {
  disconnectPrismaClient,
  importLocalPdfSources,
  resolveLocalSourceImportRequestToInput,
} from '../src/index';
import { getPrismaClient } from '../src/prisma-client';

import { localSourceImportRequestSchema } from '@metrev/domain-contracts';

import {
  optionList,
  optionValue,
  parseScriptOptions,
} from './external-ingestion-shared.mjs';
import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

async function main() {
  const options = parseScriptOptions();
  const parsed = localSourceImportRequestSchema.safeParse({
    files: optionList(options, ['files', 'file'], []),
    manifest_path: optionValue(options, ['manifest', 'manifestPath'], undefined),
    access_status: optionValue(
      options,
      ['access-status', 'accessStatus'],
      'unknown',
    ),
    license: optionValue(options, 'license', undefined),
    review_status: optionValue(
      options,
      ['review-status', 'reviewStatus'],
      'pending',
    ),
  });

  if (!parsed.success) {
    console.error(
      JSON.stringify(
        {
          error: 'invalid_input',
          details: parsed.error.flatten(),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const prisma = getPrismaClient();
  try {
    const response = await importLocalPdfSources(
      prisma,
      await resolveLocalSourceImportRequestToInput(parsed.data),
    );
    console.log(JSON.stringify(response, null, 2));
  } finally {
    await disconnectPrismaClient();
  }
}

void main();
