import type { DefaultSession } from 'next-auth';

import type { Role } from '@metrev/auth';

declare module 'next-auth' {
  interface Session {
    sessionId?: string;
    user: {
      id: string;
      role: Role;
      email: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role;
  }
}
