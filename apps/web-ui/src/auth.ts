import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { getPrismaClient } from '@metrev/database';

import {
  applyJwtCallback,
  applySessionCallback,
  authorizeCredentials,
} from './lib/auth-config';

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
        return authorizeCredentials(credentials, prisma);
      },
    }),
  ],
  callbacks: {
    async jwt(args) {
      return applyJwtCallback(args);
    },
    async session(args) {
      return applySessionCallback(args);
    },
  },
});
