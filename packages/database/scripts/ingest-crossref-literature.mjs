import { PrismaClient } from '@prisma/client';

import { loadWorkspaceEnv } from './load-workspace-env.mjs';
import { normalizeCrossrefWork } from './external-ingestion-shared.mjs';

loadWorkspaceEnv(import.meta.url);

const prisma = new PrismaClient();

async function main() {
  const query = process.env.INGEST_QUERY?.trim();
  const limit = Math.max(1, Number(process.env.INGEST_LIMIT ?? '10'));
  const mailto = process.env.CROSSREF_MAILTO?.trim();

  if (!query) {
    throw new Error('INGEST_QUERY is required for Crossref ingestion.');
  }

  const startedAt = new Date();
  const requestUrl = new URL('https://api.crossref.org/works');
  requestUrl.searchParams.set('query', query);
  requestUrl.searchParams.set('rows', String(limit));

  if (mailto) {
    requestUrl.searchParams.set('mailto', mailto);
  }

  const run = await prisma.ingestionRun.create({
    data: {
      sourceType: 'CROSSREF',
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
    const normalizedEntries = results
      .map((entry) =>
        normalizeCrossrefWork(entry, query, startedAt.toISOString()),
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
        },
      },
    });

    console.log(
      JSON.stringify(
        {
          runId: run.id,
          sourceType: 'CROSSREF',
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
    await prisma.$disconnect();
  }
}

void main();
