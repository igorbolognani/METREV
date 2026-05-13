export type NavIcon =
  | 'dashboard'
  | 'input-deck'
  | 'reports'
  | 'evidence-explorer'
  | 'evidence-review'
  | 'evidence-quality'
  | 'research-tables'
  | 'admin'
  | 'evaluations';

export interface NavItem {
  disabled?: boolean;
  href: string;
  icon: NavIcon;
  id: string;
  label: string;
  matchPrefixes?: string[];
  minimumRole?: 'ANALYST' | 'ADMIN';
  section: 'primary' | 'advanced';
}

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/home',
    icon: 'dashboard',
    id: 'home',
    label: 'Home',
    matchPrefixes: ['/dashboard'],
    section: 'primary',
  },
  {
    href: '/evaluate',
    icon: 'input-deck',
    id: 'evaluate',
    label: 'Evaluate',
    matchPrefixes: ['/cases/new', '/evaluations'],
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
    href: '/evidence',
    icon: 'evidence-explorer',
    id: 'evidence',
    label: 'Evidence',
    matchPrefixes: ['/admin/intelligence/evidence/explorer'],
    minimumRole: 'ANALYST',
    section: 'primary',
  },
  {
    href: '/evidence/quality',
    icon: 'evidence-quality',
    id: 'evidence-quality',
    label: 'Quality Audit',
    minimumRole: 'ANALYST',
    section: 'advanced',
  },
  {
    href: '/evidence/review',
    icon: 'evidence-review',
    id: 'evidence-review',
    label: 'Review Gate',
    matchPrefixes: ['/admin/intelligence/evidence/review'],
    minimumRole: 'ANALYST',
    section: 'advanced',
  },
  {
    href: '/research',
    icon: 'research-tables',
    id: 'research',
    label: 'Research',
    matchPrefixes: ['/admin/intelligence/research/reviews'],
    minimumRole: 'ANALYST',
    section: 'primary',
  },
  {
    href: '/admin',
    icon: 'admin',
    id: 'admin',
    label: 'Admin',
    minimumRole: 'ADMIN',
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

  if (normalizedPathname === '/dashboard' || normalizedPathname === '/home') {
    return [];
  }

  if (
    normalizedPathname === '/cases/new' ||
    normalizedPathname === '/evaluate'
  ) {
    return [{ href: '/home', label: 'Home' }];
  }

  if (normalizedPathname === '/cases/new/submitting') {
    return [
      { href: '/home', label: 'Home' },
      { href: '/evaluate', label: 'Evaluate' },
    ];
  }

  if (normalizedPathname === '/evaluations') {
    return [{ href: '/home', label: 'Home' }];
  }

  if (normalizedPathname === '/reports') {
    return [{ href: '/home', label: 'Home' }];
  }

  if (normalizedPathname === '/evidence') {
    return [{ href: '/home', label: 'Home' }];
  }

  if (normalizedPathname === '/evidence/quality') {
    return [
      { href: '/home', label: 'Home' },
      { href: '/evidence', label: 'Evidence' },
    ];
  }

  if (normalizedPathname === '/evidence/review') {
    return [
      { href: '/home', label: 'Home' },
      { href: '/evidence', label: 'Evidence' },
    ];
  }

  if (normalizedPathname === '/research') {
    return [{ href: '/home', label: 'Home' }];
  }

  if (normalizedPathname === '/admin') {
    return [{ href: '/home', label: 'Home' }];
  }

  if (normalizedPathname === '/admin/intelligence/evidence/explorer') {
    return [{ href: '/home', label: 'Home' }, { label: 'Admin Intelligence' }];
  }

  if (normalizedPathname === '/admin/intelligence/evidence/review') {
    return [{ href: '/home', label: 'Home' }, { label: 'Admin Intelligence' }];
  }

  if (normalizedPathname === '/admin/intelligence/research/reviews') {
    return [{ href: '/home', label: 'Home' }, { label: 'Admin Intelligence' }];
  }

  if (normalizedPathname.startsWith('/admin/intelligence/research/reviews/')) {
    const reviewId =
      readParam(params, 'id', 'reviewId') ??
      normalizedPathname.split('/')[5] ??
      'unknown';

    return [
      { href: '/home', label: 'Home' },
      {
        href: '/admin/intelligence/research/reviews',
        label: 'Research Tables',
      },
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
      { href: '/home', label: 'Home' },
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
      { href: '/home', label: 'Home' },
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
      { href: '/home', label: 'Home' },
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
      { href: '/home', label: 'Home' },
      { href: '/evaluations', label: 'Evaluations' },
      { label: `#${resolvedEvaluationId}` },
    ];
  }

  if (normalizedPathname.startsWith('/admin/intelligence/evidence/explorer/')) {
    const evidenceId =
      readParam(params, 'id', 'evidenceId') ??
      normalizedPathname.split('/')[5] ??
      'unknown';

    return [
      { href: '/home', label: 'Home' },
      {
        href: '/admin/intelligence/evidence/explorer',
        label: 'Evidence Explorer',
      },
      { label: `#${evidenceId}` },
    ];
  }

  if (normalizedPathname.startsWith('/admin/intelligence/evidence/review/')) {
    const evidenceId =
      readParam(params, 'id', 'evidenceId') ??
      normalizedPathname.split('/')[5] ??
      'unknown';

    return [
      { href: '/home', label: 'Home' },
      {
        href: '/admin/intelligence/evidence/review',
        label: 'Evidence Review',
      },
      { label: `#${evidenceId}` },
    ];
  }

  return [{ href: '/home', label: 'Home' }];
}
