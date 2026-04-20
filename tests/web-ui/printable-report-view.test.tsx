import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { PrintableReportWorkspaceView } from '../../apps/web-ui/src/components/printable-report-view';
import { buildWorkspaceViewFixtures } from '../fixtures/workspace-view-fixtures';

describe('printable report view', () => {
  it('renders the print-friendly report sections aligned with the consulting template', async () => {
    const { report, repository } = await buildWorkspaceViewFixtures();

    try {
      const html = renderToStaticMarkup(
        React.createElement(PrintableReportWorkspaceView, {
          report,
        }),
      );

      expect(html).toContain('Printable report');
      expect(html).toContain('Print / Save as PDF');
      expect(html).toContain('Stack diagnosis');
      expect(html).toContain('Action shortlist');
      expect(html).toContain('Qualified candidates');
      expect(html).toContain('Defaults used');
    } finally {
      await repository.disconnect();
    }
  });
});
