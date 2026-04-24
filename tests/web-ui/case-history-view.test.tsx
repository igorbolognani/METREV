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

      const html = renderToStaticMarkup(
        React.createElement(CaseHistoryWorkspaceView, {
          workspace: historyWorkspace,
        }),
      );

      expect(html).toContain('Case history');
      expect(html).toContain('Defaults used');
      expect(html).toContain('Stored evaluation runs');
      expect(html).toContain('Compare pair');
      expect(html).toContain('Persisted provenance and snapshots');
      expect(html).toContain(
        'Accepted benchmark source imported into the workspace.',
      );
      expect(html).toContain('/evidence/review/catalog-item-accepted-001');
      expect(html).toContain('Audit payload disclosures');
      expect(html).toContain('Attached evidence table');
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
