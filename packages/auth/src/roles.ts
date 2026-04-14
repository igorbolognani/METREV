import { isNonEmptyString } from '@metrev/utils';

export const roles = ['ADMIN', 'ANALYST', 'VIEWER'] as const;

export type Role = (typeof roles)[number];

const roleOrder: Record<Role, number> = {
  ADMIN: 0,
  ANALYST: 1,
  VIEWER: 2,
};

export function parseRole(value: unknown, fallback: Role = 'VIEWER'): Role {
  if (Array.isArray(value)) {
    return parseRole(value[0], fallback);
  }

  if (!isNonEmptyString(value)) {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  return (roles.find((role) => role === normalized) ?? fallback) as Role;
}

export function hasRequiredRole(userRole: Role, requiredRole: Role): boolean {
  return roleOrder[userRole] <= roleOrder[requiredRole];
}
