import { describe, expect, it } from 'vitest';
import { MemoryEvaluationRepository } from '@metrev/database';
import type { SessionActor } from '@metrev/auth';
import { buildApp } from '../../apps/api-server/src/app';

const q = <U extends string>(value: number, unit: U) => ({
  value,
  unit,
  source_kind: 'test_fixture' as const,
  source_ref: 'test-fixture://modeling-api',
});

function cell() {
  const anodeCell = () => ({
    porosity: q(0.5, '1'),
    tortuosity: q(2, '1'),
    specificSurfaceArea: q(1000, 'm2/m3'),
    accessibleAreaFraction: q(0.5, '1'),
    anodePotential: q(0.1, 'V'),
  });
  const ion = (name: string, z: number) => ({
    name,
    valence: q(z, '1'),
    freeDiffusivity: q(1e-9, 'm2/s'),
    leftConcentration: q(100, 'mol/m3'),
    rightConcentration: q(100, 'mol/m3'),
  });
  return {
    system: 'MFC',
    anode: {
      thickness: q(0.001, 'm'),
      projectedArea: q(0.01, 'm2'),
      freeSubstrateDiffusivity: q(1e-9, 'm2/s'),
      bulkSubstrateConcentration: q(1, 'mol/m3'),
      maximumSurfaceReactionFlux: q(1e-8, 'mol/(m2 s)'),
      halfSaturationConcentration: q(1, 'mol/m3'),
      halfRateAnodePotential: q(0, 'V'),
      temperature: q(298, 'K'),
      electronsPerSubstrateMolecule: q(8, '1'),
      cells: [anodeCell(), anodeCell()],
    },
    membrane: {
      thickness: q(0.0002, 'm'),
      area: q(0.01, 'm2'),
      temperature: q(298, 'K'),
      segments: [
        { porosity: q(0.5, '1'), tortuosity: q(2, '1') },
        { porosity: q(0.5, '1'), tortuosity: q(2, '1') },
      ],
      species: [ion('cation', 1), ion('anion', -1)],
    },
    electrolyteResistance: q(2, 'ohm'),
    contactResistance: q(1, 'ohm'),
    reversibleCellVoltage: q(0.65, 'V'),
    anodeTransferCoefficient: q(0.5, '1'),
    maximumAnodeOverpotential: q(1, 'V'),
    cathode: {
      activeArea: q(0.01, 'm2'),
      exchangeCurrentDensity: q(0.01, 'A/m2'),
      transferCoefficient: q(0.5, '1'),
      oxygen: {
        concentration: q(0.25, 'mol/m3'),
        massTransferCoefficient: q(1e-4, 'm/s'),
      },
    },
    circuit: { kind: 'external_load', resistance: q(1000, 'ohm') },
  };
}

const analyst: SessionActor = {
  userId: 'analyst-1',
  email: 'analyst@example.invalid',
  role: 'ANALYST',
  sessionId: 'session-1',
  sessionToken: 'token-1',
};

describe('read-only coupled cell modeling API', () => {
  it('exposes the same explicit composition and missing modules through an authenticated API', async () => {
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      rateLimit: false,
      sessionResolver: async () => analyst,
    });
    try {
      const result = await app.inject({
        method: 'POST',
        url: '/api/modeling/composition',
        payload: { modelId: 'biofilm-2d-electrode-research-v1', system: 'MFC' },
      });
      expect(result.statusCode).toBe(200);
      expect(result.json()).toMatchObject({
        status: 'not_implemented',
        missingModules: expect.arrayContaining(['spatial_geometry_mesh']),
      });
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/modeling/composition',
            payload: { modelId: '', system: 'MFC' },
          })
        ).statusCode,
      ).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('requires analyst role and validates physical and source boundaries', async () => {
    let actor: SessionActor | null = null;
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      rateLimit: false,
      sessionResolver: async () => actor,
    });
    try {
      const request = (payload: unknown) =>
        app.inject({
          method: 'POST',
          url: '/api/modeling/coupled-cell-1d',
          payload,
        });
      expect((await request(cell())).statusCode).toBe(401);
      actor = { ...analyst, role: 'VIEWER' };
      expect((await request(cell())).statusCode).toBe(403);
      actor = analyst;
      const incomplete = cell();
      delete (incomplete.anode as Partial<typeof incomplete.anode>).thickness;
      expect((await request(incomplete)).statusCode).toBe(400);
      const incompatible = cell();
      incompatible.membrane.species[0].rightConcentration = q(99, 'mol/m3');
      const rejected = await request(incompatible);
      expect(rejected.statusCode).toBe(422);
      expect(rejected.json().error).toBe('unsupported_model_boundary');
      const result = await request(cell());
      expect(result.statusCode).toBe(200);
      expect(result.json()).toMatchObject({
        model: 'coupled-cell-1d-restricted-v1',
        result: {
          system: 'MFC',
          modelStatus: 'development_only',
          electricalBoundary: 'generated',
        },
      });
      expect(result.json().result.currentA).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });
});
