import { getToken } from '@auth/core/jwt';
import { withSpan } from '@metrev/telemetry';
import { isNonEmptyString } from '@metrev/utils';

import { hasRequiredRole, parseRole, type Role } from './roles';

export interface SessionActor {
  userId: string;
  email: string;
  role: Role;
  sessionId: string;
  sessionToken: string;
}

export interface SessionResolverInput {
  cookieHeader?: string;
}

export type SessionResolver = (
  input: SessionResolverInput,
) => Promise<SessionActor | null>;

export class AuthorizationError extends Error {
  constructor(
    public readonly statusCode: 401 | 403,
    public readonly error: 'forbidden' | 'unauthorized',
    message: string,
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

const fallbackSessionCookieNames = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
] as const;

export const defaultSessionCookieName = 'authjs.session-token';

export function assertRuntimeAuthConfiguration(): void {
  if (!isNonEmptyString(process.env.AUTH_SECRET)) {
    throw new Error(
      'AUTH_SECRET must be set so runtime services can validate Auth.js session cookies.',
    );
  }
}

function sessionCookieNames(): string[] {
  const configured = process.env.AUTH_SESSION_COOKIE_NAME;

  return [configured, ...fallbackSessionCookieNames].filter(isNonEmptyString);
}

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  if (!isNonEmptyString(cookieHeader)) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, segment) => {
      const separatorIndex = segment.indexOf('=');

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();

      if (!key) {
        return accumulator;
      }

      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
}

export function getSessionTokenFromCookie(
  cookieHeader?: string,
): string | null {
  const cookies = parseCookieHeader(cookieHeader);

  for (const name of sessionCookieNames()) {
    const value = cookies[name];
    if (isNonEmptyString(value)) {
      return value;
    }
  }

  return null;
}

async function resolveJwtSession(
  cookieHeader?: string,
): Promise<SessionActor | null> {
  if (!isNonEmptyString(cookieHeader)) {
    return null;
  }

  const secret = process.env.AUTH_SECRET?.trim();
  if (!isNonEmptyString(secret)) {
    return null;
  }

  const cookies = parseCookieHeader(cookieHeader);

  for (const cookieName of sessionCookieNames()) {
    const sessionToken = cookies[cookieName];
    if (!isNonEmptyString(sessionToken)) {
      continue;
    }

    const token = await getToken({
      req: {
        headers: {
          cookie: cookieHeader,
        },
      },
      secret,
      cookieName,
      secureCookie: cookieName.startsWith('__Secure-'),
    });

    if (!token) {
      continue;
    }

    if (
      !isNonEmptyString(token.sub) ||
      !isNonEmptyString(token.email) ||
      !isNonEmptyString(token.role)
    ) {
      return null;
    }

    return {
      userId: token.sub,
      email: token.email,
      role: parseRole(token.role),
      sessionId: isNonEmptyString(token.jti) ? token.jti : sessionToken,
      sessionToken,
    };
  }

  return null;
}

export const getServerSession: SessionResolver = async ({ cookieHeader }) => {
  return withSpan(
    'auth.session.resolve',
    async () => {
      return resolveJwtSession(cookieHeader);
    },
    {
      has_cookie: Boolean(cookieHeader),
    },
  );
};

export function requireRole(
  actor: SessionActor | null,
  requiredRole: Role,
): SessionActor {
  if (!actor) {
    throw new AuthorizationError(
      401,
      'unauthorized',
      'A valid server-side session is required for this route.',
    );
  }

  if (!hasRequiredRole(actor.role, requiredRole)) {
    throw new AuthorizationError(
      403,
      'forbidden',
      `${requiredRole} role required for this route.`,
    );
  }

  return actor;
}
