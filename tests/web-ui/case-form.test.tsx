import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    AppRouterContext,
    type AppRouterInstance,
} from '../../apps/web-ui/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

const push = vi.fn();

vi.mock('@/lib/case-form-query-state', async () => {
  const actual = await vi.importActual<
    typeof import('../../apps/web-ui/src/lib/case-form-query-state')
  >('../../apps/web-ui/src/lib/case-form-query-state');

  return {
    ...actual,
    useCaseFormStep: () => ['context-objective', vi.fn()] as const,
  };
});

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
  it('renders the stack cockpit wizard with stepper, autosave state, and preset deck', async () => {
    const html = await renderCaseForm();

    expect(html).toContain('One cockpit, one stack configuration surface');
    expect(html).toContain('Cockpit flow');
    expect(html).toContain('Step 1 of 11');
    expect(html).toContain('Autosave ready');
    expect(html).toContain('Context &amp; Objective');
    expect(html).toContain('Reactor Architecture');
    expect(html).toContain('Operating Envelope');
    expect(html).toContain('Suppliers &amp; Constraints');
    expect(html).toContain('Review &amp; Submit');
    expect(html).toContain('Current TRL');
    expect(html).toContain('Decision horizon');
    expect(html).toContain('Deployment context');
    expect(html).toContain('Configure the current METREV stack block by block');
    expect(html).toContain('Validated presets');
    expect(html).toContain('Review evidence queue');
    expect(html).toContain('Next: Reactor Architecture');
    expect(html).toContain('Next step');
  });
});
