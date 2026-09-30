import { describe, expect, it } from 'vitest';
import { MemorySpatialSimulationRunRepository } from '@metrev/database';
import { validSpatialSimulationResult } from '../fixtures/spatial-simulation-result';
import { createSpatialSimulationRunInput } from '../fixtures/spatial-simulation-run';
import {
  spatialModelInputV2Schema,
  spatialSimulationResultSchema,
  spatialSimulationResultForInputSchema,
  spatialSidecarRequestSchema,
  spatialLinearSourceLossSchema,
  spatialSpeciesBudgetSchema,
  spatialSpeciesBudgetResidual,
  spatialSpeciesBudgetMatchesLaw,
} from '@metrev/domain-contracts';
import {
  planarStokesRequestFromInput,
  planarDarcyTransportRequestFromInput,
} from '../../packages/spatial-sidecar-client/src';
import {
  stokesTransportInput,
  darcyTransportInput,
} from '../fixtures/spatial-input-v2';
import { linearSourceLoss } from '../fixtures/linear-source-loss';

describe('source-backed native scalar production and first-order loss', () => {
  it.each(['Stokes', 'Darcy'])(
    'retains coefficients/provenance in the same-domain %s request',
    (regime) => {
      const input = spatialModelInputV2Schema.parse(
        regime === 'Stokes' ? stokesTransportInput() : darcyTransportInput(),
      );
      const setup =
        input.stokes_transport_development ??
        input.darcy_transport_development!;
      setup.linear_source_loss = linearSourceLoss(0, 1e-6);
      const request =
        regime === 'Stokes'
          ? planarStokesRequestFromInput(input)
          : planarDarcyTransportRequestFromInput(input);
      expect(spatialSidecarRequestSchema.parse(request)).toMatchObject({
        transport_setup: { linear_source_loss: setup.linear_source_loss },
      });
    },
  );
  it.each(['missing', 'unit', 'source', 'negative', 'unknown_law', 'extra'])(
    'rejects %s coefficients instead of filling them',
    (mode) => {
      const coefficients = linearSourceLoss(0, 1e-6);
      const candidate: Record<string, unknown> = { ...coefficients };
      if (mode === 'missing') delete candidate.loss_rate_per_s;
      if (mode === 'unit') coefficients.loss_rate_per_s.unit = 's';
      if (mode === 'source') coefficients.source_rate_mol_m3_s.source_ref = '';
      if (mode === 'negative') coefficients.loss_rate_per_s.value = -1;
      if (mode === 'unknown_law') candidate.law = 'biological_network';
      if (mode === 'extra') candidate.default_rate = 1;
      expect(spatialLinearSourceLossSchema.safeParse(candidate).success).toBe(
        false,
      );
    },
  );
  it('retains the explicit source-free limiting case when no law is declared', () => {
    const request = planarStokesRequestFromInput(stokesTransportInput());
    expect(request.transport_setup!.linear_source_loss).toBeUndefined();
    expect(
      spatialLinearSourceLossSchema.parse(linearSourceLoss(0, 0)),
    ).toMatchObject({ loss_rate_per_s: { value: 0 } });
  });
  it('checks measured outward flux plus loss minus production with all terms in the scale', () => {
    const budget = spatialSpeciesBudgetSchema.parse({
      concentration_variable: 'c',
      unit: 'mol/(m*s)',
      inlet_outward_rate: -3,
      outlet_outward_rate: 1,
      wall_outward_rate: 0,
      production_rate: 2,
      consumption_rate: 4,
    });
    expect(spatialSpeciesBudgetResidual(budget)).toEqual({
      absolute: 0,
      relative: 0,
    });
    expect(
      spatialSpeciesBudgetResidual({ ...budget, consumption_rate: 3 }),
    ).toEqual({ absolute: 1, relative: 1 / 9 });
    expect(
      spatialSpeciesBudgetMatchesLaw(budget, linearSourceLoss(1, 2), 'c', 2, 2),
    ).toBe(true);
    expect(
      spatialSpeciesBudgetMatchesLaw(
        budget,
        linearSourceLoss(1, 2),
        'other',
        2,
        2,
      ),
    ).toBe(false);
    expect(
      spatialSpeciesBudgetMatchesLaw(budget, linearSourceLoss(1, 2), 'c', 3, 2),
    ).toBe(false);
    expect(
      spatialSpeciesBudgetMatchesLaw(budget, linearSourceLoss(1, 2), 'c', 2, 3),
    ).toBe(false);
    expect(
      spatialSpeciesBudgetSchema.safeParse({ ...budget, consumption_rate: -1 })
        .success,
    ).toBe(false);
  });
  it('rejects a forged persisted budget and a budget on source-free input', async () => {
    const input = createSpatialSimulationRunInput({
      ownerId: 'budget-owner',
      idempotencyKey: 'budget-test',
    });
    const { run } =
      await new MemorySpatialSimulationRunRepository().createOrGet(input);
    const result = validSpatialSimulationResult({
      ...run,
      mesh_sha256: 'a'.repeat(64),
    });
    const budget = {
      concentration_variable: 'c',
      unit: 'mol/(m*s)' as const,
      inlet_outward_rate: -3,
      outlet_outward_rate: 1,
      wall_outward_rate: 0,
      production_rate: 2,
      consumption_rate: 4,
    };
    const residual = result.conservation_residuals[0];
    residual.unit = budget.unit;
    residual.absolute_residual = 0;
    residual.relative_residual = 0;
    residual.species_budget = budget;
    expect(spatialSimulationResultSchema.safeParse(result).success).toBe(true);
    expect(
      spatialSimulationResultForInputSchema(input.input_snapshot).safeParse(
        result,
      ).success,
    ).toBe(false);
    residual.species_budget = { ...budget, consumption_rate: 3 };
    expect(spatialSimulationResultSchema.safeParse(result).success).toBe(false);
  });
});
