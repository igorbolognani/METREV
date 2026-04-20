import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';

import { loadWorkspaceEnv } from './load-workspace-env.mjs';
import { normalizeOpenAlexWork } from './external-ingestion-shared.mjs';

loadWorkspaceEnv(import.meta.url);

const prisma = getPrismaClient();

async function main() {
  const query = process.env.INGEST_QUERY?.trim();
  const apiKey = process.env.OPENALEX_API_KEY?.trim();
  const limit = Math.max(1, Number(process.env.INGEST_LIMIT ?? '10'));

  if (!query) {
    throw new Error('INGEST_QUERY is required for OpenAlex ingestion.');
  }

  if (!apiKey) {
    throw new Error('OPENALEX_API_KEY is required for OpenAlex ingestion.');
  }

  const startedAt = new Date();
  const requestUrl = new URL('https://api.openalex.org/works');
  requestUrl.searchParams.set('search', query);
  requestUrl.searchParams.set('per-page', String(limit));
  requestUrl.searchParams.set('api_key', apiKey);

  const run = await prisma.ingestionRun.create({
    data: {
      sourceType: 'OPENALEX',
      triggerMode: 'manual_script',
      query,
      status: 'STARTED',
      recordsFetched: 0,
      recordsStored: 0,
      summary: {
        request_url: requestUrl.toString(),
      },
      startedAt,
    },
  });

  try {
    const response = await fetch(requestUrl, {
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAlex request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const normalizedEntries = results
      .map((entry) =>
        normalizeOpenAlexWork(entry, query, startedAt.toISOString()),
      )
      .filter(Boolean);

    let stored = 0;

    for (const entry of normalizedEntries) {
      const source = await prisma.externalSourceRecord.upsert({
        where: {
          sourceType_sourceKey: {
            sourceType: entry.sourceRecord.sourceType,
            sourceKey: entry.sourceRecord.sourceKey,
          },
        },
        update: {
          sourceUrl: entry.sourceRecord.sourceUrl,
          title: entry.sourceRecord.title,
          sourceCategory: entry.sourceRecord.sourceCategory,
          doi: entry.sourceRecord.doi,
          publisher: entry.sourceRecord.publisher,
          publishedAt: entry.sourceRecord.publishedAt
            ? new Date(entry.sourceRecord.publishedAt)
            : null,
          asOf: entry.sourceRecord.asOf
            ? new Date(entry.sourceRecord.asOf)
            : null,
          abstractText: entry.sourceRecord.abstractText,
          rawPayload: entry.sourceRecord.rawPayload,
        },
        create: {
          sourceType: entry.sourceRecord.sourceType,
          sourceKey: entry.sourceRecord.sourceKey,
          sourceUrl: entry.sourceRecord.sourceUrl,
          title: entry.sourceRecord.title,
          sourceCategory: entry.sourceRecord.sourceCategory,
          doi: entry.sourceRecord.doi,
          publisher: entry.sourceRecord.publisher,
          publishedAt: entry.sourceRecord.publishedAt
            ? new Date(entry.sourceRecord.publishedAt)
            : null,
          asOf: entry.sourceRecord.asOf
            ? new Date(entry.sourceRecord.asOf)
            : null,
          abstractText: entry.sourceRecord.abstractText,
          rawPayload: entry.sourceRecord.rawPayload,
        },
        select: { id: true },
      });

      await prisma.externalEvidenceCatalogItem.upsert({
        where: {
          sourceRecordId_evidenceType_title: {
            sourceRecordId: source.id,
            evidenceType: entry.catalogItem.evidenceType,
            title: entry.catalogItem.title,
          },
        },
        update: {
          summary: entry.catalogItem.summary,
          strengthLevel: entry.catalogItem.strengthLevel,
          provenanceNote: entry.catalogItem.provenanceNote,
          reviewStatus: entry.catalogItem.reviewStatus,
          sourceState: entry.catalogItem.sourceState,
          applicabilityScope: entry.catalogItem.applicabilityScope,
          extractedClaims: entry.catalogItem.extractedClaims,
          tags: entry.catalogItem.tags,
          payload: entry.catalogItem.payload,
        },
        create: {
          sourceRecordId: source.id,
          evidenceType: entry.catalogItem.evidenceType,
          title: entry.catalogItem.title,
          summary: entry.catalogItem.summary,
          strengthLevel: entry.catalogItem.strengthLevel,
          provenanceNote: entry.catalogItem.provenanceNote,
          reviewStatus: entry.catalogItem.reviewStatus,
          sourceState: entry.catalogItem.sourceState,
          applicabilityScope: entry.catalogItem.applicabilityScope,
          extractedClaims: entry.catalogItem.extractedClaims,
          tags: entry.catalogItem.tags,
          payload: entry.catalogItem.payload,
        },
      });

      stored += 1;
    }

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        recordsFetched: results.length,
        recordsStored: stored,
        completedAt: new Date(),
        summary: {
          request_url: requestUrl.toString(),
          next_cursor: payload?.meta?.next_cursor ?? null,
        },
      },
    });

    console.log(
      JSON.stringify(
        {
          runId: run.id,
          sourceType: 'OPENALEX',
          recordsFetched: results.length,
          recordsStored: stored,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        summary: {
          request_url: requestUrl.toString(),
          error_message: error instanceof Error ? error.message : String(error),
        },
      },
    });

    throw error;
  } finally {
    await disconnectPrismaClient();
  }
}

void main();