import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get('/health', async () => ({
    service: 'api-server',
    status: 'ok',
  }));
}
