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
  evaluationListResponseSchema,
  evaluationResponseSchema,
  type EvaluationResponse,
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

function withPersistedLineage(
  evaluation: EvaluationResponse,
): EvaluationResponse {
  return {
    ...evaluation,
    source_usages: [
      {
        id: `source-usage-${evaluation.evaluation_id}`,
        evaluation_id: evaluation.evaluation_id,
        source_document_id: 'source-doc-runtime-001',
        usage_type: 'input_support',
        note: 'Runtime API test source lineage.',
        created_at: evaluation.audit_record.timestamp,
      },
    ],
    claim_usages: [
      {
        id: `claim-usage-${evaluation.evaluation_id}`,
        evaluation_id: evaluation.evaluation_id,
        claim_id: 'claim-runtime-001',
        usage_type: 'recommendation_support',
        note: 'Runtime API test claim lineage.',
        created_at: evaluation.audit_record.timestamp,
      },
    ],
    workspace_snapshots: [
      {
        id: `snapshot-${evaluation.evaluation_id}`,
        evaluation_id: evaluation.evaluation_id,
        case_id: evaluation.case_id,
        snapshot_type: 'report',
        payload: { generated_from: 'runtime-api-test' },
        created_at: evaluation.audit_record.timestamp,
      },
    ],
  };
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
  claim_count: 1,
  reviewed_claim_count: 0,
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
  claims: [],
  supplier_documents: [],
  raw_payload: {
    DOI: '10.1000/example',
  },
};

const acceptedCatalogItem: ExternalEvidenceCatalogItemDetail = {
  ...pendingCatalogItem,
  id: 'catalog-item-accepted-001',
  review_status: 'accepted',
  source_state: 'reviewed',
  reviewed_claim_count: 1,
};

