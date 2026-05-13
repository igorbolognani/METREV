import { afterEach, describe, expect, it } from 'vitest';

import {
  defaultSessionCookieName,
  getSessionTokenFromCookie,
  type SessionActor,
  type SessionResolver,
} from '@metrev/auth';
import {
  MemoryEvaluationRepository,
  MemoryEvidenceAuditRepository,
} from '@metrev/database';
import {
  evidenceQualityAuditResponseSchema,
  evidenceQualityReportSchema,
} from '@metrev/domain-contracts';
import { buildApp } from '../../apps/api-server/src/app';

const sessions: Record<string, SessionActor> = {
  'admin-session': {
    userId: 'user-admin-001',
    email: 'admin@metrev.local',
    role: 'ADMIN',
    sessionId: 'session-admin-001',
    sessionToken: 'admin-session',
  },
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

function reportFixture() {
  return evidenceQualityReportSchema.parse({
    report_id: 'report-api-001',
    trigger_mode: 'manual',
    coverage_matrix: [],
    gaps: [],
    outliers: [],
    readiness_scores: [],
    funnel_metrics: [],
    summary: {
      total_benchmark_records: 0,
      decision_ready_records: 0,
      coverage_ratio: 0,
      critical_gap_count: 0,
      stale_metric_count: 0,
      outlier_count: 0,
    },
    created_at: '2026-05-13T12:00:00.000Z',
  });
}

describe('evidence intelligence API', () => {
  const evaluationRepository = new MemoryEvaluationRepository();
  const evidenceAuditRepository = new MemoryEvidenceAuditRepository();

  afterEach(async () => {
    await evaluationRepository.disconnect();
  });

  it('returns the latest evidence quality report to analysts', async () => {
    await evidenceAuditRepository.createEvidenceQualityAuditReport(
      reportFixture(),
    );
    const app = await buildApp({
      evidenceAuditRepository,
      repository: evaluationRepository,
      rateLimit: false,
      sessionResolver: testSessionResolver,
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/evidence-intelligence/quality-report',
        headers: { cookie: sessionCookie('analyst-session') },
      });

      expect(response.statusCode).toBe(200);
      const payload = evidenceQualityAuditResponseSchema.parse(response.json());
      expect(payload.report.report_id).toBe('report-api-001');
    } finally {
      await app.close();
    }
  });

  it('rejects viewers and allows admins to trigger a fresh audit', async () => {
    const app = await buildApp({
      evidenceAuditRepository,
      repository: evaluationRepository,
      rateLimit: false,
      sessionResolver: testSessionResolver,
    });

    try {
      const rejected = await app.inject({
        method: 'GET',
        url: '/api/evidence-intelligence/quality-report',
        headers: { cookie: sessionCookie('viewer-session') },
      });
      expect(rejected.statusCode).toBe(403);

      const created = await app.inject({
        method: 'POST',
        url: '/api/evidence-intelligence/quality-report',
        headers: { cookie: sessionCookie('admin-session') },
        payload: {
          trigger_mode: 'manual',
          include_golden_cases: false,
        },
      });

      expect(created.statusCode).toBe(201);
      expect(
        evidenceQualityAuditResponseSchema.parse(created.json()).report,
      ).toMatchObject({ trigger_mode: 'manual' });
    } finally {
      await app.close();
    }
  });
});
