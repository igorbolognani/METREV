import fixture from '../fixtures/raw-case-input.json';

import { afterEach, describe, expect, it } from 'vitest';

import {
  defaultSessionCookieName,
  getSessionTokenFromCookie,
  type SessionActor,
  type SessionResolver,
} from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import {
  evaluationResponseSchema,
  type ExternalEvidenceCatalogItemDetail,
} from '@metrev/domain-contracts';
import { buildApp } from '../../apps/api-server/src/app';

const sessions: Record<string, SessionActor> = {
  'analyst-session': {
    userId: 'user-analyst-001',
    email: 'analyst@metrev.local',
    role: 'ANALYST',
    sessionId: 'session-analyst-001',
    sessionToken: 'analyst-session',
  },
  'viewer-session': {
    userId: 'user-viewer-001',
    email: 'viewer@metrev.local',
    role: 'VIEWER',
    sessionId: 'session-viewer-001',
    sessionToken: 'viewer-session',
  },
};

const testSessionResolver: SessionResolver = async ({ cookieHeader }) => {
  const sessionToken = getSessionTokenFromCookie(cookieHeader);
  return sessionToken ? (sessions[sessionToken] ?? null) : null;
};

function sessionCookie(sessionToken: string): string {
  return `${defaultSessionCookieName}=${sessionToken}`;
}

const pendingCatalogItem: ExternalEvidenceCatalogItemDetail = {
  id: 'catalog-item-001',
  title: 'Pilot wastewater instrumentation study',
  summary:
    'Instrumentation quality and operator visibility improve auditability in wastewater pilots.',
  evidence_type: 'literature_evidence',
  strength_level: 'moderate',
  review_status: 'pending',
  source_state: 'parsed',
  source_type: 'crossref',
  source_category: 'scholarly_work',
  source_url: 'https://doi.org/10.1000/example',
  doi: '10.1000/example',
  publisher: 'Journal of Wastewater Systems',
  published_at: '2025-05-10T00:00:00.000Z',
  provenance_note:
    'Imported from CROSSREF metadata for review before use in decision flows.',
  applicability_scope: {
    import_query: 'wastewater instrumentation',
  },
  extracted_claims: [],
  tags: ['external-ingestion', 'crossref'],
  created_at: '2026-04-14T12:00:00.000Z',
  updated_at: '2026-04-14T12:00:00.000Z',
  abstract_text:
    'Instrumentation quality matters for robust wastewater pilot diagnosis.',
  payload: {
    import_query: 'wastewater instrumentation',
  },
  raw_payload: {
    DOI: '10.1000/example',
  },
};

const acceptedCatalogItem: ExternalEvidenceCatalogItemDetail = {
  ...pendingCatalogItem,
  id: 'catalog-item-accepted-001',
  review_status: 'accepted',
  source_state: 'reviewed',
};

