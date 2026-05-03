import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    AppRouterContext,
    type AppRouterInstance,
} from '../../apps/web-ui/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

const push = vi.fn();

vi.mock('next/navigation', async () => {
  const actual =
    await vi.importActual<typeof import('next/navigation')>('next/navigation');

  return {
    ...actual,
    useRouter: () => ({ push }),
    useSearchParams: () => new URLSearchParams(),
  };
});

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
  fetchResearchEvidencePackDecisionInput: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function renderCaseForm(
  actorRole: 'VIEWER' | 'ANALYST' | 'ADMIN' = 'VIEWER',
) {
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
        React.createElement(CaseForm, { actorRole }),
      ),
    ),
  );
}

describe('case form', () => {
  it('renders the stack configurator as an input workbench with explicit preflight preview', async () => {
    const html = await renderCaseForm();

    expect(html).toContain('Stack configurator');
    expect(html).toContain('Input navigator');
    expect(html).toContain('Step 1 of 12');
    expect(html).toContain('Autosave ready');
    expect(html).toContain('Context &amp; Objective');
    expect(html).toContain('Reactor Architecture');
    expect(html).toContain('Electrical Interconnect');
    expect(html).toContain('Operating Envelope');
    expect(html).toContain('Suppliers &amp; Constraints');
    expect(html).toContain('Review &amp; Submit');
    expect(html).toContain('Preflight preview');
    expect(html).toContain('Input vs generated output');
    expect(html).toContain('Preset library');
    expect(html).toContain('Current TRL');
    expect(html).toContain('Decision horizon');
    expect(html).toContain('Deployment context');
    expect(html).toContain('Define the stack inputs here');
    expect(html).toContain('Generated after submit');
    expect(html).toContain('Configure stack');
    expect(html).toContain('saved reports and evaluation history');
    expect(html).not.toContain('Open admin evidence queue');
    expect(html).toContain('Next: Reactor Architecture');
    expect(html).toContain('Next step');
  });

  it('renders explicit parameter controls for parameterized stack fields', async () => {
    const { CaseFormStackDetailStep } =
      await import('../../apps/web-ui/src/components/case-form/case-form-stack-detail-step');
    const { defaultCaseIntakeFormValues } =
      await import('../../apps/web-ui/src/lib/case-intake');

    const html = renderToStaticMarkup(
      React.createElement(CaseFormStackDetailStep, {
        formValues: {
          ...defaultCaseIntakeFormValues,
          parameterModes: {
            membranePresence: 'system_default',
          },
        },
        onFieldChange: vi.fn(),
        onParameterModeChange: vi.fn(),
        step: 'reactor-architecture',
      }),
    );

    expect(html).toContain('Parameter control');
    expect((html.match(/Parameter control/g) ?? []).length).toBe(4);
    expect(html).toContain('Parameter mode');
    expect(html).toContain('System default available');
    expect(html).toContain('Confidence impact medium');
    expect(html).toContain(
      'Absence of clear membrane information should not be collapsed into present or absent.',
    );
  });

  it('renders a dedicated electrical interconnect step with parameter controls', async () => {
    const { CaseFormStackDetailStep } =
      await import('../../apps/web-ui/src/components/case-form/case-form-stack-detail-step');
    const { defaultCaseIntakeFormValues } =
      await import('../../apps/web-ui/src/lib/case-intake');

    const html = renderToStaticMarkup(
      React.createElement(CaseFormStackDetailStep, {
        formValues: {
          ...defaultCaseIntakeFormValues,
          electricalCurrentCollectionStrategy: 'Bolted graphite plate contacts',
          electricalCorrosionProtectionLevel: 'medium',
          parameterModes: {
            electricalSealingStrategy: 'exclude',
          },
        },
        onFieldChange: vi.fn(),
        onParameterModeChange: vi.fn(),
        step: 'electrical-interconnect',
      }),
    );

    expect(html).toContain('Electrical interconnect &amp; sealing');
    expect((html.match(/Parameter control/g) ?? []).length).toBe(3);
    expect(html).toContain('Current collection strategy');
    expect(html).toContain('Corrosion protection level');
    expect(html).toContain('Sealing strategy');
    expect(html).toContain(
      'This parameter is omitted from the active run input but remains audit-visible.',
    );
  });

  it('renders parameter controls for the remaining operating inputs, not only numeric fields', async () => {
    const { CaseFormOperationStep } =
      await import('../../apps/web-ui/src/components/case-form/case-form-operation-step');
    const { defaultCaseIntakeFormValues } =
      await import('../../apps/web-ui/src/lib/case-intake');

    const html = renderToStaticMarkup(
      React.createElement(CaseFormOperationStep, {
        formValues: {
          ...defaultCaseIntakeFormValues,
          parameterModes: {
            influentType: 'exclude',
          },
        },
        onFieldChange: vi.fn(),
        onParameterModeChange: vi.fn(),
      }),
    );

    expect((html.match(/Parameter control/g) ?? []).length).toBe(7);
    expect(html).toContain('Influent type');
    expect(html).toContain('Substrate profile');
    expect(html).toContain('Operating regime');
    expect(html).toContain(
      'This parameter is omitted from the active run input but remains audit-visible.',
    );
  });
});
