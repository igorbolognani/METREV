import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';

import {
  deduplicateEntries,
  getEvidenceIngestionConfig,
  normalizeCrossrefWork,
  normalizeEuropePmcWork,
  normalizeOpenAlexWork,
  optionFlag,
  optionList,
  optionNumber,
  optionValue,
  parseScriptOptions,
  persistNormalizedEntries,
  readJsonFile,
  TRUSTED_CORPUS_AUTO_ACCEPT_POLICY,
} from './external-ingestion-shared.mjs';
import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

export type BulkSource = 'openalex' | 'crossref' | 'europepmc';

interface ProviderBatch {
  entries: unknown[];
  nextCursor: string | null;
  recordsFetched: number;
}

const triggerMode = 'bulk_scientific_corpus';

interface BulkFailureConfig {
  autoAcceptTrustedCorpus: boolean;
  batchSize: number;
  targetTotal: number;
}

class RecoverableProviderCursorError extends Error {
  readonly recoverableProviderCursor = true;

  constructor(
    message: string,
    readonly source: BulkSource,
    readonly status: number,
  ) {
    super(message);
    this.name = 'RecoverableProviderCursorError';
  }
}

function isRecoverableProviderCursorError(
  error: unknown,
): error is RecoverableProviderCursorError {
  return (
    error instanceof RecoverableProviderCursorError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { recoverableProviderCursor?: unknown })
        .recoverableProviderCursor === true)
  );
}

export function shouldTreatProviderHttpFailureAsExhaustedCursor(input: {
  cursor: string;
  source: BulkSource;
  status: number;
}) {
  return (
    input.source === 'crossref' &&
    input.cursor !== '*' &&
    (input.status === 404 || input.status === 410)
  );
}

function normalizeSource(value: string): BulkSource | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'openalex' || normalized === 'crossref') {
    return normalized;
  }

  if (normalized === 'europepmc' || normalized === 'europe_pmc') {
    return 'europepmc';
  }

  return null;
}

function sourceTypeForRun(source: BulkSource) {
  switch (source) {
    case 'crossref':
      return 'CROSSREF' as const;
    case 'europepmc':
      return 'EUROPE_PMC' as const;
    default:
      return 'OPENALEX' as const;
  }
}

function readConfiguredQueries(configPath: string, queryLimit: number) {
  const config = readJsonFile(configPath, import.meta.url);
  const queries = Array.isArray(config?.queries)
    ? config.queries
        .map((entry: unknown) =>
          typeof entry === 'string' ? entry.trim() : '',
        )
        .filter(Boolean)
    : [];

  return queries.slice(0, queryLimit || queries.length);
}

