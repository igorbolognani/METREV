import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import type { SessionResolver } from '@metrev/auth';
import {
  createEvaluationRepository,
  createResearchRepository,
  MemoryResearchRepository,
  type EvaluationRepository,
  type ResearchRepository,
} from '@metrev/database';

import { authPlugin } from './plugins/auth';
import { registerCaseRoutes } from './routes/cases';
import { registerEvaluationRoutes } from './routes/evaluations';
import { registerExportRoutes } from './routes/exports';
import { registerExternalEvidenceRoutes } from './routes/external-evidence';
import { registerHealthRoutes } from './routes/health';
import { registerResearchRoutes } from './routes/research';
import { registerWorkspaceRoutes } from './routes/workspace';

declare module 'fastify' {
  interface FastifyInstance {
    evaluationRepository: EvaluationRepository;
    researchRepository: ResearchRepository;
  }
}

export interface BuildAppOptions {
  researchRepository?: ResearchRepository;
  repository?: EvaluationRepository;
  rateLimit?: false;
  sessionResolver?: SessionResolver;
}

function parseRateLimitMax() {
  const parsed = Number.parseInt(
    process.env.METREV_API_RATE_LIMIT_MAX ?? '',
    10,
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  const repository = options.repository ?? createEvaluationRepository();
  const researchRepository =
    options.researchRepository ??
    (options.repository
      ? new MemoryResearchRepository()
      : createResearchRepository());

  app.decorate('evaluationRepository', repository);
  app.decorate('researchRepository', researchRepository);

  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(sensible);
  await authPlugin(app, {
    sessionResolver: options.sessionResolver,
  });
  if (options.rateLimit !== false) {
    await app.register(rateLimit, {
      max: parseRateLimitMax(),
      timeWindow:
        process.env.METREV_API_RATE_LIMIT_WINDOW?.trim() || '1 minute',
      keyGenerator: (request) => request.actor?.userId ?? request.ip,
    });
  }
  await registerHealthRoutes(app);
  await app.register(registerCaseRoutes, { prefix: '/api/cases' });
  await app.register(registerEvaluationRoutes, { prefix: '/api/evaluations' });
  await app.register(registerExternalEvidenceRoutes, {
    prefix: '/api/external-evidence',
  });
  await app.register(registerResearchRoutes, { prefix: '/api/research' });
  await app.register(registerWorkspaceRoutes, { prefix: '/api/workspace' });
  await app.register(registerExportRoutes, { prefix: '/api/exports' });

  app.addHook('onClose', async () => {
    await repository.disconnect();
    await app.researchRepository.disconnect();
  });

  return app;
}
