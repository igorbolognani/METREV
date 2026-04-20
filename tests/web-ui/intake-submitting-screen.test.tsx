import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import {
    IntakeSubmittingProgressView,
    progressStages,
} from '../../apps/web-ui/src/components/intake-submitting-screen';

describe('intake submitting screen', () => {
  it('renders deterministic progress stages for the synchronous submission flow', () => {
    const html = renderToStaticMarkup(
      React.createElement(IntakeSubmittingProgressView, {
        activeStageIndex: 2,
        error: null,
      }),
    );

    expect(html).toContain('Preparing your evaluation workspace');
    expect(html).toContain('Execution stages');
    expect(html).toContain(progressStages[2]);
    expect(html).toContain('Currently running.');
    expect(html).toContain('Queued next.');
  });
});