async function fetchOpenAlexBatch(input: {
  apiKey: string | null;
  cursor: string;
  mailto: string | null;
  pageSize: number;
  query: string;
  startedAt: string;
  normalizeOptions: Record<string, unknown>;
}): Promise<ProviderBatch> {
  const requestUrl = new URL('https://api.openalex.org/works');
  requestUrl.searchParams.set('search', input.query);
  requestUrl.searchParams.set(
    'per-page',
    String(Math.min(input.pageSize, 200)),
  );
  requestUrl.searchParams.set('cursor', input.cursor);

  if (input.mailto) {
    requestUrl.searchParams.set('mailto', input.mailto);
  }

  if (input.apiKey) {
    requestUrl.searchParams.set('api_key', input.apiKey);
  }

  const response = await fetch(requestUrl, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`OpenAlex request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload?.results) ? payload.results : [];

  return {
    entries: results
      .map((entry: unknown) =>
        normalizeOpenAlexWork(
          entry,
          input.query,
          input.startedAt,
          input.normalizeOptions,
        ),
      )
      .filter(Boolean),
    nextCursor: payload?.meta?.next_cursor ?? null,
    recordsFetched: results.length,
  };
}

async function fetchCrossrefBatch(input: {
  cursor: string;
  mailto: string | null;
  pageSize: number;
  query: string;
  startedAt: string;
  normalizeOptions: Record<string, unknown>;
}): Promise<ProviderBatch> {
  const requestUrl = new URL('https://api.crossref.org/works');
  requestUrl.searchParams.set('query', input.query);
  requestUrl.searchParams.set('rows', String(Math.min(input.pageSize, 1000)));
  requestUrl.searchParams.set('cursor', input.cursor);

  if (input.mailto) {
    requestUrl.searchParams.set('mailto', input.mailto);
  }

  const response = await fetch(requestUrl, {
    headers: {
      accept: 'application/json',
      'user-agent': input.mailto
        ? `METREV scientific evidence bulk ingestion (${input.mailto})`
        : 'METREV scientific evidence bulk ingestion',
    },
  });

  if (!response.ok) {
    if (
      shouldTreatProviderHttpFailureAsExhaustedCursor({
        cursor: input.cursor,
        source: 'crossref',
        status: response.status,
      })
    ) {
      throw new RecoverableProviderCursorError(
        `Crossref cursor request failed with status ${response.status}; marking cursor exhausted.`,
        'crossref',
        response.status,
      );
    }

    throw new Error(`Crossref request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload?.message?.items)
    ? payload.message.items
    : [];

  return {
    entries: results
      .map((entry: unknown) =>
        normalizeCrossrefWork(
          entry,
          input.query,
          input.startedAt,
          input.normalizeOptions,
        ),
      )
      .filter(Boolean),
    nextCursor: payload?.message?.['next-cursor'] ?? null,
    recordsFetched: results.length,
  };
}

async function fetchEuropePmcBatch(input: {
  cursor: string;
  email: string | null;
  pageSize: number;
  query: string;
  startedAt: string;
  normalizeOptions: Record<string, unknown>;
}): Promise<ProviderBatch> {
  const requestUrl = new URL(
    'https://www.ebi.ac.uk/europepmc/webservices/rest/search',
  );
  requestUrl.searchParams.set('query', input.query);
  requestUrl.searchParams.set(
    'pageSize',
    String(Math.min(input.pageSize, 1000)),
  );
  requestUrl.searchParams.set('cursorMark', input.cursor);
  requestUrl.searchParams.set('resultType', 'core');
  requestUrl.searchParams.set('format', 'json');

  if (input.email) {
    requestUrl.searchParams.set('email', input.email);
  }

  const response = await fetch(requestUrl, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Europe PMC request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload?.resultList?.result)
    ? payload.resultList.result
    : [];

  return {
    entries: results
      .map((entry: unknown) =>
        normalizeEuropePmcWork(
          entry,
          input.query,
          input.startedAt,
          input.normalizeOptions,
        ),
      )
      .filter(Boolean),
    nextCursor: payload?.nextCursorMark ?? null,
    recordsFetched: results.length,
  };
}

function parseCheckpoint(value: unknown) {
  const record =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    sourceIndex:
      typeof (record as { source_index?: unknown }).source_index === 'number'
        ? Math.max(
            0,
            Math.trunc((record as { source_index: number }).source_index),
          )
        : 0,
    queryIndex:
      typeof (record as { query_index?: unknown }).query_index === 'number'
        ? Math.max(
            0,
            Math.trunc((record as { query_index: number }).query_index),
          )
        : 0,
    cursors:
      (record as { cursors?: Record<string, string> }).cursors &&
      typeof (record as { cursors: unknown }).cursors === 'object'
        ? (record as { cursors: Record<string, string> }).cursors
        : {},
    exhausted: Array.isArray((record as { exhausted?: unknown }).exhausted)
      ? new Set((record as { exhausted: string[] }).exhausted)
      : new Set<string>(),
  };
}

type BulkCheckpoint = ReturnType<typeof parseCheckpoint>;

function advanceCheckpointToNextQuery(
  checkpoint: BulkCheckpoint,
  queriesLength: number,
) {
  checkpoint.queryIndex += 1;
  if (checkpoint.queryIndex % queriesLength === 0) {
    checkpoint.sourceIndex += 1;
  }
}

