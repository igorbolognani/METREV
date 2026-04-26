import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { CaseHistoryWorkspaceView } from '../../apps/web-ui/src/components/case-history-view';
import { buildWorkspaceViewFixtures } from '../fixtures/workspace-view-fixtures';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

function buildAttachedEvidenceRecord(overrides: Record<string, unknown> = {}) {
  return {
    evidence_id: 'catalog:catalog-item-accepted-001',
    evidence_type: 'literature_evidence',
    title: 'Accepted sidestream benchmark',
    summary: 'Accepted benchmark record for industrial sidestream treatment.',
    applicability_scope: {},
    strength_level: 'strong',
    provenance_note: 'Imported and accepted for analyst intake.',
    quantitative_metrics: {},
    operating_conditions: {},
    block_mapping: [],
    limitations: ['Pilot-scale comparability remains bounded.'],
    contradiction_notes: [],
    benchmark_context: 'crossref via Journal of MET Studies',
    tags: ['sidestream', 'benchmark', 'accepted'],
    ...overrides,
  };
}

describe('case history view', () => {
  it('renders timeline tables, collapsed audit disclosures, and structured evidence context', async () => {
    const { historyWorkspace, repository } = await buildWorkspaceViewFixtures();

    try {
      historyWorkspace.evidence_records = [buildAttachedEvidenceRecord()];

      const timelineHtml = renderToStaticMarkup(
        React.createElement(CaseHistoryWorkspaceView, {
          activeTab: 'timeline',
          workspace: historyWorkspace,
        }),
      );

      expect(timelineHtml).toContain('Case history');
      expect(timelineHtml).toContain('Timeline');
      expect(timelineHtml).toContain('Evidence');
      expect(timelineHtml).toContain('Audit');
      expect(timelineHtml).toContain('Stored evaluation runs');
      expect(timelineHtml).toContain('Compare pair');

      const evidenceHtml = renderToStaticMarkup(
        React.createElement(CaseHistoryWorkspaceView, {
          activeTab: 'evidence',
          workspace: historyWorkspace,
        }),
      );

      expect(evidenceHtml).toContain('Attached evidence table');
      expect(evidenceHtml).toContain(
        'Accepted benchmark record for industrial sidestream treatment.',
      );
      expect(evidenceHtml).toContain(
        '/evidence/review/catalog-item-accepted-001',
      );

      const auditHtml = renderToStaticMarkup(
        React.createElement(CaseHistoryWorkspaceView, {
          activeTab: 'audit',
          workspace: historyWorkspace,
        }),
      );

      expect(auditHtml).toContain('Defaults used');
      expect(auditHtml).toContain('Persisted provenance and snapshots');
      expect(auditHtml).toContain('Audit payload disclosures');
    } finally {
      await repository.disconnect();
    }
  });

  it('bounds large evidence tables behind an explicit show-all control', async () => {
    const { historyWorkspace, repository } = await buildWorkspaceViewFixtures();

    try {
      historyWorkspace.evidence_records = Array.from(
        { length: 26 },
        (_, index) =>
          buildAttachedEvidenceRecord({
            evidence_id: `catalog:catalog-item-${index + 1}`,
            title: `Evidence ${index + 1}`,
          }),
      );

      const html = renderToStaticMarkup(
        React.createElement(CaseHistoryWorkspaceView, {
          activeTab: 'evidence',
          workspace: historyWorkspace,
        }),
      );

      expect(html).toContain('Showing 25 of 26 attached evidence record(s).');
      expect(html).toContain('Show all evidence');
    } finally {
      await repository.disconnect();
    }
  });
});
