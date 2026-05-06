import { pathToFileURL } from 'node:url';

import { disconnectPrismaClient, getPrismaClient } from '@metrev/database';
import { researchPaperMetadataSchema } from '@metrev/domain-contracts';
import { getDefaultResearchColumns } from '@metrev/research-intelligence';

import {
    seededEvidenceSourceKey,
    seededEvidenceSummary,
    seededEvidenceTitle,
    seededResearchPaperTitle,
    seededResearchReviewFixtures,
} from './local-runtime';

function padIndex(index: number): string {
  return String(index).padStart(3, '0');
}

function buildResearchSourceKey(reviewId: string, index: number): string {
  return `${reviewId}-paper-${padIndex(index)}`;
}

function buildResearchPaperUrls(reviewId: string, index: number) {
  const suffix = `${reviewId}/${padIndex(index)}`;

  return {
    sourceUrl: `https://doi.org/10.5555/${suffix}`,
    pdfUrl: `https://fixtures.metrev.local/research/${suffix}.pdf`,
    xmlUrl: `https://fixtures.metrev.local/research/${suffix}.xml`,
  };
}

function buildResearchAbstract(paperCount: number, index: number): string {
  return [
    `Open-access microbial fuel cell (MFC) and microbial electrolysis cell (MEC) microbial electrochemical technology review fixture ${padIndex(index)} for the ${paperCount}-paper Playwright regression.`,
    'The study reports wastewater treatment with carbon felt anodes, a Nafion separator, Pt/C cathode, pH 7, temperature 30 C, and traceable full-text links.',
    `Power density reached ${800 + index} mW/m2 while COD removal reached ${75 + (index % 10)}%.`,
  ].join(' ');
}

function buildResearchPaperMetadata(input: {
  paperCount: number;
  index: number;
  sourceDocumentId: string;
  sourceUrl: string;
  pdfUrl: string;
  xmlUrl: string;
}): ReturnType<typeof researchPaperMetadataSchema.parse> {
  return researchPaperMetadataSchema.parse({
    paper_id: `${input.sourceDocumentId}-paper`,
    source_document_id: input.sourceDocumentId,
    document_type: 'paper',
    title: seededResearchPaperTitle(input.paperCount, input.index),
    authors: [{ name: 'METREV Playwright Seed' }],
    year: 2026,
    doi: `10.5555/${input.sourceDocumentId}`,
    journal: 'Journal of Microbial Electrochemical Systems',
    publisher: 'METREV Local Evidence Lab',
    source_type: 'crossref',
    source_url: input.sourceUrl,
    pdf_url: input.pdfUrl,
    xml_url: input.xmlUrl,
    abstract_text: buildResearchAbstract(input.paperCount, input.index),
    citation_count: Math.max(0, 150 - input.index),
    access_status: 'green',
    source_license: 'CC-BY-4.0',
    metadata: {
      fixture: 'playwright-local-e2e-research-review',
      review_paper_count: input.paperCount,
      paper_index: input.index,
    },
  });
}