export function resolveBulkRunFinalState(input: {
  catalogTotal: number;
  exhaustedWithoutTarget: boolean;
  maxProviderPages: number;
  pagesProcessed: number;
  targetTotal: number;
}) {
  const reachedTarget = input.catalogTotal >= input.targetTotal;
  const pausedAfterPageLimit =
    !reachedTarget &&
    !input.exhaustedWithoutTarget &&
    input.pagesProcessed >= input.maxProviderPages;
  const status: 'COMPLETED' | 'STARTED' =
    reachedTarget || input.exhaustedWithoutTarget ? 'COMPLETED' : 'STARTED';
  const warning = reachedTarget
    ? null
    : input.exhaustedWithoutTarget
      ? `Real corpus sources exhausted before target_total. Current catalog_total=${input.catalogTotal}; target_total=${input.targetTotal}.`
      : `Paused after max-provider-pages=${input.maxProviderPages} before target_total. Current catalog_total=${input.catalogTotal}; target_total=${input.targetTotal}. Resume the same run id to continue.`;

  return {
    pausedAfterPageLimit,
    status,
    warning,
  };
}

export async function recordBulkIngestionFailure(input: {
  activeRunId?: string | null;
  config: BulkFailureConfig;
  message: string;
  prisma: ReturnType<typeof getPrismaClient>;
  query: string;
  sourceType: ReturnType<typeof sourceTypeForRun>;
}) {
  if (input.activeRunId) {
    return input.prisma.ingestionRun.update({
      where: { id: input.activeRunId },
      data: {
        sourceType: input.sourceType,
        query: input.query,
        recordsFailed: { increment: 1 },
        failureDetail: {
          message: input.message,
          recoverable: true,
          run_status_preserved: 'STARTED',
        },
      },
    });
  }

  return input.prisma.ingestionRun.create({
    data: {
      sourceType: input.sourceType,
      triggerMode,
      query: 'bulk trusted scientific corpus failure',
      status: 'FAILED',
      targetTotal: input.config.targetTotal,
      batchSize: input.config.batchSize,
      autoAccept: input.config.autoAcceptTrustedCorpus,
      recordsFailed: 1,
      summary: { error: input.message },
      failureDetail: { message: input.message },
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
}

export async function findOrCreateBulkRun(input: {
  autoAccept: boolean;
  batchSize: number;
  prisma: ReturnType<typeof getPrismaClient>;
  resume: boolean;
  resumeRunId?: string | null;
  targetTotal: number;
}) {
  if (input.resumeRunId) {
    const existing = await input.prisma.ingestionRun.findUnique({
      where: { id: input.resumeRunId },
    });

    if (!existing) {
      throw new Error(`Bulk ingestion run ${input.resumeRunId} was not found.`);
    }

    if (existing.triggerMode !== triggerMode) {
      throw new Error(
        `Bulk ingestion run ${input.resumeRunId} has triggerMode ${existing.triggerMode}; expected ${triggerMode}.`,
      );
    }

    if (existing.status !== 'STARTED') {
      throw new Error(
        `Bulk ingestion run ${input.resumeRunId} has status ${existing.status}; only STARTED runs can be resumed.`,
      );
    }

    return existing;
  }

  if (input.resume) {
    const existing = await input.prisma.ingestionRun.findFirst({
      where: {
        triggerMode,
        status: 'STARTED',
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    if (existing) {
      return existing;
    }
  }

  return input.prisma.ingestionRun.create({
    data: {
      sourceType: 'OPENALEX',
      triggerMode,
      query: 'bulk trusted scientific corpus',
      status: 'STARTED',
      targetTotal: input.targetTotal,
      batchSize: input.batchSize,
      autoAccept: input.autoAccept,
      checkpoint: {
        source_index: 0,
        query_index: 0,
        cursors: {},
        exhausted: [],
      },
      summary: {
        acceptance_policy: TRUSTED_CORPUS_AUTO_ACCEPT_POLICY,
        ingestion_mode: 'bulk',
      },
      startedAt: new Date(),
    },
  });
}

export async function runScientificEvidenceIngestion(overrides = {}) {
  const options = {
    ...parseScriptOptions(),
    ...overrides,
  };
  const ingestionConfig = getEvidenceIngestionConfig(options);
  const dryRun = optionFlag(options, 'dryRun', false);
  const resume = optionFlag(options, 'resume', true);
  const resumeRunId =
    String(
      optionValue(
        options,
        ['run-id', 'runId', 'resume-run-id', 'resumeRunId'],
        '',
      ),
    ).trim() || null;
  const configPath = String(
    optionValue(options, 'config', '../data/bigdata-bootstrap.config.json'),
  );
  const queryLimit = optionNumber(options, 'queryLimit', 0, 0, 10000);
  const queries = readConfiguredQueries(configPath, queryLimit);
  const selectedSources = optionList(options, 'sources', [
    'openalex',
    'crossref',
    'europepmc',
  ])
    .map((source: string) => normalizeSource(source))
    .filter((entry: BulkSource | null): entry is BulkSource => Boolean(entry));
  const maxProviderPages = optionNumber(
    options,
    ['max-provider-pages', 'maxProviderPages'],
    500,
    1,
    100000,
  );
  const mailto =
    String(
      optionValue(
        options,
        'mailto',
        process.env.OPENALEX_MAILTO?.trim() ??
          process.env.CROSSREF_MAILTO?.trim() ??
          '',
      ),
    ).trim() || null;
  const europePmcEmail =
    String(
      optionValue(
        options,
        'email',
        process.env.EUROPE_PMC_EMAIL?.trim() ?? mailto ?? '',
      ),
    ).trim() || null;
  const openAlexApiKey =
    String(
      optionValue(
        options,
        'apiKey',
        process.env.OPENALEX_API_KEY?.trim() ?? '',
      ),
    ).trim() || null;
  const startedAt = new Date().toISOString();

  if (queries.length === 0) {
    throw new Error(
      `No real corpus queries were found in ${configPath}; cannot ingest scientific evidence.`,
    );
  }

  if (selectedSources.length === 0) {
    throw new Error('At least one real corpus source is required.');
  }

  if (dryRun) {
    const output = {
      dryRun: true,
      command: 'evidence:ingest',
      targetTotal: ingestionConfig.targetTotal,
      batchSize: ingestionConfig.batchSize,
      autoAcceptTrustedCorpus: ingestionConfig.autoAcceptTrustedCorpus,
      sources: selectedSources,
      resumeRunId,
      queryCount: queries.length,
      acceptancePolicy: TRUSTED_CORPUS_AUTO_ACCEPT_POLICY,
    };
    console.log(JSON.stringify(output, null, 2));
    return output;
  }

  const prisma = getPrismaClient();
  let activeRunId: string | null = null;
  let activeQuery = 'bulk trusted scientific corpus failure';
  let activeSourceType: ReturnType<typeof sourceTypeForRun> = 'OPENALEX';

  try {
    const run = await findOrCreateBulkRun({
      autoAccept: ingestionConfig.autoAcceptTrustedCorpus,
      batchSize: ingestionConfig.batchSize,
      prisma,
      resume,
      resumeRunId,
      targetTotal: ingestionConfig.targetTotal,
    });
    activeRunId = run.id;
    const checkpoint = parseCheckpoint(run.checkpoint);
    let catalogTotal = await prisma.externalEvidenceCatalogItem.count();
    const initialCatalogTotal = catalogTotal;
    let recordsFetched = run.recordsFetched;
    let recordsStored = run.recordsStored;
    let recordsAccepted = run.recordsAccepted;
    let recordsPendingReview = run.recordsPendingReview;
    let recordsRejected = run.recordsRejected;
    let recordsFailed = run.recordsFailed;
    let duplicatesSkipped = run.duplicatesSkipped;
    let pagesProcessed = 0;
    let exhaustedWithoutTarget = false;

    while (
      catalogTotal < ingestionConfig.targetTotal &&
      pagesProcessed < maxProviderPages
    ) {
      const source =
        selectedSources[checkpoint.sourceIndex % selectedSources.length];
      const query = queries[checkpoint.queryIndex % queries.length];
      const cursorKey = `${source}:${query}`;
      activeQuery = query;
      activeSourceType = sourceTypeForRun(source);

      if (
        checkpoint.exhausted.size >=
        selectedSources.length * queries.length
      ) {
        exhaustedWithoutTarget = true;
        break;
      }

      if (checkpoint.exhausted.has(cursorKey)) {
        advanceCheckpointToNextQuery(checkpoint, queries.length);
        continue;
      }

      const cursor = checkpoint.cursors[cursorKey] ?? '*';
      const normalizeOptions = {
        acceptancePolicy: TRUSTED_CORPUS_AUTO_ACCEPT_POLICY,
        autoAcceptTrustedCorpus: ingestionConfig.autoAcceptTrustedCorpus,
        ingestionBatchId: run.id,
        ingestionMode: ingestionConfig.ingestionMode,
      };
      let batch: ProviderBatch;
      try {
        batch =
          source === 'openalex'
            ? await fetchOpenAlexBatch({
                apiKey: openAlexApiKey,
                cursor,
                mailto,
                normalizeOptions,
                pageSize: ingestionConfig.batchSize,
                query,
                startedAt,
              })
            : source === 'crossref'
              ? await fetchCrossrefBatch({
                  cursor,
                  mailto,
                  normalizeOptions,
                  pageSize: ingestionConfig.batchSize,
                  query,
                  startedAt,
                })
              : await fetchEuropePmcBatch({
                  cursor,
                  email: europePmcEmail,
                  normalizeOptions,
                  pageSize: ingestionConfig.batchSize,
                  query,
                  startedAt,
                });
      } catch (error) {
        if (!isRecoverableProviderCursorError(error)) {
          throw error;
        }

        recordsFailed += 1;
        pagesProcessed += 1;
        checkpoint.exhausted.add(cursorKey);
        delete checkpoint.cursors[cursorKey];
        advanceCheckpointToNextQuery(checkpoint, queries.length);
        catalogTotal = await prisma.externalEvidenceCatalogItem.count();
        await prisma.ingestionRun.update({
          where: { id: run.id },
          data: {
            sourceType: sourceTypeForRun(source),
            query,
            recordsFetched,
            recordsStored,
            recordsAccepted,
            recordsPendingReview,
            recordsRejected,
            recordsFailed,
            duplicatesSkipped,
            checkpoint: {
              source_index: checkpoint.sourceIndex,
              query_index: checkpoint.queryIndex,
              cursors: checkpoint.cursors,
              exhausted: [...checkpoint.exhausted],
              pages_processed_this_execution: pagesProcessed,
              catalog_total: catalogTotal,
            },
            failureDetail: {
              action: 'marked_cursor_exhausted',
              cursor_key: cursorKey,
              message: error.message,
              recoverable: true,
              run_status_preserved: 'STARTED',
              status: error.status,
            },
            summary: {
              acceptance_policy: TRUSTED_CORPUS_AUTO_ACCEPT_POLICY,
              auto_accept_trusted_corpus:
                ingestionConfig.autoAcceptTrustedCorpus,
              batch_size: ingestionConfig.batchSize,
              current_catalog_total: catalogTotal,
              initial_catalog_total: initialCatalogTotal,
              target_total: ingestionConfig.targetTotal,
            },
          },
        });
        continue;
      }

      const entries = deduplicateEntries(batch.entries);
      const persisted = await persistNormalizedEntries(prisma, entries, {
        acceptancePolicy: TRUSTED_CORPUS_AUTO_ACCEPT_POLICY,
        autoAcceptTrustedCorpus: ingestionConfig.autoAcceptTrustedCorpus,
        ingestionBatchId: run.id,
        ingestionMode: ingestionConfig.ingestionMode,
        maxNewCatalogItems: Math.max(
          0,
          ingestionConfig.targetTotal - catalogTotal,
        ),
        runId: run.id,
      });

      recordsFetched += batch.recordsFetched;
      recordsStored += persisted.recordsStored;
      recordsAccepted += persisted.recordsAccepted;
      recordsPendingReview += persisted.recordsPendingReview;
      recordsRejected += persisted.recordsRejected;
      recordsFailed += persisted.recordsFailed;
      duplicatesSkipped += persisted.duplicatesSkipped;
      pagesProcessed += 1;

      if (!batch.nextCursor || batch.recordsFetched === 0) {
        checkpoint.exhausted.add(cursorKey);
      } else {
        checkpoint.cursors[cursorKey] = batch.nextCursor;
      }

      advanceCheckpointToNextQuery(checkpoint, queries.length);

      catalogTotal = await prisma.externalEvidenceCatalogItem.count();
      await prisma.ingestionRun.update({
        where: { id: run.id },
        data: {
          sourceType: sourceTypeForRun(source),
          query,
          recordsFetched,
          recordsStored,
          recordsAccepted,
          recordsPendingReview,
          recordsRejected,
          recordsFailed,
          duplicatesSkipped,
          checkpoint: {
            source_index: checkpoint.sourceIndex,
            query_index: checkpoint.queryIndex,
            cursors: checkpoint.cursors,
            exhausted: [...checkpoint.exhausted],
            pages_processed_this_execution: pagesProcessed,
            catalog_total: catalogTotal,
          },
          summary: {
            acceptance_policy: TRUSTED_CORPUS_AUTO_ACCEPT_POLICY,
            auto_accept_trusted_corpus: ingestionConfig.autoAcceptTrustedCorpus,
            batch_size: ingestionConfig.batchSize,
            current_catalog_total: catalogTotal,
            initial_catalog_total: initialCatalogTotal,
            target_total: ingestionConfig.targetTotal,
          },
        },
      });
    }

    const finalState = resolveBulkRunFinalState({
      catalogTotal,
      exhaustedWithoutTarget,
      maxProviderPages,
      pagesProcessed,
      targetTotal: ingestionConfig.targetTotal,
    });

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: finalState.status,
        completedAt: finalState.status === 'COMPLETED' ? new Date() : null,
        failureDetail: finalState.warning
          ? { warning: finalState.warning }
          : undefined,
        summary: {
          acceptance_policy: TRUSTED_CORPUS_AUTO_ACCEPT_POLICY,
          auto_accept_trusted_corpus: ingestionConfig.autoAcceptTrustedCorpus,
          batch_size: ingestionConfig.batchSize,
          current_catalog_total: catalogTotal,
          exhausted_without_target: exhaustedWithoutTarget,
          initial_catalog_total: initialCatalogTotal,
          paused_after_page_limit: finalState.pausedAfterPageLimit,
          target_total: ingestionConfig.targetTotal,
          warning: finalState.warning,
        },
      },
    });

    const output = {
      runId: run.id,
      targetTotal: ingestionConfig.targetTotal,
      initialCatalogTotal,
      catalogTotal,
      recordsToIngestAtStart: Math.max(
        0,
        ingestionConfig.targetTotal - initialCatalogTotal,
      ),
      recordsFetched,
      recordsStored,
      recordsAccepted,
      recordsPendingReview,
      recordsRejected,
      recordsFailed,
      duplicatesSkipped,
      warning: finalState.warning,
    };
    console.log(JSON.stringify(output, null, 2));
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordBulkIngestionFailure({
      activeRunId,
      config: ingestionConfig,
      message,
      prisma,
      query: activeQuery,
      sourceType: activeSourceType,
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
  runScientificEvidenceIngestion().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
