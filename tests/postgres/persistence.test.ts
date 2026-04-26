import fixture from '../fixtures/raw-case-input.json';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
    defaultSessionCookieName,
    type SessionActor,
    type SessionResolver,
} from '@metrev/auth';
import {
    PrismaResearchRepository,
    disconnectPrismaClient,
    getPrismaClient,
} from '@metrev/database';
import {
    DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
    buildDecisionIngestionPreview,
    buildResearchEvidencePack,
    getDefaultResearchColumns,
    runDeterministicResearchExtraction,
} from '@metrev/research-intelligence';
import { buildApp } from '../../apps/api-server/src/app';
import {
    normalizeOpenAlexWork,
    persistNormalizedEntries,
} from '../../packages/database/scripts/external-ingestion-shared.mjs';

const caseId = 'CASE-POSTGRES-SUITE';
const lineageCaseId = 'CASE-POSTGRES-LINEAGE-SUITE';
const supplierNames = [
  'Current Supplier',
  'Preferred Supplier',
  'Blocked Supplier',
];
const catalogSourceKey = 'postgres-suite-openalex-source';
const ingestionCatalogSourceKey = 'https://openalex.org/WPOSTGRESINGESTION';
const initialIngestionRunId = 'postgres-ingestion-run-1';
const reingestionRunId = 'postgres-ingestion-run-2';
const legacyCatalogSourceKey = 'postgres-suite-curated-legacy-source';
const researchSourceKey = 'postgres-suite-research-source';
const researchQuery = 'postgres suite research fixture';
const unmatchedResearchQuery = 'zzqvnomatchfixturetoken';

function requiredDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required for pnpm run test:db. Run pnpm run db:bootstrap against a reachable PostgreSQL instance first.',
    );
  }

  return databaseUrl;
}

