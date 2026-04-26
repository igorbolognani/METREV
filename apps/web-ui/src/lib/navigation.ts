export type NavIcon =
  | 'dashboard'
  | 'input-deck'
  | 'reports'
  | 'evidence-explorer'
  | 'evidence-review'
  | 'research-tables'
  | 'evaluations';

export interface NavItem {
  disabled?: boolean;
  href: string;
  icon: NavIcon;
  id: string;
  label: string;
  minimumRole?: 'ANALYST' | 'ADMIN';
  section: 'primary' | 'advanced';
}

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    icon: 'dashboard',
    id: 'dashboard',
    label: 'Dashboard',
    section: 'primary',
  },
  {
    href: '/cases/new',
    icon: 'input-deck',
    id: 'input-deck',
    label: 'Configure Stack',
    section: 'primary',
  },
  {
    href: '/evaluations',
    icon: 'evaluations',
    id: 'evaluations',
    label: 'Evaluations',
    section: 'primary',
  },
  {
    href: '/reports',
    icon: 'reports',
    id: 'reports',
    label: 'Reports',
    section: 'primary',
  },
  {
    href: '/evidence/explorer',
    icon: 'evidence-explorer',
    id: 'evidence-explorer',
    label: 'Evidence Explorer',
    minimumRole: 'ANALYST',
    section: 'advanced',
  },
  {
    href: '/evidence/review',
    icon: 'evidence-review',
    id: 'evidence-review',
    label: 'Evidence Review',
    minimumRole: 'ANALYST',
    section: 'advanced',
  },
  {
    href: '/research/reviews',
    icon: 'research-tables',
    id: 'research-tables',
    label: 'Research Tables',
    minimumRole: 'ANALYST',
    section: 'advanced',
  },
];

export function canUseNavItem(
  item: NavItem,
  role: string | null | undefined,
): boolean {
  if (!item.minimumRole) {
    return true;
  }

  if (item.minimumRole === 'ADMIN') {
    return role === 'ADMIN';
  }

  return role === 'ANALYST' || role === 'ADMIN';
}

export function getNavItemsForRole(role: string | null | undefined) {
  return NAV_ITEMS.filter((item) => canUseNavItem(item, role));
}

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

  if (normalizedPathname === '/dashboard') {
    return [];
  }

  if (normalizedPathname === '/cases/new') {
    return [{ href: '/dashboard', label: 'Dashboard' }];
  }

  if (normalizedPathname === '/cases/new/submitting') {
    return [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/cases/new', label: 'Configure Stack' },
    ];
  }

  if (normalizedPathname === '/evaluations') {
    return [{ href: '/dashboard', label: 'Dashboard' }];
  }

  if (normalizedPathname === '/reports') {
    return [{ href: '/dashboard', label: 'Dashboard' }];
  }

  if (normalizedPathname === '/evidence/explorer') {
    return [{ href: '/dashboard', label: 'Dashboard' }];
  }

  if (normalizedPathname === '/evidence/review') {
    return [{ href: '/dashboard', label: 'Dashboard' }];
  }

  if (normalizedPathname === '/research/reviews') {
    return [{ href: '/dashboard', label: 'Dashboard' }];
  }

  if (normalizedPathname.startsWith('/research/reviews/')) {
    const reviewId =
      readParam(params, 'id', 'reviewId') ??
      normalizedPathname.split('/')[3] ??
      'unknown';

    return [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/research/reviews', label: 'Research Tables' },
      { label: `#${reviewId}` },
    ];
  }

  if (
    normalizedPathname.startsWith('/cases/') &&
    normalizedPathname.endsWith('/history')
  ) {
    const resolvedCaseId =
      caseId ?? normalizedPathname.split('/')[2] ?? 'unknown';

    return [
      { href: '/dashboard', label: 'Dashboard' },
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
      { href: '/dashboard', label: 'Dashboard' },
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
      { href: '/dashboard', label: 'Dashboard' },
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
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/evaluations', label: 'Evaluations' },
      { label: `#${resolvedEvaluationId}` },
    ];
  }

  if (normalizedPathname.startsWith('/evidence/explorer/')) {
    const evidenceId =
      readParam(params, 'id', 'evidenceId') ??
      normalizedPathname.split('/')[3] ??
      'unknown';

    return [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/evidence/explorer', label: 'Evidence Explorer' },
      { label: `#${evidenceId}` },
    ];
  }

  if (normalizedPathname.startsWith('/evidence/review/')) {
    const evidenceId =
      readParam(params, 'id', 'evidenceId') ??
      normalizedPathname.split('/')[3] ??
      'unknown';

    return [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/evidence/review', label: 'Evidence Review' },
      { label: `#${evidenceId}` },
    ];
  }

  return [{ href: '/dashboard', label: 'Dashboard' }];
}
