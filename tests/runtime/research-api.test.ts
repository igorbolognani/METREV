import { afterEach, describe, expect, it } from 'vitest';

import {
    defaultSessionCookieName,
    getSessionTokenFromCookie,
    type SessionActor,
    type SessionResolver,
} from '@metrev/auth';
import {
    MemoryEvaluationRepository,
    MemoryResearchRepository,
} from '@metrev/database';
import { buildApp } from '../../apps/api-server/src/app';

const sessions: Record<string, SessionActor> = {
  'research-analyst-session': {
    userId: 'user-research-analyst',
    email: 'analyst@metrev.local',
    role: 'ANALYST',
    sessionId: 'session-research-analyst',
    sessionToken: 'research-analyst-session',
  },
  'research-viewer-session': {
    userId: 'user-research-viewer',
    email: 'viewer@metrev.local',
    role: 'VIEWER',
    sessionId: 'session-research-viewer',
    sessionToken: 'research-viewer-session',
  },
};

const testSessionResolver: SessionResolver = async ({ cookieHeader }) => {
  const sessionToken = getSessionTokenFromCookie(cookieHeader);
  return sessionToken ? (sessions[sessionToken] ?? null) : null;
};

function sessionCookie(sessionToken: string): string {
  return `${defaultSessionCookieName}=${sessionToken}`;
}