export async function seedResearchReviewFixtures(): Promise<void> {
  const prisma = getPrismaClient();
  const defaultColumns = getDefaultResearchColumns();

  for (const fixture of seededResearchReviewFixtures) {
    await prisma.researchReview.deleteMany({
      where: {
        OR: [{ id: fixture.reviewId }, { title: fixture.title }],
      },
    });

    const sources = [] as Array<{
      id: string;
      index: number;
      pdfUrl: string;
      sourceUrl: string;
      xmlUrl: string;
    }>;

    for (let index = 1; index <= fixture.paperCount; index += 1) {
      const urls = buildResearchPaperUrls(fixture.reviewId, index);
      const title = seededResearchPaperTitle(fixture.paperCount, index);
      const source = await prisma.externalSourceRecord.upsert({
        where: {
          sourceType_sourceKey: {
            sourceType: 'CROSSREF',
            sourceKey: buildResearchSourceKey(fixture.reviewId, index),
          },
        },
        update: {
          sourceUrl: urls.sourceUrl,
          title,
          sourceCategory: 'scholarly_work',
          doi: `10.5555/${fixture.reviewId}-${padIndex(index)}`,
          publisher: 'METREV Local Evidence Lab',
          journal: 'Journal of Microbial Electrochemical Systems',
          authors: [{ name: 'METREV Playwright Seed' }],
          language: 'en',
          license: 'CC-BY-4.0',
          accessStatus: 'GREEN',
          publishedAt: new Date(
            `2026-03-${String(((index - 1) % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
          ),
          asOf: new Date('2026-05-05T00:00:00.000Z'),
          pdfUrl: urls.pdfUrl,
          xmlUrl: urls.xmlUrl,
          publicationYear: 2026,
          firstAuthor: 'METREV Playwright Seed',
          abstractText: buildResearchAbstract(fixture.paperCount, index),
          rawPayload: {
            fixture: 'playwright-local-e2e-research-review',
            xml_url: urls.xmlUrl,
            review_id: fixture.reviewId,
            review_title: fixture.title,
            paper_index: index,
            technology_scope: ['MFC', 'MEC', 'MET'],
          },
        },
        create: {
          sourceType: 'CROSSREF',
          sourceKey: buildResearchSourceKey(fixture.reviewId, index),
          sourceUrl: urls.sourceUrl,
          title,
          sourceCategory: 'scholarly_work',
          doi: `10.5555/${fixture.reviewId}-${padIndex(index)}`,
          publisher: 'METREV Local Evidence Lab',
          journal: 'Journal of Microbial Electrochemical Systems',
          authors: [{ name: 'METREV Playwright Seed' }],
          language: 'en',
          license: 'CC-BY-4.0',
          accessStatus: 'GREEN',
          publishedAt: new Date(
            `2026-03-${String(((index - 1) % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
          ),
          asOf: new Date('2026-05-05T00:00:00.000Z'),
          pdfUrl: urls.pdfUrl,
          xmlUrl: urls.xmlUrl,
          publicationYear: 2026,
          firstAuthor: 'METREV Playwright Seed',
          abstractText: buildResearchAbstract(fixture.paperCount, index),
          rawPayload: {
            fixture: 'playwright-local-e2e-research-review',
            xml_url: urls.xmlUrl,
            review_id: fixture.reviewId,
            review_title: fixture.title,
            paper_index: index,
            technology_scope: ['MFC', 'MEC', 'MET'],
          },
        },
        select: {
          id: true,
        },
      });

      sources.push({
        id: source.id,
        index,
        pdfUrl: urls.pdfUrl,
        sourceUrl: urls.sourceUrl,
        xmlUrl: urls.xmlUrl,
      });
    }

    await prisma.researchReview.create({
      data: {
        id: fixture.reviewId,
        title: fixture.title,
        query: `playwright seeded microbial electrochemical technology review ${fixture.paperCount} papers`,
        createdBy: 'playwright-local-e2e',
        papers: {
          create: sources.map((source, position) => ({
            id: `${fixture.reviewId}-paper-${padIndex(source.index)}`,
            sourceRecordId: source.id,
            position,
            metadataSnapshot: buildResearchPaperMetadata({
              paperCount: fixture.paperCount,
              index: source.index,
              sourceDocumentId: source.id,
              sourceUrl: source.sourceUrl,
              pdfUrl: source.pdfUrl,
              xmlUrl: source.xmlUrl,
            }),
          })),
        },
        columns: {
          create: defaultColumns.map((column) => ({
            id: `${fixture.reviewId}-${column.column_id}`,
            columnId: column.column_id,
            name: column.name,
            columnGroup: column.group,
            columnType: column.type,
            answerStructure: column.answer_structure,
            instructions: column.instructions,
            outputSchemaKey: column.output_schema_key,
            outputSchema: column.output_schema,
            visible: column.visible,
            position: column.position,
          })),
        },
      },
    });
  }
}

async function main(): Promise<void> {
  const prisma = getPrismaClient();

  try {
    if (process.argv.includes('--research-review-fixtures-only')) {
      await seedResearchReviewFixtures();
      return;
    }

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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main();
}
