import { parseRole, verifyPassword } from '@metrev/auth';
import { withSpan } from '@metrev/telemetry';

export const authUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  passwordHash: true,
} as const;

type AuthorizeCredentialsInput =
  | {
      email?: unknown;
      password?: unknown;
    }
  | null
  | undefined;

type AuthUserRecord = {
  id: string;
  email: string;
  name: string | null;
  role: unknown;
  passwordHash: string;
};

export type AuthPrismaClient = {
  user: {
    findUnique: (input: {
      where: { email: string };
      select: typeof authUserSelect;
    }) => Promise<AuthUserRecord | null>;
  };
};

type AuthCallbackTokenShape = Record<string, unknown> & {
  sub?: string;
  email?: string | null;
  name?: string | null;
  role?: unknown;
  jti?: string;
};

export async function authorizeCredentials(
  credentials: AuthorizeCredentialsInput,
  prisma: AuthPrismaClient,
) {
  return withSpan(
    'auth.signin.authorize',
    async () => {
      const email =
        typeof credentials?.email === 'string'
          ? credentials.email.trim().toLowerCase()
          : '';
      const password =
        typeof credentials?.password === 'string' ? credentials.password : '';

      if (!email || password.length < 8) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: authUserSelect,
      });

      if (!user) {
        return null;
      }

      const passwordMatches = await verifyPassword(password, user.passwordHash);
      if (!passwordMatches) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: parseRole(user.role),
      };
    },
    {
      has_email: typeof credentials?.email === 'string',
    },
  );
}

export async function applyJwtCallback<
  TToken extends AuthCallbackTokenShape,
  TUser extends {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: unknown;
  },
>(input: { token: TToken; user?: TUser }) {
  const { token, user } = input;

  if (user) {
    token.sub = user.id;
    token.email = user.email ?? token.email;
    token.name = user.name ?? token.name;
    token.role = user.role;
  }

  return token;
}

export async function applySessionCallback<
  TSession extends {
    user?: {
      id?: string;
      email?: string | null;
      role?: unknown;
    };
    sessionId?: string;
  },
  TToken extends AuthCallbackTokenShape,
>(input: { session: TSession; token: TToken }) {
  const { session, token } = input;

  if (session.user) {
    session.user.id =
      typeof token.sub === 'string' ? token.sub : session.user.id;
    session.user.email =
      typeof token.email === 'string'
        ? token.email
        : (session.user.email ?? '');
    session.user.role = parseRole(token.role);
    session.sessionId =
      typeof token.jti === 'string' ? token.jti : session.sessionId;
  }

  return session;
}
