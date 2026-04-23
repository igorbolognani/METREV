import fixture from '../fixtures/raw-case-input.json';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  defaultSessionCookieName,
  type SessionActor,
  type SessionResolver,
} from '@metrev/auth';
import { disconnectPrismaClient, getPrismaClient } from '@metrev/database';
import { buildApp } from '../../apps/api-server/src/app';

const caseId = 'CASE-POSTGRES-SUITE';
const lineageCaseId = 'CASE-POSTGRES-LINEAGE-SUITE';
const supplierNames = [
  'Current Supplier',
  'Preferred Supplier',
  'Blocked Supplier',
];
const catalogSourceKey = 'postgres-suite-openalex-source';
const legacyCatalogSourceKey = 'postgres-suite-curated-legacy-source';

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
        sourceType: 'CURATED_MANIFEST',
        sourceKey: legacyCatalogSourceKey,
      },
    });
    await prisma.supplier.deleteMany({
      where: {
        normalizedName: {
          in: supplierNames.map((name) => name.toLowerCase()),
        },
      },
    });
  });

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
        sourceType: 'CURATED_MANIFEST',
        sourceKey: legacyCatalogSourceKey,
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
  });

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
});
