import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import {
  PrintableReportWorkspaceView,
  ReportConversationTrace,
} from '../../apps/web-ui/src/components/printable-report-view';
import { buildWorkspaceViewFixtures } from '../fixtures/workspace-view-fixtures';

describe('printable report view', () => {
  it('renders the print-friendly report sections aligned with the consulting template', async () => {
    const { report, repository } = await buildWorkspaceViewFixtures();

    try {
      const reportHtml = renderToStaticMarkup(
        React.createElement(PrintableReportWorkspaceView, {
          activeTab: 'report',
          report,
        }),
      );

      expect(reportHtml).toContain('Printable report');
      expect(reportHtml).toContain('Print / Save as PDF');
      expect(reportHtml).toContain('Ask this report');
      expect(reportHtml).toContain('Report');
      expect(reportHtml).toContain('Audit');
      expect(reportHtml).toContain('Stack diagnosis');
      expect(reportHtml).toContain('Action shortlist');
      expect(reportHtml).toContain('Qualified candidates');
      expect(reportHtml).not.toContain('report-conversation-drawer');
      expect(reportHtml).toContain(
        'Improves confidence, reduces false precision, and protects follow-on engineering and procurement decisions.',
      );

      const auditHtml = renderToStaticMarkup(
        React.createElement(PrintableReportWorkspaceView, {
          activeTab: 'audit',
          report,
        }),
      );

      expect(auditHtml).toContain('Defaults used');
      expect(auditHtml).toContain('Persisted provenance and snapshots');
    } finally {
      await repository.disconnect();
    }
  });

  it('renders grouped report conversation trace details for assistant answers', () => {
    const traceHtml = renderToStaticMarkup(
      React.createElement(ReportConversationTrace, {
        response: {
          conversation_id: 'report-conv-1',
          answer:
            'Use the confidence summary and next checks before changing the separator.',
          citations: [
            {
              citation_id: 'source:source-1',
              label: 'source-doc-1',
              section: 'stack_diagnosis',
              source_document_id: 'source-doc-1',
              claim_id: null,
              note: 'Separator benchmark source.',
            },
            {
              citation_id: 'claim:claim-1',
              label: 'claim-1',
              section: 'confidence_and_uncertainty_summary',
              source_document_id: null,
              claim_id: 'claim-1',
              note: 'Confidence caveat.',
            },
            {
              citation_id: 'report:confidence',
              label: 'Confidence and uncertainty',
              section: 'confidence_and_uncertainty_summary',
              source_document_id: null,
              claim_id: null,
              note: 'Report fallback citation.',
            },
          ],
          grounding_summary: {
            evaluation_id: 'eval-report-001',
            report_title: 'Wastewater retrofit report',
            selected_section: 'confidence_and_uncertainty_summary',
            used_sections: [
              'stack_diagnosis',
              'confidence_and_uncertainty_summary',
            ],
            source_usage_count: 2,
            claim_usage_count: 1,
            snapshot_count: 1,
          },
          uncertainty_summary:
            'Confidence remains bounded by missing current-density and fouling verification data.',
          recommended_next_checks: [
            'Run a current-density sweep',
            'Inspect separator fouling after one operating cycle',
          ],
          narrative_metadata: {
            mode: 'stub',
            provider: 'internal',
            model: null,
            status: 'generated',
            fallback_used: false,
            prompt_version: 'report-conversation-stub-v1',
          },
          metadata: {
            conversation_id: 'report-conv-1',
            mode: 'server',
            context_version: 'report-context-v2',
            persisted: true,
            created_at: '2026-04-15T12:05:00.000Z',
          },
          refusal_reason:
            'Speculative what-if answers need deterministic recalculation first.',
        },
      }),
    );

    expect(traceHtml).toContain('Section Confidence And Uncertainty Summary');
    expect(traceHtml).toContain('Refusal applied');
    expect(traceHtml).toContain('Recommended next checks');
    expect(traceHtml).toContain('Source links');
    expect(traceHtml).toContain('Claim links');
    expect(traceHtml).toContain('Report anchors');
    expect(traceHtml).toContain(
      'Speculative what-if answers need deterministic recalculation first.',
    );
  });
});
