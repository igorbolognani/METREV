import type { FastifyInstance } from 'fastify';
import { AuthorizationError, requireRole } from '@metrev/auth';
import { coupledCell1dInputSchema } from '@metrev/domain-contracts';
import { runConfiguredElectrochemicalModel } from '@metrev/electrochem-models';

/** Read-only development calculation. It never persists a case or admits evidence. */
export async function registerModelingRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post(
    '/coupled-cell-1d',
    { config: { rateLimit: {} }, bodyLimit: 512 * 1024 },
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ANALYST');
      } catch (error) {
        if (error instanceof AuthorizationError)
          return reply
            .code(error.statusCode)
            .send({ error: error.error, message: error.message });
        throw error;
      }
      const parsed = coupledCell1dInputSchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({
          error: 'invalid_input',
          details: parsed.error.flatten(),
        });
      try {
        const calculation = runConfiguredElectrochemicalModel({
          model: 'coupled-cell-1d-restricted-v1',
          cell: parsed.data,
        });
        return reply.send(calculation);
      } catch (error) {
        if (error instanceof RangeError)
          return reply.code(422).send({
            error: 'unsupported_model_boundary',
            message: error.message,
          });
        if (
          error instanceof Error &&
          /did not|failed ionic|singular/.test(error.message)
        )
          return reply.code(422).send({
            error: 'numerical_nonconvergence',
            message: error.message,
          });
        throw error;
      }
    },
  );
}
