import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import type { SessionResolver } from '@metrev/auth';
import {
  createEvaluationRepository,
  createEvidenceAuditRepository,
  createResearchRepository,
  createSpatialSimulationRunRepository,
  MemoryEvidenceAuditRepository,
  MemoryResearchRepository,
  MemorySpatialSimulationRunRepository,
  type EvaluationRepository,
  type EvidenceAuditRepository,
  type ResearchRepository,
  type SpatialSimulationRunRepository,
} from '@metrev/database';

import { authPlugin } from './plugins/auth';
import { registerCaseRoutes } from './routes/cases';
import { registerEvaluationRoutes } from './routes/evaluations';
import { registerEvidenceAuditRoutes } from './routes/evidence-audit';
import { registerExportRoutes } from './routes/exports';
import { registerExternalEvidenceRoutes } from './routes/external-evidence';
import { registerHealthRoutes } from './routes/health';
import { registerModelingRoutes } from './routes/modeling';
import { registerResearchRoutes } from './routes/research';
import {
  registerSpatialSimulationRoutes,
  type SpatialFieldArtifactReader,
  type SpatialSimulationRunAdmission,
} from './routes/spatial-simulations';
import { registerWorkspaceRoutes } from './routes/workspace';

declare module 'fastify' {
  interface FastifyInstance {
    evaluationRepository: EvaluationRepository;
    evidenceAuditRepository: EvidenceAuditRepository;
    researchRepository: ResearchRepository;
    spatialSimulationRunRepository: SpatialSimulationRunRepository;
    spatialSimulationRunAdmission: SpatialSimulationRunAdmission | null;
    spatialFieldArtifactReader: SpatialFieldArtifactReader | null;
  }
}

export interface BuildAppOptions {
  evidenceAuditRepository?: EvidenceAuditRepository;
  researchRepository?: ResearchRepository;
  repository?: EvaluationRepository;
  rateLimit?: false;
  sessionResolver?: SessionResolver;
  spatialFieldArtifactReader?: SpatialFieldArtifactReader;
  spatialSimulationRunAdmission?: SpatialSimulationRunAdmission;
  spatialSimulationRunRepository?: SpatialSimulationRunRepository;
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
  const evidenceAuditRepository =
    options.evidenceAuditRepository ??
    (options.repository
      ? new MemoryEvidenceAuditRepository()
      : createEvidenceAuditRepository());
  const spatialSimulationRunRepository =
    options.spatialSimulationRunRepository ??
    (options.repository
      ? new MemorySpatialSimulationRunRepository()
      : createSpatialSimulationRunRepository());

  app.decorate('evaluationRepository', repository);
  app.decorate('evidenceAuditRepository', evidenceAuditRepository);
  app.decorate('researchRepository', researchRepository);
  app.decorate(
    'spatialSimulationRunRepository',
    spatialSimulationRunRepository,
  );
  app.decorate(
    'spatialSimulationRunAdmission',
    options.spatialSimulationRunAdmission ?? null,
  );
  app.decorate(
    'spatialFieldArtifactReader',
    options.spatialFieldArtifactReader ?? null,
  );

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
  await app.register(registerEvidenceAuditRoutes, {
    prefix: '/api/evidence-intelligence',
  });
  await app.register(registerResearchRoutes, { prefix: '/api/research' });
  await app.register(registerSpatialSimulationRoutes, {
    prefix: '/api/spatial-simulations',
  });
  await app.register(registerModelingRoutes, { prefix: '/api/modeling' });
  await app.register(registerWorkspaceRoutes, { prefix: '/api/workspace' });
  await app.register(registerExportRoutes, { prefix: '/api/exports' });

  app.addHook('onClose', async () => {
    await repository.disconnect();
    await app.researchRepository.disconnect();
  });

  return app;
}
