import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { parseRole, verifyPassword } from '@metrev/auth';
import { getPrismaClient } from '@metrev/database';
import { withSpan } from '@metrev/telemetry';

const prisma = getPrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  providers: [
    Credentials({
      name: 'Email and Password',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        return withSpan(
          'auth.signin.authorize',
          async () => {
            const email =
              typeof credentials?.email === 'string'
                ? credentials.email.trim().toLowerCase()
                : '';
            const password =
              typeof credentials?.password === 'string'
                ? credentials.password
                : '';

            if (!email || password.length < 8) {
              return null;
            }

            const user = await prisma.user.findUnique({
              where: { email },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                passwordHash: true,
              },
            });

            if (!user) {
              return null;
            }

            const passwordMatches = await verifyPassword(
              password,
              user.passwordHash,
            );
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
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.email =
          typeof token.email === 'string'
            ? token.email
            : (session.user.email ?? '');
        session.user.role = parseRole(token.role);
        session.sessionId =
          typeof token.jti === 'string' ? token.jti : session.sessionId;
      }

      return session;
    },
  },
});
