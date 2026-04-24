import rawFixture from './raw-case-input.json';

import type { SessionActor } from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import {
  rawCaseInputSchema,
  type ExternalEvidenceCatalogListResponse,
} from '@metrev/domain-contracts';

import {
  buildCaseHistoryWorkspace,
  buildEvidenceExplorerWorkspace,
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

  const currentWithLineage = {
    ...current,
    source_usages: [
      {
        id: 'source-usage-fixture-001',
        evaluation_id: current.evaluation_id,
        source_document_id: 'source-doc-fixture-001',
        usage_type: 'input_support' as const,
        note: 'Accepted benchmark source imported into the workspace.',
        created_at: current.audit_record.timestamp,
      },
    ],
    claim_usages: [
      {
        id: 'claim-usage-fixture-001',
        evaluation_id: current.evaluation_id,
        claim_id: 'claim-fixture-001',
        usage_type: 'recommendation_support' as const,
        note: 'Supports the prioritized improvement shortlist.',
        created_at: current.audit_record.timestamp,
      },
    ],
    workspace_snapshots: [
      {
        id: 'snapshot-fixture-001',
        evaluation_id: current.evaluation_id,
        case_id: current.case_id,
        snapshot_type: 'report' as const,
        payload: { generated_from: 'workspace-view-fixture' },
        created_at: current.audit_record.timestamp,
      },
    ],
  };

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
        claim_count: 0,
        reviewed_claim_count: 0,
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
        claim_count: 0,
        reviewed_claim_count: 0,
        applicability_scope: {},
        extracted_claims: [],
        tags: ['instrumentation', 'pending'],
        created_at: '2026-04-17T08:00:00.000Z',
        updated_at: '2026-04-17T08:00:00.000Z',
      },
    ],
    summary: {
      total: 2,
      filtered_total: 2,
      pending: 1,
      accepted: 1,
      rejected: 0,
      page: 1,
      page_size: 25,
      total_pages: 1,
      returned: 2,
    },
    warehouse_aggregate: {
      facets: {
        source_types: [
          {
            value: 'crossref',
            label: 'Crossref',
            count: 1,
          },
          {
            value: 'openalex',
            label: 'Openalex',
            count: 1,
          },
        ],
        evidence_types: [
          {
            value: 'literature_evidence',
            label: 'Literature Evidence',
            count: 2,
          },
        ],
        review_statuses: [
          {
            value: 'accepted',
            label: 'Accepted',
            count: 1,
          },
          {
            value: 'pending',
            label: 'Pending',
            count: 1,
          },
        ],
        publishers: [
          {
            value: 'Journal of MET Studies',
            label: 'Journal of MET Studies',
            count: 1,
          },
          {
            value: 'OpenAlex Imports',
            label: 'OpenAlex Imports',
            count: 1,
          },
        ],
      },
      snapshot: {
        filtered_item_count: 2,
        returned_item_count: 2,
        claim_count: 0,
        reviewed_claim_count: 0,
        doi_count: 2,
        linked_source_count: 2,
        publisher_count: 2,
      },
    },
  };

  return {
    repository,
    baseline,
    current: currentWithLineage,
    evaluationWorkspace: buildEvaluationWorkspace({
      evaluation: currentWithLineage,
      history,
      versions: current.audit_record.runtime_versions,
    }),
    historyWorkspace: buildCaseHistoryWorkspace({
      history,
      currentEvaluation: currentWithLineage,
      currentEvaluationId: currentWithLineage.evaluation_id,
      versions: current.audit_record.runtime_versions,
    }),
    comparison: buildEvaluationComparison({
      current: currentWithLineage,
      baseline,
      versions: current.audit_record.runtime_versions,
    }),
    report: buildPrintableEvaluationReport({
      evaluation: currentWithLineage,
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
    evidenceExplorerWorkspace: buildEvidenceExplorerWorkspace({
      evidenceCatalog,
      versions: current.audit_record.runtime_versions,
      filters: {
        status: 'accepted',
        query: 'benchmark',
        sourceType: 'crossref',
        page: 1,
        pageSize: 25,
      },
    }),
  };
}
