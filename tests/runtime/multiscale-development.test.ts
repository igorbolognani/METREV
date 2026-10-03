import { describe, expect, it } from 'vitest';
import {
  calculateLayeredScaleTransfer,
  solveLinearStackNetwork,
} from '@metrev/electrochem-models';
import {
  scaleTransferInputSchema,
  stackNetworkInputSchema,
  type StackNetworkInput,
  type ScaleTransferInput,
} from '@metrev/domain-contracts';
import { MemoryEvaluationRepository } from '@metrev/database';
import { buildApp } from '../../apps/api-server/src/app';

const q = (value: number, unit: string) => ({
  value,
  unit,
  source_kind: 'test_fixture' as const,
  source_ref: 'test-fixture://analytical-stack',
});
function network(): StackNetworkInput {
  return stackNetworkInputSchema.parse({
    contract_version: 'stack-network-linear-input-v1',
    model_id: 'stack-network-linear-development-v1',
    system: 'MFC',
    nodes: ['ground', 'terminal'],
    reference_node: 'ground',
    auxiliary_power: q(0, 'W'),
    branches: [
      {
        id: 'cell',
        from: 'ground',
        to: 'terminal',
        kind: 'reduced_cell',
        resistance: q(1, 'ohm'),
        emf: q(1, 'V'),
        cell_run_ref: 'test-fixture://cell-source',
      },
      {
        id: 'load',
        from: 'terminal',
        to: 'ground',
        kind: 'load',
        resistance: q(9, 'ohm'),
      },
    ],
  });
}
function transfer(): ScaleTransferInput {
  return scaleTransferInputSchema.parse({
    contract_version: 'scale-transfer-layered-input-v1',
    source_scale: 'micro_porous_electrode',
    target_scale: 'cell',
    source_run_ref: 'test-fixture://micro',
    source_geometry_sha256: 'a'.repeat(64),
    target_domain_tag: 'anode',
    property: 'effective_diffusivity',
    species_id: 'substrate',
    method: 'parallel_layer_arithmetic',
    direction_axis: 'y',
    method_source_ref: 'test-fixture://ideal-layers',
    samples: [
      {
        id: 'a',
        property_value: q(1e-9, 'm2/s'),
        volume_fraction: q(0.5, '1'),
      },
      {
        id: 'b',
        property_value: q(3e-9, 'm2/s'),
        volume_fraction: q(0.5, '1'),
      },
    ],
    validity: {
      temperature: { minimum: q(290, 'K'), maximum: q(310, 'K') },
      condition_note: 'Synthetic ideal layers only',
    },
    target_temperature: q(300, 'K'),
  });
}
describe('separate scale numerical development', () => {
  it('reproduces series and parallel circuits with KCL and electrical conservation', () => {
    const one = solveLinearStackNetwork(network());
    expect(one.node_potential_V.terminal).toBeCloseTo(0.9, 12);
    expect(one.branches[0].current_A).toBeCloseTo(0.1, 12);
    expect(one.accounting.load_power_W).toBeCloseTo(0.09, 12);
    expect(one.conservation.passed).toBe(true);
    const series = network();
    series.nodes.push('middle');
    series.branches[0].to = 'middle';
    series.branches.push({
      ...series.branches[0],
      id: 'cell2',
      from: 'middle',
      to: 'terminal',
    });
    const result = solveLinearStackNetwork(series);
    expect(result.branches[0].current_A).toBeCloseTo(2 / 11, 12);
    expect(result.node_potential_V.terminal).toBeCloseTo(18 / 11, 12);
    const parallel = network();
    parallel.branches.push({ ...parallel.branches[0], id: 'cell2' });
    expect(
      solveLinearStackNetwork(parallel).node_potential_V.terminal,
    ).toBeCloseTo(9 / 9.5, 12);
  });
  it('resolves actual shunt/contact paths and reversed cell absorption', () => {
    const n = network();
    n.branches.push({
      id: 'shunt',
      from: 'terminal',
      to: 'ground',
      kind: 'shunt',
      resistance: q(9, 'ohm'),
    });
    const shunted = solveLinearStackNetwork(n);
    expect(shunted.branches[0].current_A).toBeGreaterThan(0.1);
    expect(
      shunted.branches.find((b) => b.id === 'shunt')!.current_A,
    ).toBeGreaterThan(0);
    expect(shunted.conservation.passed).toBe(true);
    n.branches.push({
      id: 'bias',
      from: 'ground',
      to: 'terminal',
      kind: 'supply',
      resistance: q(0.1, 'ohm'),
      emf: q(2, 'V'),
    });
    n.system = 'MEC';
    const biased = solveLinearStackNetwork(n);
    expect(biased.accounting.mfc_generated_power_W).toBeNull();
    expect(biased.accounting.supply_electrical_input_W).toBeGreaterThan(0);
    expect(biased.branches[0].absorbed_source_power_W).toBeGreaterThan(0);
    expect(biased.conservation.passed).toBe(true);
  });
  it('rejects floating, source-free, dimensionally invalid and ill-conditioned networks', () => {
    const n = network();
    n.nodes.push('floating');
    expect(() => solveLinearStackNetwork(n)).toThrow();
    const missing = network();
    delete missing.branches[0].cell_run_ref;
    expect(() => solveLinearStackNetwork(missing)).toThrow();
    const invalid = network();
    invalid.branches[0].resistance.value = 0;
    expect(() => solveLinearStackNetwork(invalid)).toThrow();
    const unit = network();
    unit.branches[0].resistance.unit = 'V';
    expect(() => solveLinearStackNetwork(unit)).toThrow();
    const overflow = network();
    overflow.branches[0].emf!.value = 1e308;
    expect(() => solveLinearStackNetwork(overflow)).toThrow('Nonfinite');
  });
  it('computes analytical directional homogenization without extrapolation or renormalization', () => {
    const input = transfer();
    const parallel = calculateLayeredScaleTransfer(input);
    expect(parallel.value?.value).toBeCloseTo(2e-9, 16);
    input.method = 'series_layer_harmonic';
    const series = calculateLayeredScaleTransfer(input);
    expect(series.value?.value).toBeCloseTo(1.5e-9, 16);
    expect(series.provenance.samples).toEqual(input.samples);
    input.target_temperature.value = 311;
    expect(calculateLayeredScaleTransfer(input).status).toBe(
      'outside_validity_range',
    );
    input.samples[0].volume_fraction.value = 0.6;
    expect(() => calculateLayeredScaleTransfer(input)).toThrow();
    const area = transfer();
    area.property = 'accessible_reactive_area';
    delete area.species_id;
    area.method = 'volume_weighted_reactive_area';
    area.samples.forEach((s, i) => (s.property_value = q(i * 10, 'm2/m3')));
    expect(calculateLayeredScaleTransfer(area).value?.value).toBe(5);
    const small = transfer();
    small.method = 'series_layer_harmonic';
    small.samples.forEach((sample) => {
      sample.property_value.value = 1e-310;
    });
    expect(calculateLayeredScaleTransfer(small).value?.value).toBe(1e-310);
  });
  it('exposes authenticated development calculations without promoting decision evidence', async () => {
    let role: 'ANALYST' | 'VIEWER' = 'VIEWER';
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      rateLimit: false,
      sessionResolver: async () => ({
        userId: 'test-user',
        email: 'test@example.invalid',
        role,
        sessionId: 's',
        sessionToken: 't',
      }),
    });
    try {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/modeling/stack-network',
            payload: network(),
          })
        ).statusCode,
      ).toBe(403);
      role = 'ANALYST';
      const result = await app.inject({
        method: 'POST',
        url: '/api/modeling/stack-network',
        payload: network(),
      });
      expect(result.statusCode).toBe(200);
      expect(result.json()).toMatchObject({
        status: 'converged',
        decision_eligible: false,
        independent_validation: false,
      });
      const mapped = await app.inject({
        method: 'POST',
        url: '/api/modeling/scale-transfer',
        payload: transfer(),
      });
      expect(mapped.statusCode).toBe(200);
      expect(mapped.json().value.source_kind).toBe('modeled');
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/modeling/stack-network',
            payload: {},
          })
        ).statusCode,
      ).toBe(400);
    } finally {
      await app.close();
    }
  });
});