describe('research API flow', () => {
  const evaluationRepository = new MemoryEvaluationRepository();
  const researchRepository = new MemoryResearchRepository();

  afterEach(async () => {
    await evaluationRepository.disconnect();
    await researchRepository.disconnect();
  });

  it('creates a review, runs deterministic extraction, and exposes decision input', async () => {
    const app = await buildApp({
      repository: evaluationRepository,
      researchRepository,
      sessionResolver: testSessionResolver,
    });

    try {
      const forbiddenCreate = await app.inject({
        method: 'POST',
        url: '/api/research/reviews',
        headers: {
          'content-type': 'application/json',
          cookie: sessionCookie('research-viewer-session'),
        },
        payload: {
          query: 'microbial fuel cell wastewater',
          limit: 2,
        },
      });

      expect(forbiddenCreate.statusCode).toBe(403);

      const forbiddenSearch = await app.inject({
        method: 'POST',
        url: '/api/research/search',
        headers: {
          'content-type': 'application/json',
          cookie: sessionCookie('research-viewer-session'),
        },
        payload: {
          query: 'microbial fuel cell wastewater',
          limit: 3,
        },
      });

      expect(forbiddenSearch.statusCode).toBe(403);

      const searchResponse = await app.inject({
        method: 'POST',
        url: '/api/research/search',
        headers: {
          'content-type': 'application/json',
          cookie: sessionCookie('research-analyst-session'),
        },
        payload: {
          query: 'microbial fuel cell wastewater',
          limit: 3,
        },
      });

      expect(searchResponse.statusCode).toBe(200);
      const searched = searchResponse.json();
      expect(searched.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source_type: 'openalex',
          }),
        ]),
      );

      const importResponse = await app.inject({
        method: 'POST',
        url: '/api/research/search/import',
        headers: {
          'content-type': 'application/json',
          cookie: sessionCookie('research-analyst-session'),
        },
        payload: {
          query: 'microbial fuel cell wastewater',
          items: searched.items.slice(0, 1),
        },
      });

      expect(importResponse.statusCode).toBe(201);
      const imported = importResponse.json();
      expect(imported).toMatchObject({
        imported_count: 1,
        source_document_ids: expect.any(Array),
      });

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/research/reviews',
        headers: {
          'content-type': 'application/json',
          cookie: sessionCookie('research-analyst-session'),
        },
        payload: {
          title: 'MFC fixture review',
          query: 'microbial fuel cell wastewater carbon felt',
          limit: 1,
          source_document_ids: imported.source_document_ids,
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json();
      expect(created).toMatchObject({
        title: 'MFC fixture review',
        paper_count: 1,
      });
      expect(created.papers[0]).toMatchObject({
        source_document_id: imported.source_document_ids[0],
        source_type: 'openalex',
      });
      expect(
        created.columns.map(
          (column: { column_id: string }) => column.column_id,
        ),
      ).toContain('performance_metrics');

      const viewerListResponse = await app.inject({
        method: 'GET',
        url: '/api/research/reviews',
        headers: {
          cookie: sessionCookie('research-viewer-session'),
        },
      });

      expect(viewerListResponse.statusCode).toBe(403);

      const analystListResponse = await app.inject({
        method: 'GET',
        url: '/api/research/reviews',
        headers: {
          cookie: sessionCookie('research-analyst-session'),
        },
      });

      expect(analystListResponse.statusCode).toBe(200);
      expect(analystListResponse.json()).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            review_id: created.review_id,
          }),
        ]),
      });

      const viewerDetailResponse = await app.inject({
        method: 'GET',
        url: `/api/research/reviews/${created.review_id}`,
        headers: {
          cookie: sessionCookie('research-viewer-session'),
        },
      });

      expect(viewerDetailResponse.statusCode).toBe(403);

      const analystDetailResponse = await app.inject({
        method: 'GET',
        url: `/api/research/reviews/${created.review_id}`,
        headers: {
          cookie: sessionCookie('research-analyst-session'),
        },
      });

      expect(analystDetailResponse.statusCode).toBe(200);
      expect(analystDetailResponse.json()).toMatchObject({
        review_id: created.review_id,
        title: 'MFC fixture review',
      });

      const extractionResponse = await app.inject({
        method: 'POST',
        url: `/api/research/reviews/${created.review_id}/extractions/run`,
        headers: {
          'content-type': 'application/json',
          cookie: sessionCookie('research-analyst-session'),
        },
        payload: {
          limit: 100,
        },
      });

      expect(extractionResponse.statusCode).toBe(200);
      const extractionRun = extractionResponse.json();
      expect(extractionRun.attempted).toBeGreaterThan(0);
      expect(extractionRun.completed).toBeGreaterThan(0);
      expect(extractionRun.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_id: 'performance_metrics',
            status: 'valid',
          }),
        ]),
      );

      const addColumnResponse = await app.inject({
        method: 'POST',
        url: `/api/research/reviews/${created.review_id}/columns`,
        headers: {
          'content-type': 'application/json',
          cookie: sessionCookie('research-analyst-session'),
        },
        payload: {
          column_id: 'research_gaps_test',
          name: 'Research Gaps Test',
          group: 'limitations',
          type: 'llm_extracted',
          answer_structure: 'specified',
          instructions: 'Extract explicitly stated research gaps.',
          output_schema_key: 'generic_list',
          output_schema: {
            items: ['string'],
            evidence_span: 'string | null',
            confidence: 'low | medium | high',
          },
          visible: true,
        },
      });

      expect(addColumnResponse.statusCode).toBe(200);
      expect(addColumnResponse.json()).toMatchObject({
        version: 2,
        column_count: created.column_count + 1,
      });

      const packResponse = await app.inject({
        method: 'POST',
        url: `/api/research/reviews/${created.review_id}/evidence-pack`,
        headers: {
          'content-type': 'application/json',
          cookie: sessionCookie('research-analyst-session'),
        },
        payload: {
          title: 'MFC fixture evidence pack',
          status: 'draft',
        },
      });

      expect(packResponse.statusCode).toBe(201);
      const pack = packResponse.json();
      expect(pack).toMatchObject({
        title: 'MFC fixture evidence pack',
        review_id: created.review_id,
      });
      expect(pack.evidence_items.length).toBeGreaterThan(0);

      const decisionInputResponse = await app.inject({
        method: 'GET',
        url: `/api/research/evidence-packs/${pack.pack_id}/decision-input`,
        headers: {
          cookie: sessionCookie('research-viewer-session'),
        },
      });

      expect(decisionInputResponse.statusCode).toBe(403);

      const analystDecisionInputResponse = await app.inject({
        method: 'GET',
        url: `/api/research/evidence-packs/${pack.pack_id}/decision-input`,
        headers: {
          cookie: sessionCookie('research-analyst-session'),
        },
      });

      expect(analystDecisionInputResponse.statusCode).toBe(200);
      expect(analystDecisionInputResponse.json()).toMatchObject({
        pack_id: pack.pack_id,
        review_id: created.review_id,
        evidence_records: expect.any(Array),
        measured_metric_candidates: expect.objectContaining({
          power_density_w_m2: expect.any(Number),
        }),
      });
    } finally {
      await app.close();
    }
  });
});
