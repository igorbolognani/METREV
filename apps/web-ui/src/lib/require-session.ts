import 'server-only';

import type { Role } from '@metrev/auth';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';

import { buildLoginRedirect, sessionHasRequiredRole } from './auth-routing';

export async function requireAuthenticatedSession(callbackPath: string) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    redirect(buildLoginRedirect(callbackPath));
  }

  return session;
}

export async function requireRoleSession(
  callbackPath: string,
  requiredRole: Role,
) {
  const session = await requireAuthenticatedSession(callbackPath);

  return {
    session,
    authorized: sessionHasRequiredRole(session.user.role, requiredRole),
  };
}
