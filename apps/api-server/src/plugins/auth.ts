import type { FastifyInstance } from 'fastify';

import {
  getServerSession,
  type SessionActor,
  type SessionResolver,
} from '@metrev/auth';

declare module 'fastify' {
  interface FastifyRequest {
    actor: SessionActor | null;
  }
}

export interface AuthPluginOptions {
  sessionResolver?: SessionResolver;
}

export async function authPlugin(
  app: FastifyInstance,
  options: AuthPluginOptions = {},
): Promise<void> {
  app.decorateRequest('actor', null);

  app.addHook('onRequest', async (request) => {
    request.actor = await (options.sessionResolver ?? getServerSession)({
      cookieHeader: request.headers.cookie,
    });
  });
}