const openAlexCatalogItem: ExternalEvidenceCatalogItemDetail = {
  ...pendingCatalogItem,
  id: 'catalog-item-openalex-001',
  title: 'OpenAlex sidestream benchmark import',
  summary: 'OpenAlex-derived evidence for sidestream retrofit comparisons.',
  source_type: 'openalex',
  source_category: 'scholarly_work',
  source_url: 'https://openalex.org/W123',
  doi: '10.2000/openalex-example',
  publisher: 'OpenAlex Imports',
  tags: ['external-ingestion', 'openalex'],
  claim_count: 2,
  reviewed_claim_count: 1,
  claims: [
    {
      id: 'claim-openalex-001',
      source_document_id: 'source-openalex-001',
      catalog_item_id: 'catalog-item-openalex-001',
      claim_type: 'metric',
      content: 'COD removal increased under monitored sidestream operation.',
      extracted_value: '82',
      unit: '%',
      confidence: 0.81,
      extraction_method: 'import_rule',
      extractor_version: 'seed-v1',
      source_snippet: 'COD removal reached 82% during monitored operation.',
      source_locator: 'results.table_2',
      page_number: null,
      metadata: {},
      reviews: [
        {
          id: 'claim-review-openalex-001',
          status: 'accepted',
          analyst_id: 'user-analyst-001',
          analyst_role: 'ANALYST',
          analyst_note: 'Accepted for comparative benchmarking.',
          reviewed_at: '2026-04-14T12:05:00.000Z',
        },
      ],
      ontology_mappings: [
        {
          id: 'mapping-openalex-001',
          ontology_path: 'evidence.metrics.cod_removal',
          mapping_confidence: 0.88,
          mapped_by: 'auto',
          note: null,
        },
      ],
      created_at: '2026-04-14T12:00:00.000Z',
      updated_at: '2026-04-14T12:05:00.000Z',
    },
  ],
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
    expect(created.simulation_enrichment?.status).toBe('completed');
    expect(created.simulation_enrichment?.series.length).toBeGreaterThan(0);
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
          simulation_summary: expect.objectContaining({
            status: 'completed',
            has_series: true,
          }),
        }),
      ],
    });

    const filteredListResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations?q=${created.case_id}&page=1&pageSize=1&sort=created_at&dir=desc`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });

    expect(filteredListResponse.statusCode).toBe(200);
    expect(
      evaluationListResponseSchema.parse(filteredListResponse.json()),
    ).toMatchObject({
      items: [
        expect.objectContaining({
          evaluation_id: created.evaluation_id,
          case_id: created.case_id,
        }),
      ],
      summary: {
        total: 1,
        filtered_total: 1,
        page: 1,
        page_size: 1,
        total_pages: 1,
        returned: 1,
      },
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
          simulation_summary: expect.objectContaining({
            status: 'completed',
          }),
        }),
      ],
    });

    expect(historyResponse.json()).toMatchObject({
      audit_events: expect.arrayContaining([
        expect.objectContaining({
          event_type: 'simulation_enrichment_completed',
          evaluation_id: created.evaluation_id,
        }),
      ]),
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

  it('supports external evidence pagination and source-type filtering through the authenticated API', async () => {
    const repository = new MemoryEvaluationRepository({
      externalEvidenceCatalogItems: [
        pendingCatalogItem,
        acceptedCatalogItem,
        openAlexCatalogItem,
      ],
    });
    const app = await buildApp({
      repository,
      sessionResolver: testSessionResolver,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/external-evidence?sourceType=openalex&page=1&pageSize=1',
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      items: [
        expect.objectContaining({
          id: openAlexCatalogItem.id,
          source_type: 'openalex',
          claim_count: 2,
        }),
      ],
      summary: {
        total: 3,
        filtered_total: 1,
        page: 1,
        page_size: 1,
        total_pages: 1,
        returned: 1,
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

  it('reviews external evidence in bulk through the authenticated API', async () => {
    const repository = new MemoryEvaluationRepository({
      externalEvidenceCatalogItems: [pendingCatalogItem, openAlexCatalogItem],
    });
    const app = await buildApp({
      repository,
      sessionResolver: testSessionResolver,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/external-evidence/review/bulk',
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
      },
      payload: {
        ids: [
          pendingCatalogItem.id,
          'missing-catalog-item',
          openAlexCatalogItem.id,
        ],
        action: 'reject',
        note: 'Rejected as a mismatched batch.',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      action: 'reject',
      attempted_ids: [
        pendingCatalogItem.id,
        'missing-catalog-item',
        openAlexCatalogItem.id,
      ],
      succeeded_ids: [pendingCatalogItem.id, openAlexCatalogItem.id],
      failed: [
        {
          id: 'missing-catalog-item',
          message: expect.stringContaining('missing-catalog-item'),
        },
      ],
      note: 'Rejected as a mismatched batch.',
    });

    const updatedDetailResponse = await app.inject({
      method: 'GET',
      url: `/api/external-evidence/${openAlexCatalogItem.id}`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });

    expect(updatedDetailResponse.statusCode).toBe(200);
    expect(updatedDetailResponse.json()).toMatchObject({
      id: openAlexCatalogItem.id,
      review_status: 'rejected',
      source_state: 'reviewed',
    });

    await app.close();
  });

  it('reuses the same evaluation when the same idempotency key is submitted twice', async () => {
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      sessionResolver: testSessionResolver,
    });

    const first = await app.inject({
      method: 'POST',
      url: '/api/cases/evaluate',
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
        'idempotency-key': 'idem-case-001',
      },
      payload: fixture,
    });

    const second = await app.inject({
      method: 'POST',
      url: '/api/cases/evaluate',
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
        'idempotency-key': 'idem-case-001',
      },
      payload: fixture,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(first.json().evaluation_id).toBe(second.json().evaluation_id);

    await app.close();
  });

  it('serves workspace and export routes for a persisted evaluation', async () => {
    const repository = new MemoryEvaluationRepository({
      externalEvidenceCatalogItems: [acceptedCatalogItem],
    });
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
      },
      payload: fixture,
    });

    const created = withPersistedLineage(
      evaluationResponseSchema.parse(createResponse.json()),
    );
    await repository.saveEvaluation(created);

    const dashboardResponse = await app.inject({
      method: 'GET',
      url: '/api/workspace/dashboard',
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });
    expect(dashboardResponse.statusCode).toBe(200);
    expect(dashboardResponse.json()).toMatchObject({
      summary: expect.objectContaining({
        total_runs: 1,
      }),
    });

    const workspaceResponse = await app.inject({
      method: 'GET',
      url: `/api/workspace/evaluations/${created.evaluation_id}`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });
    expect(workspaceResponse.statusCode).toBe(200);
    expect(workspaceResponse.json()).toMatchObject({
      overview: expect.objectContaining({
        hero_cards: expect.arrayContaining([
          expect.objectContaining({
            label: 'Decision posture',
          }),
        ]),
      }),
      links: expect.objectContaining({
        report_href: `/evaluations/${created.evaluation_id}/report`,
      }),
    });

    const reportResponse = await app.inject({
      method: 'GET',
      url: `/api/workspace/evaluations/${created.evaluation_id}/report`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });
    expect(reportResponse.statusCode).toBe(200);
    expect(reportResponse.json()).toMatchObject({
      evaluation_lineage: expect.objectContaining({
        source_usages: expect.arrayContaining([
          expect.objectContaining({
            evaluation_id: created.evaluation_id,
          }),
        ]),
        workspace_snapshots: expect.arrayContaining([
          expect.objectContaining({
            evaluation_id: created.evaluation_id,
          }),
        ]),
      }),
      sections: expect.objectContaining({
        stack_diagnosis: expect.any(Object),
      }),
    });

    const jsonExportResponse = await app.inject({
      method: 'GET',
      url: `/api/exports/evaluations/${created.evaluation_id}/json`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });
    expect(jsonExportResponse.statusCode).toBe(200);
    expect(jsonExportResponse.headers['content-disposition']).toContain(
      '.json',
    );
    expect(jsonExportResponse.json()).toMatchObject({
      meta: expect.objectContaining({
        versions: expect.objectContaining({
          workspace_schema_version: '014.0.0',
        }),
      }),
    });

    const csvExportResponse = await app.inject({
      method: 'GET',
      url: `/api/exports/evaluations/${created.evaluation_id}/csv`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });
    expect(csvExportResponse.statusCode).toBe(200);
    expect(csvExportResponse.headers['content-type']).toContain('text/csv');
    expect(csvExportResponse.headers['x-metrev-workspace-schema-version']).toBe(
      '014.0.0',
    );
    expect(csvExportResponse.body).toContain('section,label,primary_value');

    await app.close();
  });

  it('serves dedicated history, comparison, and evidence review workspace routes', async () => {
    const repository = new MemoryEvaluationRepository({
      externalEvidenceCatalogItems: [acceptedCatalogItem, pendingCatalogItem],
    });
    const app = await buildApp({
      repository,
      sessionResolver: testSessionResolver,
    });

    const baselineResponse = await app.inject({
      method: 'POST',
      url: '/api/cases/evaluate',
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
      },
      payload: fixture,
    });
    const currentResponse = await app.inject({
      method: 'POST',
      url: '/api/cases/evaluate',
      headers: {
        'content-type': 'application/json',
        cookie: sessionCookie('analyst-session'),
      },
      payload: {
        ...fixture,
        feed_and_operation: {
          ...fixture.feed_and_operation,
          temperature_c: 31,
          pH: 7.4,
        },
      },
    });

    const baseline = evaluationResponseSchema.parse(baselineResponse.json());
    const current = withPersistedLineage(
      evaluationResponseSchema.parse(currentResponse.json()),
    );
    await repository.saveEvaluation(current);

    const historyResponse = await app.inject({
      method: 'GET',
      url: `/api/workspace/cases/${current.case_id}/history`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });
    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.json()).toMatchObject({
      current_evaluation_id: current.evaluation_id,
      current_evaluation_lineage: expect.objectContaining({
        source_usages: expect.arrayContaining([
          expect.objectContaining({
            evaluation_id: current.evaluation_id,
          }),
        ]),
        workspace_snapshots: expect.arrayContaining([
          expect.objectContaining({
            evaluation_id: current.evaluation_id,
          }),
        ]),
      }),
      timeline: expect.arrayContaining([
        expect.objectContaining({
          evaluation: expect.objectContaining({
            evaluation_id: current.evaluation_id,
          }),
        }),
      ]),
    });

    const comparisonResponse = await app.inject({
      method: 'GET',
      url: `/api/workspace/evaluations/${current.evaluation_id}/compare/${baseline.evaluation_id}`,
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });
    expect(comparisonResponse.statusCode).toBe(200);
    expect(comparisonResponse.json()).toMatchObject({
      conclusion: expect.objectContaining({
        summary: expect.stringContaining(current.case_id),
      }),
      metric_deltas: expect.any(Array),
      recommendation_deltas: expect.any(Array),
    });

    const evidenceReviewResponse = await app.inject({
      method: 'GET',
      url: '/api/workspace/evidence/review?status=accepted&q=benchmark',
      headers: {
        cookie: sessionCookie('viewer-session'),
      },
    });
    expect(evidenceReviewResponse.statusCode).toBe(200);
    expect(evidenceReviewResponse.json()).toMatchObject({
      filters: expect.objectContaining({
        active_status: 'accepted',
        search_query: 'benchmark',
      }),
      summary: expect.objectContaining({
        accepted: 1,
      }),
    });

    await app.close();
  });
});
