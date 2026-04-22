export type NavIcon =
  | 'dashboard'
  | 'input-deck'
  | 'evidence-review'
  | 'evaluations';

export interface NavItem {
  disabled?: boolean;
  href: string;
  icon: NavIcon;
  id: string;
  label: string;
}

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    icon: 'dashboard',
    id: 'dashboard',
    label: 'Dashboard',
  },
  {
    href: '/cases/new',
    icon: 'input-deck',
    id: 'input-deck',
    label: 'Input Deck',
  },
  {
    href: '/evidence/review',
    icon: 'evidence-review',
    id: 'evidence-review',
    label: 'Evidence Review',
  },
  {
    href: '/evaluations',
    icon: 'evaluations',
    id: 'evaluations',
    label: 'All Evaluations',
  },
];

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '/';
  }

  const normalizedPathname =
    pathname.endsWith('/') && pathname !== '/'
      ? pathname.slice(0, -1)
      : pathname;

  return normalizedPathname || '/';
}

function readParam(
  params: Record<string, string>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = params[key];
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function buildBreadcrumbs(
  pathname: string,
  params: Record<string, string>,
): BreadcrumbItem[] {
  const normalizedPathname = normalizePathname(pathname);
  const evaluationId = readParam(params, 'id', 'evaluationId');
  const caseId = readParam(params, 'caseId', 'id');

  if (normalizedPathname === '/') {
    return [];
  }

  if (normalizedPathname === '/cases/new') {
    return [{ href: '/', label: 'Dashboard' }];
  }

  if (normalizedPathname === '/cases/new/submitting') {
    return [
      { href: '/', label: 'Dashboard' },
      { href: '/cases/new', label: 'Input Deck' },
    ];
  }

  if (normalizedPathname === '/evaluations') {
    return [{ href: '/', label: 'Dashboard' }];
  }

  if (normalizedPathname === '/evidence/review') {
    return [{ href: '/', label: 'Dashboard' }];
  }

  if (
    normalizedPathname.startsWith('/cases/') &&
    normalizedPathname.endsWith('/history')
  ) {
    const resolvedCaseId =
      caseId ?? normalizedPathname.split('/')[2] ?? 'unknown';

    return [
      { href: '/', label: 'Dashboard' },
      {
        href: `/cases/${resolvedCaseId}/history`,
        label: `Case #${resolvedCaseId}`,
      },
    ];
  }

  if (
    normalizedPathname.startsWith('/evaluations/') &&
    normalizedPathname.endsWith('/report')
  ) {
    const resolvedEvaluationId =
      evaluationId ?? normalizedPathname.split('/')[2] ?? 'unknown';

    return [
      { href: '/', label: 'Dashboard' },
      { href: '/evaluations', label: 'Evaluations' },
      {
        href: `/evaluations/${resolvedEvaluationId}`,
        label: `#${resolvedEvaluationId}`,
      },
      { label: 'Report' },
    ];
  }

  if (normalizedPathname.includes('/compare/')) {
    const resolvedEvaluationId =
      evaluationId ?? normalizedPathname.split('/')[2] ?? 'unknown';

    return [
      { href: '/', label: 'Dashboard' },
      { href: '/evaluations', label: 'Evaluations' },
      {
        href: `/evaluations/${resolvedEvaluationId}`,
        label: `#${resolvedEvaluationId}`,
      },
      { label: 'Compare' },
    ];
  }

  if (normalizedPathname.startsWith('/evaluations/')) {
    const resolvedEvaluationId =
      evaluationId ?? normalizedPathname.split('/')[2] ?? 'unknown';

    return [
      { href: '/', label: 'Dashboard' },
      { href: '/evaluations', label: 'Evaluations' },
      { label: `#${resolvedEvaluationId}` },
    ];
  }

  if (normalizedPathname.startsWith('/evidence/review/')) {
    const evidenceId =
      readParam(params, 'id', 'evidenceId') ??
      normalizedPathname.split('/')[3] ??
      'unknown';

    return [
      { href: '/', label: 'Dashboard' },
      { href: '/evidence/review', label: 'Evidence Review' },
      { label: `#${evidenceId}` },
    ];
  }

  return [{ href: '/', label: 'Dashboard' }];
}
