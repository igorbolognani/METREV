import { hasRequiredRole, type Role } from '@metrev/auth';

const defaultCallbackPath = '/';

export function normalizeCallbackPath(
  value: FormDataEntryValue | string | null | undefined,
): string {
  if (typeof value !== 'string') {
    return defaultCallbackPath;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/login' || trimmed.startsWith('//')) {
    return defaultCallbackPath;
  }

  if (!trimmed.startsWith('/')) {
    return defaultCallbackPath;
  }

  return trimmed;
}

export function buildLoginRedirect(callbackPath: string): string {
  const callbackUrl = normalizeCallbackPath(callbackPath);
  const params = new URLSearchParams({ callbackUrl });
  return `/login?${params.toString()}`;
}

export function sessionHasRequiredRole(
  role: Role | undefined,
  requiredRole: Role,
): boolean {
  return role ? hasRequiredRole(role, requiredRole) : false;
}
