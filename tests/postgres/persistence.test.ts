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
const supplierNames = [
  'Current Supplier',
  'Preferred Supplier',
  'Blocked Supplier',
];

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
  });
});
