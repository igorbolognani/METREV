import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';
import {
  AppRouterContext,
  type AppRouterInstance,
} from '../../apps/web-ui/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js';

const push = vi.fn();

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/lib/api', () => ({
  evaluateCase: vi.fn(),
  fetchExternalEvidenceCatalog: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function renderCaseForm() {
  const { CaseForm } =
    await import('../../apps/web-ui/src/components/case-form');
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router: AppRouterInstance = {
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    push,
    replace: vi.fn(),
    prefetch: vi.fn(),
  };

  return renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      { value: router },
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(CaseForm),
      ),
    ),
  );
}

describe('case form', () => {
  it('renders the consolidated drafting flow with one navigation system', async () => {
    const html = await renderCaseForm();

    expect(html).toContain('One navigation system, one drafting surface');
    expect(html).toContain('Case context');
    expect(html).toContain('Operating conditions');
    expect(html).toContain('Supplier context');
    expect(html).toContain('Evidence');
    expect(html).toContain('Current TRL');
    expect(html).toContain('Decision horizon');
    expect(html).toContain('Assumptions');
    expect(html).toContain('Capture context, operating envelope, supplier posture');
    expect(html).toContain('Validated presets');
    expect(html).toContain('Review evidence queue');
    expect(html).toContain('Run deterministic evaluation');
  });
});
