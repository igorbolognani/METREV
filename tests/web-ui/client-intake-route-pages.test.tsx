import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: authMock,
}));

vi.mock('@/components/case-form', () => ({
  CaseForm: ({ actorRole }: { actorRole: string }) =>
    React.createElement('div', null, `case-form:${actorRole}`),
}));

vi.mock('@/components/intake-submitting-screen', () => ({
  IntakeSubmittingScreen: () =>
    React.createElement('div', null, 'intake-submitting-screen'),
}));

import NewCasePage from '../../apps/web-ui/src/app/cases/new/page';
import CaseSubmittingPage from '../../apps/web-ui/src/app/cases/new/submitting/page';

describe('client intake route pages', () => {
  it('allows viewer sessions to open the stack configuration flow', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'user-viewer-001',
        email: 'viewer@metrev.local',
        role: 'VIEWER',
      },
      sessionId: 'session-viewer-001',
    });

    const pages = await Promise.all([NewCasePage(), CaseSubmittingPage()]);

    expect(renderToStaticMarkup(pages[0])).toContain('case-form:VIEWER');
    expect(renderToStaticMarkup(pages[1])).toContain(
      'intake-submitting-screen',
    );
  });
});
