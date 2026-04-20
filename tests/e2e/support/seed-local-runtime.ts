import { disconnectPrismaClient, getPrismaClient } from '@metrev/database';

import {
  seededEvidenceSourceKey,
  seededEvidenceSummary,
  seededEvidenceTitle,
} from './local-runtime';

async function main(): Promise<void> {
  const prisma = getPrismaClient();

  try {
    const source = await prisma.externalSourceRecord.upsert({
      where: {
        sourceType_sourceKey: {
          sourceType: 'CROSSREF',
          sourceKey: seededEvidenceSourceKey,
        },
      },
      update: {
        sourceUrl: 'https://doi.org/10.5555/metrev-playwright-local',
        title: seededEvidenceTitle,
        sourceCategory: 'scholarly_work',
        doi: '10.5555/metrev-playwright-local',
        publisher: 'METREV Local Evidence Lab',
        publishedAt: new Date('2026-04-01T00:00:00.000Z'),
        asOf: new Date('2026-04-01T00:00:00.000Z'),
        abstractText:
          'This local fixture exists only to validate the review-to-intake workflow under Playwright.',
        rawPayload: {
          fixture: 'playwright-local-e2e',
          source: 'crossref',
        },
      },
      create: {
        sourceType: 'CROSSREF',
        sourceKey: seededEvidenceSourceKey,
        sourceUrl: 'https://doi.org/10.5555/metrev-playwright-local',
        title: seededEvidenceTitle,
        sourceCategory: 'scholarly_work',
        doi: '10.5555/metrev-playwright-local',
        publisher: 'METREV Local Evidence Lab',
        publishedAt: new Date('2026-04-01T00:00:00.000Z'),
        asOf: new Date('2026-04-01T00:00:00.000Z'),
        abstractText:
          'This local fixture exists only to validate the review-to-intake workflow under Playwright.',
        rawPayload: {
          fixture: 'playwright-local-e2e',
          source: 'crossref',
        },
      },
      select: {
        id: true,
      },
    });

    await prisma.externalEvidenceCatalogItem.upsert({
      where: {
        sourceRecordId_evidenceType_title: {
          sourceRecordId: source.id,
          evidenceType: 'literature_evidence',
          title: seededEvidenceTitle,
        },
      },
      update: {
        summary: seededEvidenceSummary,
        strengthLevel: 'strong',
        provenanceNote:
          'Playwright local fixture reset to pending so the analyst review flow stays reproducible.',
        reviewStatus: 'PENDING',
        sourceState: 'PARSED',
        applicabilityScope: {
          primary_objective: 'wastewater_treatment',
          validation_surface: 'playwright-local-e2e',
        },
        extractedClaims: [
          {
            claim:
              'Accepted external evidence must become selectable in the intake deck.',
            confidence: 'high',
          },
        ],
        tags: ['playwright', 'local-e2e', 'review-flow'],
        payload: {
          fixture: 'playwright-local-e2e',
          ready_for_review: true,
        },
      },
      create: {
        sourceRecordId: source.id,
        evidenceType: 'literature_evidence',
        title: seededEvidenceTitle,
        summary: seededEvidenceSummary,
        strengthLevel: 'strong',
        provenanceNote:
          'Playwright local fixture reset to pending so the analyst review flow stays reproducible.',
        reviewStatus: 'PENDING',
        sourceState: 'PARSED',
        applicabilityScope: {
          primary_objective: 'wastewater_treatment',
          validation_surface: 'playwright-local-e2e',
        },
        extractedClaims: [
          {
            claim:
              'Accepted external evidence must become selectable in the intake deck.',
            confidence: 'high',
          },
        ],
        tags: ['playwright', 'local-e2e', 'review-flow'],
        payload: {
          fixture: 'playwright-local-e2e',
          ready_for_review: true,
        },
      },
    });
  } finally {
    await disconnectPrismaClient();
  }
}

void main();