describe('api runtime flow', () => {
  const repository = new MemoryEvaluationRepository();

  afterEach(async () => {
    await repository.disconnect();
  });

  it('serves the health route without the /api prefix', async () => {
    const app = await buildApp({
      repository,
      sessionResolver: testSessionResolver,
    });

    const healthResponse = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(healthResponse.statusCode).toBe(200);
    expect(healthResponse.json()).toMatchObject({
      service: 'api-server',
      status: 'ok',
    });

    const prefixedHealthResponse = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(prefixedHealthResponse.statusCode).toBe(404);

    await app.close();
  });

  it('evaluates a case and fetches the persisted result', async () => {
    const app = await buildApp({
      repository,
      sessionResolver: testSessionResolver,
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/cases/evaluate',
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
        'x-metrev-role': 'VIEWER',
      },
      payload: fixture,
    });

    expect(createResponse.statusCode).toBe(201);

    const created = evaluationResponseSchema.parse(createResponse.json());
    expect(created.narrative_metadata.status).toBe('generated');
    expect(created.audit_record.raw_input_snapshot.case_id).toBe('CASE-001');
    expect(created.audit_record.agent_pipeline_trace.length).toBeGreaterThan(0);
    expect(created.audit_record.actor_id).toBe('user-analyst-001');
    expect(created.audit_record.actor_role).toBe('ANALYST');

    const fetchResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${created.evaluation_id}`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });

    expect(fetchResponse.statusCode).toBe(200);
    expect(
      evaluationResponseSchema.parse(fetchResponse.json()).evaluation_id,
    ).toBe(created.evaluation_id);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/evaluations',
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      items: [
        expect.objectContaining({
          evaluation_id: created.evaluation_id,
          case_id: created.case_id,
        }),
      ],
    });

    const historyResponse = await app.inject({
      method: 'GET',
      url: `/api/cases/${created.case_id}/history`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });

    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.json()).toMatchObject({
      case: expect.objectContaining({
        case_id: created.case_id,
      }),
      evaluations: [
        expect.objectContaining({
          evaluation_id: created.evaluation_id,
        }),
      ],
    });

    await app.close();
  });

  it('rejects evaluation when the caller has no validated session', async () => {
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      sessionResolver: testSessionResolver,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/cases/evaluate',
      headers: {
        'content-type': 'application/json',
      },
      payload: fixture,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('rejects evaluation when the caller does not have analyst privileges', async () => {
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      sessionResolver: testSessionResolver,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/cases/evaluate',
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('viewer-session'),
        'x-metrev-role': 'ADMIN',
      },
      payload: fixture,
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it('rejects submitted catalog evidence that is not accepted yet', async () => {
    const repository = new MemoryEvaluationRepository({
      externalEvidenceCatalogItems: [pendingCatalogItem],
    });
    const app = await buildApp({
      repository,
      sessionResolver: testSessionResolver,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/cases/evaluate',
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
      },
      payload: {
        ...fixture,
        evidence_records: [
          {
            evidence_id: `catalog:${pendingCatalogItem.id}`,
            evidence_type: 'supplier_claim',
            title: 'Tampered title',
            summary: 'Tampered summary',
            applicability_scope: {},
            strength_level: 'weak',
            provenance_note: 'Tampered provenance',
            quantitative_metrics: {},
            operating_conditions: {},
            block_mapping: [],
            limitations: [],
            contradiction_notes: [],
            benchmark_context: 'tampered context',
            tags: ['tampered'],
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: 'invalid_catalog_evidence',
      catalog_item_id: pendingCatalogItem.id,
    });

    await app.close();
  });

  it('replaces accepted catalog evidence payloads with the authoritative catalog record before evaluation', async () => {
    const repository = new MemoryEvaluationRepository({
      externalEvidenceCatalogItems: [acceptedCatalogItem],
    });
    const app = await buildApp({
      repository,
      sessionResolver: testSessionResolver,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/cases/evaluate',
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
      },
      payload: {
        ...fixture,
        evidence_records: [
          {
            evidence_id: `catalog:${acceptedCatalogItem.id}`,
            evidence_type: 'supplier_claim',
            title: 'Tampered title',
            summary: 'Tampered summary',
            applicability_scope: {},
            strength_level: 'weak',
            provenance_note: 'Tampered provenance',
            quantitative_metrics: {
              spoofed_metric: 999,
            },
            operating_conditions: {},
            block_mapping: ['fake-block'],
            limitations: ['fake limitation'],
            contradiction_notes: ['fake contradiction'],
            benchmark_context: 'tampered context',
            tags: ['tampered'],
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);

    const created = evaluationResponseSchema.parse(response.json());
    expect(created.audit_record.typed_evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidence_id: `catalog:${acceptedCatalogItem.id}`,
          title: acceptedCatalogItem.title,
          summary: acceptedCatalogItem.summary,
          evidence_type: acceptedCatalogItem.evidence_type,
          strength_level: acceptedCatalogItem.strength_level,
          benchmark_context: expect.stringContaining(
            acceptedCatalogItem.source_type,
          ),
          tags: expect.arrayContaining([
            'reviewed-catalog',
            `source:${acceptedCatalogItem.source_type}`,
          ]),
        }),
      ]),
    );
    expect(created.audit_record.typed_evidence[0]?.title).not.toBe(
      'Tampered title',
    );

    await app.close();
  });

  it('lists, inspects, and reviews external evidence catalog records through the authenticated API', async () => {
    const repository = new MemoryEvaluationRepository({
      externalEvidenceCatalogItems: [pendingCatalogItem],
    });
    const app = await buildApp({
      repository,
      sessionResolver: testSessionResolver,
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/external-evidence',
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      items: [
        expect.objectContaining({
          id: pendingCatalogItem.id,
          review_status: 'pending',
        }),
      ],
      summary: {
        total: 1,
        pending: 1,
        accepted: 0,
        rejected: 0,
      },
    });

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/external-evidence/${pendingCatalogItem.id}`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      id: pendingCatalogItem.id,
      title: pendingCatalogItem.title,
      review_status: 'pending',
    });

    const forbiddenReviewResponse = await app.inject({
      method: 'POST',
      url: `/api/external-evidence/${pendingCatalogItem.id}/review`,
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('viewer-session'),
      },
      payload: {
        action: 'accept',
      },
    });

    expect(forbiddenReviewResponse.statusCode).toBe(403);

    const invalidReviewResponse = await app.inject({
      method: 'POST',
      url: `/api/external-evidence/${pendingCatalogItem.id}/review`,
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
      },
      payload: {
        action: 'ship-it',
      },
    });

    expect(invalidReviewResponse.statusCode).toBe(400);

    const reviewResponse = await app.inject({
      method: 'POST',
      url: `/api/external-evidence/${pendingCatalogItem.id}/review`,
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
      },
      payload: {
        action: 'accept',
        note: 'Accepted for controlled intake use.',
      },
    });

    expect(reviewResponse.statusCode).toBe(200);
    expect(reviewResponse.json()).toMatchObject({
      id: pendingCatalogItem.id,
      review_status: 'accepted',
      source_state: 'reviewed',
    });

    const acceptedListResponse = await app.inject({
      method: 'GET',
      url: '/api/external-evidence?status=accepted',
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });

    expect(acceptedListResponse.statusCode).toBe(200);
    expect(acceptedListResponse.json()).toMatchObject({
      items: [
        expect.objectContaining({
          id: pendingCatalogItem.id,
          review_status: 'accepted',
        }),
      ],
      summary: {
        total: 1,
        pending: 0,
        accepted: 1,
        rejected: 0,
      },
    });

    await app.close();
  });

  it('marks rejected external evidence as reviewed after analyst review', async () => {
    const repository = new MemoryEvaluationRepository({
      externalEvidenceCatalogItems: [pendingCatalogItem],
    });
    const app = await buildApp({
      repository,
      sessionResolver: testSessionResolver,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/external-evidence/${pendingCatalogItem.id}/review`,
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
      },
      payload: {
        action: 'reject',
        note: 'Rejected after analyst review.',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: pendingCatalogItem.id,
      review_status: 'rejected',
      source_state: 'reviewed',
    });

    await app.close();
  });
});
