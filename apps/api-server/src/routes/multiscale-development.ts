import type { FastifyInstance } from 'fastify';
import { AuthorizationError, requireRole } from '@metrev/auth';
import {
  scaleTransferInputSchema,
  stackHydraulicNetworkInputSchema,
  stackNetworkInputSchema,
} from '@metrev/domain-contracts';
import {
  calculateLayeredScaleTransfer,
  solveStackHydraulicNetwork,
  solveLinearStackNetwork,
} from '@metrev/electrochem-models';

/** Read-only source-backed development reductions. No case/measurement mutation. */
export async function registerMultiscaleDevelopmentRoutes(
  app: FastifyInstance,
) {
  app.post(
    '/scale-transfer',
    { bodyLimit: 512 * 1024 },
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ANALYST');
      } catch (error) {
        if (error instanceof AuthorizationError)
          return reply.code(error.statusCode).send({ error: error.error });
        throw error;
      }
      const parsed = scaleTransferInputSchema.safeParse(request.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: 'invalid_input', details: parsed.error.flatten() });
      try {
        return reply.send(calculateLayeredScaleTransfer(parsed.data));
      } catch (error) {
        if (error instanceof RangeError)
          return reply.code(422).send({ error: 'numerical_reduction_failed' });
        throw error;
      }
    },
  );
  app.post(
    '/stack-hydraulic-network',
    { bodyLimit: 512 * 1024 },
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ANALYST');
      } catch (error) {
        if (error instanceof AuthorizationError)
          return reply.code(error.statusCode).send({ error: error.error });
        throw error;
      }
      const parsed = stackHydraulicNetworkInputSchema.safeParse(request.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: 'invalid_input', details: parsed.error.flatten() });
      try {
        return reply.send(solveStackHydraulicNetwork(parsed.data));
      } catch (error) {
        if (error instanceof RangeError)
          return reply
            .code(422)
            .send({ error: 'numerical_hydraulic_network_failed' });
        throw error;
      }
    },
  );
  app.post(
    '/stack-network',
    { bodyLimit: 512 * 1024 },
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ANALYST');
      } catch (error) {
        if (error instanceof AuthorizationError)
          return reply.code(error.statusCode).send({ error: error.error });
        throw error;
      }
      const parsed = stackNetworkInputSchema.safeParse(request.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: 'invalid_input', details: parsed.error.flatten() });
      try {
        return reply.send(solveLinearStackNetwork(parsed.data));
      } catch (error) {
        if (error instanceof RangeError)
          return reply.code(422).send({ error: 'numerical_network_failed' });
        throw error;
      }
    },
  );
}
