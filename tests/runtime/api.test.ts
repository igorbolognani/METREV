import fixture from '../fixtures/raw-case-input.json';

import { afterEach, describe, expect, it } from 'vitest';

import {
  defaultSessionCookieName,
  getSessionTokenFromCookie,
  type SessionActor,
  type SessionResolver,
} from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import { evaluationResponseSchema } from '@metrev/domain-contracts';
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
});
