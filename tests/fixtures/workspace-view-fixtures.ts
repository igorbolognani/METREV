import rawFixture from './raw-case-input.json';

import type { SessionActor } from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import {
  rawCaseInputSchema,
  type ExternalEvidenceCatalogListResponse,
} from '@metrev/domain-contracts';

import {
  buildCaseHistoryWorkspace,
  buildEvaluationComparison,
  buildEvaluationWorkspace,
  buildEvidenceReviewWorkspace,
  buildPrintableEvaluationReport,
} from '../../apps/api-server/src/presenters/workspace-presenters';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';

const actor: SessionActor = {
  userId: 'user-analyst-001',
  email: 'analyst@metrev.local',
  role: 'ANALYST',
  sessionId: 'session-analyst-001',
  sessionToken: 'analyst-session',
};

const logger = {
  warn: () => undefined,
};

export async function buildWorkspaceViewFixtures() {
  const repository = new MemoryEvaluationRepository();
  const baseline = await createPersistedCaseEvaluation({
    rawInput: rawCaseInputSchema.parse(rawFixture),
    actor,
    evaluationRepository: repository,
    logger,
    environment: 'test',
    entrypoint: 'test',
  });
  const current = await createPersistedCaseEvaluation({
    rawInput: rawCaseInputSchema.parse({
      ...rawFixture,
      feed_and_operation: {
        ...rawFixture.feed_and_operation,
        temperature_c: 31,
        pH: 7.4,
      },
    }),
    actor,
    evaluationRepository: repository,
    logger,
    environment: 'test',
    entrypoint: 'test',
  });
  const history = await repository.getCaseHistory(current.case_id);

  if (!history) {
    throw new Error('Expected case history fixture to be available.');
  }

  const evidenceCatalog: ExternalEvidenceCatalogListResponse = {
    items: [
      {
        id: 'catalog-item-accepted-001',
        title: 'Accepted sidestream benchmark',
        summary:
          'Accepted benchmark record for industrial sidestream treatment.',
        evidence_type: 'literature_evidence',
        strength_level: 'strong',
        review_status: 'accepted',
        source_state: 'reviewed',
        source_type: 'crossref',
        source_category: 'journal_article',
        source_url: 'https://example.test/article',
        doi: '10.1000/example',
        publisher: 'Journal of MET Studies',
        published_at: '2025-11-10',
        provenance_note: 'Imported and accepted for analyst intake.',
        applicability_scope: {},
        extracted_claims: [],
        tags: ['sidestream', 'benchmark', 'accepted'],
        created_at: '2026-04-16T08:00:00.000Z',
        updated_at: '2026-04-16T08:00:00.000Z',
      },
      {
        id: 'catalog-item-pending-001',
        title: 'Pending instrumentation study',
        summary: 'Instrumentation evidence waiting for analyst triage.',
        evidence_type: 'literature_evidence',
        strength_level: 'moderate',
        review_status: 'pending',
        source_state: 'parsed',
        source_type: 'openalex',
        source_category: 'scholarly_work',
        source_url: 'https://example.test/openalex',
        doi: '10.2000/example',
        publisher: 'OpenAlex Imports',
        published_at: '2025-10-02',
        provenance_note: 'Imported and still awaiting analyst review.',
        applicability_scope: {},
        extracted_claims: [],
        tags: ['instrumentation', 'pending'],
        created_at: '2026-04-17T08:00:00.000Z',
        updated_at: '2026-04-17T08:00:00.000Z',
      },
    ],
    summary: {
      total: 2,
      pending: 1,
      accepted: 1,
      rejected: 0,
    },
  };

  return {
    repository,
    baseline,
    current,
    evaluationWorkspace: buildEvaluationWorkspace({
      evaluation: current,
      history,
      versions: current.audit_record.runtime_versions,
    }),
    historyWorkspace: buildCaseHistoryWorkspace({
      history,
      currentEvaluationId: current.evaluation_id,
      versions: current.audit_record.runtime_versions,
    }),
    comparison: buildEvaluationComparison({
      current,
      baseline,
      versions: current.audit_record.runtime_versions,
    }),
    report: buildPrintableEvaluationReport({
      evaluation: current,
      versions: current.audit_record.runtime_versions,
    }),
    evidenceWorkspace: buildEvidenceReviewWorkspace({
      evidenceCatalog,
      versions: current.audit_record.runtime_versions,
      filters: {
        status: 'accepted',
        query: 'benchmark',
      },
    }),
  };
}
