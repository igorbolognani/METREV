import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';

import {
  deduplicateEntries,
  normalizeCrossrefWork,
  optionFlag,
  optionNumber,
  optionValue,
  parseScriptOptions,
  persistNormalizedEntries,
  summarizeNormalizedEntries,
} from './external-ingestion-shared.mjs';
import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

export async function runCrossrefIngestion(overrides = {}) {
  const options = {
    ...parseScriptOptions(),
    ...overrides,
  };

  const query = optionValue(options, 'query', process.env.INGEST_QUERY?.trim());
  const limit = optionNumber(
    options,
    'limit',
    Number(process.env.INGEST_LIMIT ?? '25'),
    1,
    5000,
  );
  const pageSize = optionNumber(
    options,
    'pageSize',
    Math.min(limit, 25),
    1,
    1000,
  );
  const maxPages = optionNumber(
    options,
    'maxPages',
    Math.max(1, Math.ceil(limit / Math.max(pageSize, 1))),
    1,
    500,
  );
  const initialCursor = optionValue(
    options,
    'cursor',
    process.env.INGEST_CURSOR?.trim() ?? '*',
  );
  const mailto = optionValue(
    options,
    'mailto',
    process.env.CROSSREF_MAILTO?.trim() ?? null,
  );
  const dryRun = optionFlag(options, 'dryRun', false);
  const triggerMode = optionValue(options, 'triggerMode', 'manual_script');

  if (!query) {
    throw new Error(
      'INGEST_QUERY or --query is required for Crossref ingestion.',
    );
  }

  const startedAt = new Date();
  const normalizedEntries = [];
  let recordsFetched = 0;
  let pagesProcessed = 0;
  let cursor = initialCursor;
  let nextCursor = initialCursor;

  while (recordsFetched < limit && pagesProcessed < maxPages && cursor) {
    const requestUrl = new URL('https://api.crossref.org/works');
    requestUrl.searchParams.set('query', query);
    requestUrl.searchParams.set(
      'rows',
      String(Math.min(pageSize, limit - recordsFetched)),
    );
    requestUrl.searchParams.set('cursor', cursor);
    if (mailto) {
      requestUrl.searchParams.set('mailto', mailto);
    }

    const response = await fetch(requestUrl, {
      headers: {
        accept: 'application/json',
        'user-agent': mailto
          ? `METREV external ingestion (${mailto})`
          : 'METREV external ingestion',
      },
    });

    if (!response.ok) {
      throw new Error(`Crossref request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const results = Array.isArray(payload?.message?.items)
      ? payload.message.items
      : [];

    normalizedEntries.push(
      ...results
        .map((entry) =>
          normalizeCrossrefWork(entry, query, startedAt.toISOString()),
        )
        .filter(Boolean),
    );

    recordsFetched += results.length;
    pagesProcessed += 1;
    nextCursor = payload?.message?.['next-cursor'] ?? null;

    if (results.length < pageSize || !nextCursor) {
      break;
    }

    cursor = nextCursor;
  }

  const entries = deduplicateEntries(normalizedEntries).slice(0, limit);

  if (dryRun) {
    const summary = summarizeNormalizedEntries(entries);
    const output = {
      sourceType: 'CROSSREF',
      query,
      dryRun: true,
      recordsFetched,
      pagesProcessed,
      nextCursor,
      ...summary,
    };
    console.log(JSON.stringify(output, null, 2));
    return output;
  }

  const prisma = getPrismaClient();
  const run = await prisma.ingestionRun.create({
    data: {
      sourceType: 'CROSSREF',
      triggerMode,
      query,
      status: 'STARTED',
      recordsFetched: 0,
      recordsStored: 0,
      checkpoint: {
        cursor: initialCursor,
      },
      summary: {
        page_size: pageSize,
        max_pages: maxPages,
        mailto,
      },
      startedAt,
    },
  });

  try {
    const persisted = await persistNormalizedEntries(prisma, entries, {
      runId: run.id,
    });

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        recordsFetched,
        recordsStored: persisted.recordsStored,
        checkpoint: {
          cursor: nextCursor,
          pages_processed: pagesProcessed,
        },
        summary: {
          page_size: pageSize,
          max_pages: maxPages,
          mailto,
          next_cursor: nextCursor,
          claims_stored: persisted.claimsStored,
          supplier_documents_stored: persisted.supplierDocumentsStored,
        },
        completedAt: new Date(),
      },
    });

    const output = {
      runId: run.id,
      sourceType: 'CROSSREF',
      query,
      recordsFetched,
      pagesProcessed,
      nextCursor,
      ...persisted,
    };
    console.log(JSON.stringify(output, null, 2));
    return output;
  } catch (error) {
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        failureDetail: {
          message: error instanceof Error ? error.message : String(error),
        },
      },
    });
    throw error;
  } finally {
    await disconnectPrismaClient();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runCrossrefIngestion();
}
