import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { PrintableReportWorkspaceView } from '../../apps/web-ui/src/components/printable-report-view';
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
      expect(reportHtml).toContain('Report');
      expect(reportHtml).toContain('Audit');
      expect(reportHtml).toContain('Stack diagnosis');
      expect(reportHtml).toContain('Action shortlist');
      expect(reportHtml).toContain('Qualified candidates');
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
});