describe('postgres-backed persistence flow', () => {
  let actor: SessionActor;

  const sessionResolver: SessionResolver = async ({ cookieHeader }) => {
    return cookieHeader?.includes(`${defaultSessionCookieName}=postgres-suite`)
      ? actor
      : null;
  };

  beforeAll(async () => {
    requiredDatabaseUrl();
    process.env.METREV_STORAGE_MODE = 'postgres';

    const prisma = getPrismaClient();
    const analystEmail =
      process.env.METREV_LOCAL_ANALYST_EMAIL ?? 'analyst@metrev.local';
    const user = await prisma.user.findUnique({
      where: { email: analystEmail.toLowerCase() },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user || !user.email) {
      throw new Error(
        'Seeded analyst user not found. Run pnpm run db:seed before pnpm run test:db.',
      );
    }

    actor = {
      userId: user.id,
      email: user.email,
      role: 'ANALYST',
      sessionId: 'postgres-suite-session',
      sessionToken: 'postgres-suite',
    };

    await prisma.caseRecord.deleteMany({ where: { id: caseId } });
    await prisma.caseRecord.deleteMany({ where: { id: lineageCaseId } });
    await prisma.externalSourceRecord.deleteMany({
      where: {
        sourceType: 'OPENALEX',
        sourceKey: catalogSourceKey,
      },
    });
    await prisma.externalSourceRecord.deleteMany({
      where: {
        sourceType: 'OPENALEX',
        sourceKey: ingestionCatalogSourceKey,
      },
    });
    await prisma.ingestionRun.deleteMany({
      where: {
        id: {
          in: [initialIngestionRunId, reingestionRunId],
        },
      },
    });
    await prisma.externalSourceRecord.deleteMany({
      where: {
        sourceType: 'CURATED_MANIFEST',
        sourceKey: legacyCatalogSourceKey,
      },
    });
    await prisma.researchReview.deleteMany({
      where: {
        query: {
          in: [researchQuery, unmatchedResearchQuery],
        },
      },
    });
    await prisma.externalSourceRecord.deleteMany({
      where: {
        sourceType: 'OPENALEX',
        sourceKey: researchSourceKey,
      },
    });
    await prisma.supplier.deleteMany({
      where: {
        normalizedName: {
          in: supplierNames.map((name) => name.toLowerCase()),
        },
      },
    });
  }, 30_000);

  afterAll(async () => {
    const prisma = getPrismaClient();
    await prisma.caseRecord.deleteMany({ where: { id: caseId } });
    await prisma.caseRecord.deleteMany({ where: { id: lineageCaseId } });
    await prisma.externalSourceRecord.deleteMany({
      where: {
        sourceType: 'OPENALEX',
        sourceKey: catalogSourceKey,
      },
    });
    await prisma.externalSourceRecord.deleteMany({
      where: {
        sourceType: 'OPENALEX',
        sourceKey: ingestionCatalogSourceKey,
      },
    });
    await prisma.ingestionRun.deleteMany({
      where: {
        id: {
          in: [initialIngestionRunId, reingestionRunId],
        },
      },
    });
    await prisma.externalSourceRecord.deleteMany({
      where: {
        sourceType: 'CURATED_MANIFEST',
        sourceKey: legacyCatalogSourceKey,
      },
    });
    await prisma.researchReview.deleteMany({
      where: {
        query: {
          in: [researchQuery, unmatchedResearchQuery],
        },
      },
    });
    await prisma.externalSourceRecord.deleteMany({
      where: {
        sourceType: 'OPENALEX',
        sourceKey: researchSourceKey,
      },
    });
    await prisma.supplier.deleteMany({
      where: {
        normalizedName: {
          in: supplierNames.map((name) => name.toLowerCase()),
        },
      },
    });
    await disconnectPrismaClient();
  }, 30_000);

  it('persists create, retrieve, list, history, and supplier relations through Prisma', async () => {
    const app = await buildApp({ sessionResolver });

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/cases/evaluate',
        headers: {
          'content-type': 'application/json',
          cookie: `${defaultSessionCookieName}=postgres-suite`,
        },
        payload: {
          ...fixture,
          case_id: caseId,
          supplier_context: {
            current_suppliers: ['Current Supplier'],
            preferred_suppliers: ['Preferred Supplier'],
            excluded_suppliers: ['Blocked Supplier'],
            supplier_preference_notes:
              'Retain service coverage while validating the preferred supplier.',
          },
          evidence_records: [
            {
              evidence_type: 'supplier_claim',
              title: 'Preferred supplier datasheet',
              summary: 'Supplier claim pending independent corroboration.',
              strength_level: 'weak',
              provenance_note: 'Vendor-provided datasheet.',
              supplier_name: 'Preferred Supplier',
            },
          ],
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json();

      const fetchResponse = await app.inject({
        method: 'GET',
        url: `/api/evaluations/${created.evaluation_id}`,
        headers: {
          cookie: `${defaultSessionCookieName}=postgres-suite`,
        },
      });
      expect(fetchResponse.statusCode).toBe(200);

      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/evaluations',
        headers: {
          cookie: `${defaultSessionCookieName}=postgres-suite`,
        },
      });
      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            evaluation_id: created.evaluation_id,
            case_id: caseId,
          }),
        ]),
      });

      const historyResponse = await app.inject({
        method: 'GET',
        url: `/api/cases/${caseId}/history`,
        headers: {
          cookie: `${defaultSessionCookieName}=postgres-suite`,
        },
      });
      expect(historyResponse.statusCode).toBe(200);
      expect(historyResponse.json()).toMatchObject({
        case: expect.objectContaining({ case_id: caseId }),
        evaluations: [
          expect.objectContaining({ evaluation_id: created.evaluation_id }),
        ],
      });

      const prisma = getPrismaClient();
      const evaluation = await prisma.evaluationRecord.findUnique({
        where: { id: created.evaluation_id },
        include: {
          simulationArtifact: true,
          supplierShortlistItems: {
            include: { supplier: true },
          },
          case: {
            include: {
              supplierPreferences: {
                include: { supplier: true },
              },
            },
          },
        },
      });
      const linkedEvidence = await prisma.evidenceRecord.findMany({
        where: { caseId },
        include: { supplier: true },
      });

      expect(evaluation).not.toBeNull();
      expect(evaluation?.simulationArtifact).toEqual(
        expect.objectContaining({
          status: 'completed',
          modelVersion: expect.any(String),
        }),
      );
      expect(evaluation?.case.supplierPreferences).toHaveLength(3);
      expect(evaluation?.supplierShortlistItems).toHaveLength(3);
      expect(
        evaluation?.case.supplierPreferences.find(
          (entry) => entry.preferenceType === 'PREFERRED',
        ),
      ).toEqual(
        expect.objectContaining({
          supplierLabel: 'Preferred Supplier',
          supplier: expect.objectContaining({
            displayName: 'Preferred Supplier',
          }),
        }),
      );
      expect(
        evaluation?.supplierShortlistItems.find(
          (entry) => entry.category === 'preferred_suppliers',
        ),
      ).toEqual(
        expect.objectContaining({
          candidateLabel: 'Preferred Supplier',
          supplier: expect.objectContaining({
            displayName: 'Preferred Supplier',
          }),
        }),
      );
      expect(
        linkedEvidence.find(
          (entry) => entry.supplier?.displayName === 'Preferred Supplier',
        ),
      ).toBeTruthy();

      const simulationAuditEvent = await prisma.auditEvent.findFirst({
        where: {
          evaluationId: created.evaluation_id,
          eventType: 'simulation_enrichment_completed',
        },
      });

      expect(simulationAuditEvent).not.toBeNull();
    } finally {
      await app.close();
    }
  }, 20000);

  it('persists accepted catalog source lineage, claim lineage, and immutable snapshots', async () => {
    const prisma = getPrismaClient();
    const sourceRecord = await prisma.externalSourceRecord.create({
      data: {
        sourceType: 'OPENALEX',
        sourceKey: catalogSourceKey,
        title: 'Postgres suite accepted catalog evidence',
        sourceCategory: 'scholarly_work',
        sourceUrl: 'https://openalex.org/WPOSTGRESSUITE',
        doi: '10.5555/postgres-suite-catalog',
        publisher: 'METREV Test Harness',
        journal: 'Integration Verification Journal',
        accessStatus: 'GREEN',
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        asOf: new Date('2026-04-22T00:00:00.000Z'),
        abstractText:
          'Accepted catalog evidence for persistence lineage regression coverage.',
        rawPayload: {
          fixture: true,
        },
      },
      select: { id: true },
    });
    const catalogItem = await prisma.externalEvidenceCatalogItem.create({
      data: {
        sourceRecordId: sourceRecord.id,
        evidenceType: 'literature_evidence',
        title: 'Accepted catalog evidence for lineage',
        summary:
          'Accepted external evidence that should produce source and claim lineage.',
        strengthLevel: 'moderate',
        provenanceNote: 'Accepted through postgres regression fixture.',
        reviewStatus: 'ACCEPTED',
        sourceState: 'REVIEWED',
        applicabilityScope: {
          test_fixture: true,
        },
        extractedClaims: [
          'Stable current density was reported under neutral pH.',
          'Wastewater compatibility remained favorable for industrial pilots.',
        ],
        tags: ['postgres-suite', 'catalog-lineage'],
        payload: {
          fixture: true,
        },
      },
      select: { id: true },
    });

    await prisma.evidenceClaim.createMany({
      data: [
        {
          sourceRecordId: sourceRecord.id,
          catalogItemId: catalogItem.id,
          claimType: 'METRIC',
          content: 'Stable current density reached 1.7 A/m2 under neutral pH.',
          extractedValue: '1.7',
          unit: 'A/m2',
          confidence: 0.78,
          extractionMethod: 'IMPORT_RULE',
          extractorVersion: 'postgres-suite',
          sourceSnippet:
            'Stable current density reached 1.7 A/m2 under neutral pH.',
          sourceLocator: 'fixture:1',
          metadata: { fixture: true },
        },
        {
          sourceRecordId: sourceRecord.id,
          catalogItemId: catalogItem.id,
          claimType: 'APPLICABILITY',
          content:
            'Wastewater compatibility remained favorable for industrial pilot deployment.',
          confidence: 0.74,
          extractionMethod: 'IMPORT_RULE',
          extractorVersion: 'postgres-suite',
          sourceSnippet:
            'Wastewater compatibility remained favorable for industrial pilot deployment.',
          sourceLocator: 'fixture:2',
          metadata: { fixture: true },
        },
      ],
    });

    const app = await buildApp({ sessionResolver });

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/cases/evaluate',
        headers: {
          'content-type': 'application/json',
          cookie: `${defaultSessionCookieName}=postgres-suite`,
        },
        payload: {
          ...fixture,
          case_id: lineageCaseId,
          evidence_records: [
            {
              evidence_id: `catalog:${catalogItem.id}`,
              evidence_type: 'literature_evidence',
              title: 'Will be replaced by catalog evidence',
              summary: 'Will be replaced by catalog evidence',
              strength_level: 'weak',
              provenance_note: 'Will be replaced by catalog evidence',
            },
          ],
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json();

      const evaluation = await prisma.evaluationRecord.findUnique({
        where: { id: created.evaluation_id },
        include: {
          sourceUsages: {
            include: { sourceRecord: true },
          },
          claimUsages: {
            include: { claim: true },
          },
          workspaceSnapshots: true,
        },
      });

      expect(evaluation).not.toBeNull();
      expect(evaluation?.sourceUsages).toEqual([
        expect.objectContaining({
          usageType: 'ATTACHED_INPUT',
          note: 'Accepted catalog evidence attached during intake selection.',
          sourceRecord: expect.objectContaining({
            sourceKey: catalogSourceKey,
          }),
        }),
      ]);
      expect(evaluation?.claimUsages).toHaveLength(2);
      expect(evaluation?.claimUsages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ usageType: 'INPUT_SUPPORT' }),
        ]),
      );
      expect(
        evaluation?.workspaceSnapshots.map((snapshot) => snapshot.snapshotType),
      ).toEqual(
        expect.arrayContaining(['EVALUATION', 'REPORT', 'EXPORT_JSON']),
      );
      expect(
        evaluation?.workspaceSnapshots.find(
          (snapshot) => snapshot.snapshotType === 'EVALUATION',
        )?.payload,
      ).toEqual(
        expect.objectContaining({
          evaluation_id: created.evaluation_id,
          case_id: lineageCaseId,
          attached_catalog_item_ids: [catalogItem.id],
        }),
      );

      const evaluationResponse = await app.inject({
        method: 'GET',
        url: `/api/evaluations/${created.evaluation_id}`,
        headers: {
          cookie: `${defaultSessionCookieName}=postgres-suite`,
        },
      });

      expect(evaluationResponse.statusCode).toBe(200);
      expect(evaluationResponse.json()).toMatchObject({
        evaluation_id: created.evaluation_id,
        source_usages: [
          expect.objectContaining({
            source_document_id: sourceRecord.id,
            usage_type: 'attached_input',
          }),
        ],
        claim_usages: expect.arrayContaining([
          expect.objectContaining({
            usage_type: 'input_support',
          }),
        ]),
        workspace_snapshots: expect.arrayContaining([
          expect.objectContaining({
            snapshot_type: 'evaluation',
          }),
          expect.objectContaining({
            snapshot_type: 'report',
          }),
        ]),
      });
    } finally {
      await app.close();
    }
  });

  it('persists report conversation sessions and turns through Prisma', async () => {
    const originalMode = process.env.METREV_LLM_MODE;
    process.env.METREV_LLM_MODE = 'stub';

    const app = await buildApp({ sessionResolver });

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/cases/evaluate',
        headers: {
          'content-type': 'application/json',
          cookie: `${defaultSessionCookieName}=postgres-suite`,
        },
        payload: {
          ...fixture,
          case_id: caseId,
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json();
      const conversationId = `postgres-report-conv-${created.evaluation_id}`;

      const conversationResponse = await app.inject({
        method: 'POST',
        url: `/api/workspace/evaluations/${created.evaluation_id}/report/conversation`,
        headers: {
          'content-type': 'application/json',
          cookie: `${defaultSessionCookieName}=postgres-suite`,
        },
        payload: {
          evaluation_id: created.evaluation_id,
          conversation_id: conversationId,
          message: 'Explain the report confidence posture and next checks.',
          selected_section: 'confidence_and_uncertainty_summary',
        },
      });

      expect(conversationResponse.statusCode).toBe(200);
      const responseBody = conversationResponse.json();
      expect(responseBody).toMatchObject({
        conversation_id: conversationId,
        answer: expect.any(String),
        grounding_summary: expect.objectContaining({
          evaluation_id: created.evaluation_id,
          selected_section: 'confidence_and_uncertainty_summary',
        }),
        metadata: expect.objectContaining({
          persisted: true,
          context_version: 'report-context-v1',
        }),
        refusal_reason: null,
      });

      const prisma = getPrismaClient();
      const session = await prisma.reportConversationSession.findUnique({
        where: { id: conversationId },
        include: {
          turns: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      expect(session).toEqual(
        expect.objectContaining({
          id: conversationId,
          evaluationId: created.evaluation_id,
          createdBy: actor.userId,
        }),
      );
      expect(session?.turns).toHaveLength(2);
      expect(session?.turns[0]).toEqual(
        expect.objectContaining({
          actor: 'user',
          selectedSection: 'confidence_and_uncertainty_summary',
          message: 'Explain the report confidence posture and next checks.',
          refusalReason: null,
        }),
      );
      expect(session?.turns[1]).toEqual(
        expect.objectContaining({
          actor: 'assistant',
          selectedSection: 'confidence_and_uncertainty_summary',
          message: responseBody.answer,
          refusalReason: null,
          narrativeMetadata: expect.objectContaining({
            mode: 'stub',
            provider: 'internal',
            status: 'generated',
          }),
          grounding: expect.objectContaining({
            evaluation_id: created.evaluation_id,
            selected_section: 'confidence_and_uncertainty_summary',
          }),
          citations: expect.arrayContaining([
            expect.objectContaining({
              citation_id: 'report:stack-diagnosis',
            }),
          ]),
        }),
      );
    } finally {
      if (originalMode === undefined) {
        delete process.env.METREV_LLM_MODE;
      } else {
        process.env.METREV_LLM_MODE = originalMode;
      }

      await app.close();
    }
  });

  it('persists research reviews, extraction results, and decision previews through Prisma', async () => {
    const prisma = getPrismaClient();
    const repository = new PrismaResearchRepository(prisma);
    const originalTitle = 'Postgres microbial fuel cell research fixture';

    const sourceRecord = await prisma.externalSourceRecord.create({
      data: {
        sourceType: 'OPENALEX',
        sourceKey: researchSourceKey,
        title: originalTitle,
        sourceCategory: 'scholarly_work',
        sourceUrl: 'https://openalex.org/W-postgres-research-fixture',
        doi: '10.1000/postgres-research-fixture',
        publisher: 'METREV Regression Harness',
        journal: 'METREV Postgres Research Fixtures',
        authors: [{ name: 'Postgres Fixture Author' }],
        accessStatus: 'UNKNOWN',
        publishedAt: new Date('2025-01-02T00:00:00.000Z'),
        abstractText:
          'A dual chamber microbial fuel cell using carbon felt anodes and an air cathode reached power density of 850 mW/m2 with COD removal of 82% at pH 7 and 30 C. Membrane fouling and electrode cost remained scale-up challenges.',
        rawPayload: {
          cited_by_count: 4,
          fixture: true,
        },
      },
      select: { id: true },
    });

    await prisma.evidenceClaim.create({
      data: {
        sourceRecordId: sourceRecord.id,
        claimType: 'METRIC',
        content:
          'Power density of 850 mW/m2 and COD removal of 82% were reported.',
        extractedValue: '850',
        unit: 'mW/m2',
        confidence: 0.82,
        extractionMethod: 'IMPORT_RULE',
        extractorVersion: 'postgres-suite-v1',
        sourceSnippet:
          'Power density of 850 mW/m2 and COD removal of 82% were reported.',
        sourceLocator: 'abstract',
        pageNumber: null,
        metadata: {
          fixture: true,
        },
      },
    });

    const columns = getDefaultResearchColumns().filter((column) =>
      ['paper', 'summary', 'performance_metrics'].includes(column.column_id),
    );
    const review = await repository.createResearchReview({
      query: researchQuery,
      limit: 1,
      actorId: actor.userId,
      columns,
      extractorVersion: DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
    });

    expect(review.papers).toHaveLength(1);
    expect(review.columns.map((column) => column.column_id)).toEqual([
      'paper',
      'summary',
      'performance_metrics',
    ]);

    const unmatchedReview = await repository.createResearchReview({
      query: unmatchedResearchQuery,
      limit: 1,
      actorId: actor.userId,
      columns,
      extractorVersion: DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
    });

    expect(unmatchedReview.papers).toHaveLength(0);
    expect(unmatchedReview.paper_count).toBe(0);

    const jobs = await repository.claimQueuedResearchExtractionJobs({
      reviewId: review.review_id,
      limit: 10,
    });

    for (const workItem of jobs) {
      const result = runDeterministicResearchExtraction({
        reviewId: review.review_id,
        paper: workItem.paper,
        column: workItem.column,
        claims: workItem.claims,
      });
      await repository.saveResearchExtractionResult({
        jobId: workItem.job.job_id,
        result,
      });
    }

    await prisma.externalSourceRecord.update({
      where: { id: sourceRecord.id },
      data: {
        title:
          'Mutated live source title that must not rewrite review snapshots',
      },
    });

    const refreshed = await repository.getResearchReview(review.review_id);
    expect(refreshed?.completed_result_count).toBe(3);
    expect(refreshed?.papers[0]?.title).toBe(originalTitle);
    expect(refreshed?.extraction_results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column_id: 'performance_metrics',
          status: 'valid',
        }),
      ]),
    );

    if (!refreshed) {
      throw new Error('research review was not persisted');
    }

    const pack = buildResearchEvidencePack({
      packId: 'postgres-suite-research-pack',
      review: refreshed,
      status: 'draft',
      now: '2026-04-24T12:00:00.000Z',
    });
    const decisionInput = buildDecisionIngestionPreview(pack);
    const savedPack = await repository.createResearchEvidencePack({
      pack,
      decisionInput,
    });
    const fetchedDecisionInput =
      await repository.getResearchEvidencePackDecisionInput(savedPack.pack_id);

    expect(savedPack.evidence_items).toHaveLength(1);
    expect(fetchedDecisionInput).toEqual(
      expect.objectContaining({
        pack_id: savedPack.pack_id,
        measured_metric_candidates: expect.objectContaining({
          power_density_w_m2: 0.85,
          cod_removal_pct: 82,
        }),
      }),
    );
  });

  it('normalizes legacy external evidence types in workspace responses', async () => {
    const prisma = getPrismaClient();
    const sourceRecord = await prisma.externalSourceRecord.create({
      data: {
        sourceType: 'CURATED_MANIFEST',
        sourceKey: legacyCatalogSourceKey,
        title: 'Legacy curated manifest catalog record',
        sourceCategory: 'curated_digest',
        sourceUrl: 'https://example.org/legacy-curated-manifest',
        publisher: 'METREV Regression Harness',
        accessStatus: 'UNKNOWN',
        asOf: new Date('2026-04-22T00:00:00.000Z'),
        abstractText:
          'Legacy curated manifest records used an old evidence type token that must stay readable in workspace responses.',
        rawPayload: {
          fixture: true,
          legacy_evidence_type: 'curated_evidence',
        },
      },
      select: { id: true },
    });

    const catalogItem = await prisma.externalEvidenceCatalogItem.create({
      data: {
        sourceRecordId: sourceRecord.id,
        evidenceType: 'curated_evidence',
        title: 'Legacy curated manifest evidence type',
        summary:
          'Legacy curated manifest entries should be mapped back onto the contract-safe literature evidence type.',
        strengthLevel: 'moderate',
        provenanceNote:
          'Legacy fixture for workspace parsing regression coverage.',
        reviewStatus: 'PENDING',
        sourceState: 'PARSED',
        applicabilityScope: {
          fixture: true,
        },
        extractedClaims: [],
        tags: ['postgres-suite', 'legacy-evidence-type'],
        payload: {
          fixture: true,
        },
      },
      select: { id: true },
    });

    const app = await buildApp({ sessionResolver });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workspace/evidence/review',
        headers: {
          cookie: `${defaultSessionCookieName}=postgres-suite`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: catalogItem.id,
            evidence_type: 'literature_evidence',
          }),
        ]),
      });
    } finally {
      await app.close();
    }
  });

  it('preserves analyst review posture and stable claim ids across re-ingestion', async () => {
    const prisma = getPrismaClient();
    await prisma.ingestionRun.createMany({
      data: [
        {
          id: initialIngestionRunId,
          sourceType: 'OPENALEX',
          triggerMode: 'test',
          query: 'postgres ingestion persistence',
          status: 'STARTED',
          summary: {},
          startedAt: new Date('2026-04-22T00:00:00.000Z'),
        },
        {
          id: reingestionRunId,
          sourceType: 'OPENALEX',
          triggerMode: 'test',
          query: 'postgres ingestion persistence',
          status: 'STARTED',
          summary: {},
          startedAt: new Date('2026-04-23T00:00:00.000Z'),
        },
      ],
    });

    const initialEntry = normalizeOpenAlexWork(
      {
        id: ingestionCatalogSourceKey,
        display_name: 'Postgres ingestion persistence regression',
        doi: 'https://doi.org/10.5555/postgres-ingestion-persistence',
        publication_date: '2026-02-14',
        abstract_inverted_index: {
          Stable: [0],
          current: [1],
          density: [2],
          reached: [3],
          '1.9': [4],
          'A/m2': [5],
          under: [6],
          neutral: [7],
          pH: [8],
          Membrane: [9],
          fouling: [10],
          remained: [11],
          the: [12],
          main: [13],
          'limitation.': [14],
        },
        open_access: {
          is_oa: true,
          oa_status: 'green',
        },
        primary_location: {
          landing_page_url:
            'https://example.org/postgres-ingestion-persistence',
          source: {
            display_name: 'Integration Regression Journal',
          },
        },
        type: 'article',
      },
      'postgres ingestion persistence',
      '2026-04-22T00:00:00.000Z',
    );

    expect(initialEntry).not.toBeNull();

    await persistNormalizedEntries(prisma, [initialEntry], {
      runId: initialIngestionRunId,
    });

    const initialCatalogItem =
      await prisma.externalEvidenceCatalogItem.findFirstOrThrow({
        where: {
          title: 'Postgres ingestion persistence regression',
          sourceRecord: {
            sourceType: 'OPENALEX',
            sourceKey: ingestionCatalogSourceKey,
          },
        },
        include: {
          claims: {
            include: {
              reviews: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

    const persistedTrackedClaim = initialCatalogItem.claims[0];

    expect(persistedTrackedClaim).toBeDefined();

    await prisma.externalEvidenceCatalogItem.update({
      where: { id: initialCatalogItem.id },
      data: {
        reviewStatus: 'ACCEPTED',
        sourceState: 'REVIEWED',
      },
    });
    await prisma.evidenceClaimReview.create({
      data: {
        claimId: persistedTrackedClaim!.id,
        status: 'ACCEPTED',
        analystId: actor.userId,
        analystRole: actor.role,
        analystNote: 'Accepted during ingestion persistence regression.',
        reviewedAt: new Date('2026-04-22T00:00:00.000Z'),
      },
    });

    const reingestedEntry = normalizeOpenAlexWork(
      {
        id: ingestionCatalogSourceKey,
        display_name: 'Postgres ingestion persistence regression',
        doi: '10.5555/postgres-ingestion-persistence',
        publication_date: '2026-02-14',
        abstract_inverted_index: {
          Stable: [0],
          current: [1],
          density: [2],
          reached: [3],
          '1.9': [4],
          'A/m2': [5],
          under: [6],
          neutral: [7],
          pH: [8],
          Membrane: [9],
          fouling: [10],
          remained: [11],
          the: [12],
          main: [13],
          'limitation.': [14],
          Instrumentation: [15],
          coverage: [16],
          improved: [17],
          after: [18],
          'recalibration.': [19],
        },
        open_access: {
          is_oa: true,
          oa_status: 'green',
        },
        primary_location: {
          landing_page_url:
            'https://example.org/postgres-ingestion-persistence-v2',
          source: {
            display_name: 'Integration Regression Journal',
          },
        },
        type: 'article',
      },
      'postgres ingestion persistence',
      '2026-04-23T00:00:00.000Z',
    );

    expect(reingestedEntry).not.toBeNull();

    await persistNormalizedEntries(prisma, [reingestedEntry], {
      runId: reingestionRunId,
    });

    const reingestedCatalogItem =
      await prisma.externalEvidenceCatalogItem.findUniqueOrThrow({
        where: {
          id: initialCatalogItem.id,
        },
        include: {
          claims: {
            include: {
              reviews: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    const reingestedTrackedClaim = reingestedCatalogItem.claims.find(
      (claim) => claim.content === persistedTrackedClaim!.content,
    );

    expect(reingestedCatalogItem.reviewStatus).toBe('ACCEPTED');
    expect(reingestedCatalogItem.sourceState).toBe('REVIEWED');
    expect(reingestedTrackedClaim?.id).toBe(persistedTrackedClaim!.id);
    expect(reingestedTrackedClaim?.reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'ACCEPTED',
          analystId: actor.userId,
          analystRole: actor.role,
        }),
      ]),
    );
  }, 60_000);
});
