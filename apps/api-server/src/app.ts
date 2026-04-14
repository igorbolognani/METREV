import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import type { SessionResolver } from '@metrev/auth';
import {
  createEvaluationRepository,
  type EvaluationRepository,
} from '@metrev/database';

import { authPlugin } from './plugins/auth';
import { registerCaseRoutes } from './routes/cases';
import { registerEvaluationRoutes } from './routes/evaluations';
import { registerHealthRoutes } from './routes/health';

declare module 'fastify' {
  interface FastifyInstance {
    evaluationRepository: EvaluationRepository;
  }
}

export interface BuildAppOptions {
  repository?: EvaluationRepository;
  sessionResolver?: SessionResolver;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  const repository = options.repository ?? createEvaluationRepository();

  app.decorate('evaluationRepository', repository);

  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(sensible);
  await authPlugin(app, {
    sessionResolver: options.sessionResolver,
  });
  await registerHealthRoutes(app);
  await app.register(registerCaseRoutes, { prefix: '/api/cases' });
  await app.register(registerEvaluationRoutes, { prefix: '/api/evaluations' });

  app.addHook('onClose', async () => {
    await repository.disconnect();
  });

  return app;
}
