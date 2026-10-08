import { describe, expect, it } from 'vitest';
import {
  buildReportModelingSection,
  coupledCell1dInputSchema,
  normalizeCaseInput,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import { MemoryEvaluationRepository } from '@metrev/database';
import type { FastifyBaseLogger } from 'fastify';
import {
  prepareUniformDonnanMembrane1d,
  runConfiguredElectrochemicalModel,
  solveCoupledCell1d,
  type UniformDonnanMembraneInput,
} from '@metrev/electrochem-models';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';
import { fixture, q } from '../fixtures/coupled-cell-1d';
import rawCase from '../fixtures/raw-case-input.json';

function membrane(n = 12, charge = -50): UniformDonnanMembraneInput {
  const base = fixture(n).membrane;
  return {
    ...base,
    species: base.species.map((ion, i) => ({
      ...ion,
      freeDiffusivity: q(i === 0 ? 1e-9 : 2e-9, 'm2/s'),
    })),
    donnan: {
      version: 'uniform-binary-ideal-donnan-v1',
      fixedChargeDensity: q(charge, 'mol/m3'),
      partitionCoefficients: { cation: q(1.2, '1'), anion: q(0.8, '1') },
    },
  };
}

describe('uniform binary fixed-charge membrane in the shared 1D engine', () => {
  it.each([-50, 0, 50])(
    'agrees with independent quadratic concentrations, conductivity and NP current at X=%s',
    (charge) => {
      const input = membrane(12, charge);
      const prepared = prepareUniformDonnanMembrane1d(input);
      const result = prepared.solve(1e-4);
      const closure = result.uniformDonnan!;
      // Independent quadratic root, not the runtime's dimensionless asinh/log solution.
      const root = Math.sqrt(charge * charge + 4 * 120 * 80);
      const concentrations = [(root - charge) / 2, (root + charge) / 2];
      const F = 96485.33212,
        R = 8.314462618;
      const path = (input.thickness.value / 2) * (2 / 0.4 + 2 / 0.6);
      const weighted = concentrations[0] * 1e-9 + concentrations[1] * 2e-9;
      const resistance = (R * 298 * path) / (F * F * 0.01 * weighted);
      expect(prepared.resistanceOhm).toBeCloseTo(resistance, 8);
      expect(closure.netInterfaceVoltageV).toBe(0);
      expect(closure.leftMembraneMinusSolutionPotentialV).toBe(
        closure.rightMembraneMinusSolutionPotentialV,
      );
      expect(closure.maximumVolumeChargeResidualMolM3).toBeLessThan(1e-9);
      expect(result.totalIonicCurrentA).toBeCloseTo(1e-4, 12);
      for (const [index, ion] of result.species.entries()) {
        expect(
          ion.concentrationMolM3.every(
            (c) => Math.abs(c - concentrations[index]) < 1e-9,
          ),
        ).toBe(true);
        const fraction =
          ((index === 0 ? 1e-9 : 2e-9) * concentrations[index]) / weighted;
        expect(closure.species[index].currentFraction).toBeCloseTo(
          fraction,
          12,
        );
        expect(ion.currentA).toBeCloseTo(1e-4 * fraction, 12);
        expect(ion.fluxResidualMolM2S).toBeLessThan(1e-17);
        expect(ion.fluxMolM2S).toBeCloseTo(
          (1e-4 * fraction) / (ion.name === 'cation' ? F * 0.01 : -F * 0.01),
          12,
        );
      }
    },
  );

  it('has no equilibrium current, reverses transport with current and keeps charge/flux under three-grid refinement', () => {
    for (const n of [4, 8, 16]) {
      const prepared = prepareUniformDonnanMembrane1d(membrane(n));
      const zero = prepared.solve(0),
        forward = prepared.solve(1e-4),
        reverse = prepared.solve(-1e-4);
      expect(Math.abs(zero.totalIonicCurrentA)).toBeLessThan(1e-14);
      expect(
        zero.species.every((ion) => Math.abs(ion.fluxMolM2S) < 1e-18),
      ).toBe(true);
      expect(prepared.resistanceOhm).toBeCloseTo(
        prepareUniformDonnanMembrane1d(membrane(32)).resistanceOhm,
        12,
      );
      for (const [i, ion] of forward.species.entries()) {
        expect(ion.currentA).toBeCloseTo(-reverse.species[i].currentA, 12);
        expect(ion.fluxResidualMolM2S).toBeLessThan(1e-17);
      }
      expect(
        forward.uniformDonnan!.maximumVolumeChargeResidualMolM3,
      ).toBeLessThan(1e-9);
    }
  });

  it('recovers the unchanged uncharged equal-diffusivity cell when X=0 and K=1', () => {
    const base = fixture();
    const input = {
      ...base,
      membrane: {
        ...base.membrane,
        donnan: {
          ...membrane().donnan,
          fixedChargeDensity: q(0, 'mol/m3'),
          partitionCoefficients: { cation: q(1, '1'), anion: q(1, '1') },
        },
      },
    };
    const continuous = solveCoupledCell1d(base),
      donnan = solveCoupledCell1d(input);
    expect(donnan.currentA).toBeCloseTo(continuous.currentA, 14);
    expect(donnan.membraneVoltageDropV).toBeCloseTo(
      continuous.membraneVoltageDropV,
      12,
    );
    expect(
      donnan.membrane.uniformDonnan!.leftMembraneMinusSolutionPotentialV,
    ).toBe(0);
  });

  it('feeds the resolved membrane resistance back into the cell circuit when membrane loss matters', () => {
    const cell = fixture();
    cell.membrane = membrane();
    cell.membrane.area = q(1e-5, 'm2');
    cell.membrane.thickness = q(0.001, 'm');
    cell.membrane.species = cell.membrane.species.map((ion) => ({
      ...ion,
      leftConcentration: q(1, 'mol/m3'),
      rightConcentration: q(1, 'mol/m3'),
    }));
    cell.circuit = { kind: 'external_load', resistance: q(1, 'ohm') };
    const charged = solveCoupledCell1d(cell);
    cell.membrane.donnan!.fixedChargeDensity = q(0, 'mol/m3');
    const uncharged = solveCoupledCell1d(cell);
    expect(charged.membrane.uniformDonnan!.membraneResistanceOhm).toBeLessThan(
      uncharged.membrane.uniformDonnan!.membraneResistanceOhm / 5,
    );
    expect(charged.currentA).toBeGreaterThan(uncharged.currentA * 1.1);
    expect(Math.abs(charged.circuitResidualV)).toBeLessThan(1e-8);
    expect(Math.abs(uncharged.ionicChargeResidualA)).toBeLessThan(1e-10);
  });

  it.each(['MFC', 'MEC'] as const)(
    'couples source-bound fixed charge to the %s circuit and persisted case result',
    async (system) => {
      const input = fixture();
      input.membrane = membrane();
      input.membrane.donnan!.fixedChargeDensity.source_ref =
        'test-fixture://distinct-fixed-charge-source';
      input.system = system;
      if (system === 'MEC') {
        input.cathode = {
          ...input.cathode,
          oxygen: undefined,
          hydrogen: {
            faradayEfficiency: q(0.8, '1'),
            captureFraction: q(0.75, '1'),
          },
        };
        input.circuit = { kind: 'applied_voltage', voltage: q(0.9, 'V') };
      }
      const configured = runConfiguredElectrochemicalModel({
        model: 'coupled-cell-1d-restricted-v1',
        cell: input,
      });
      if (configured.model !== 'coupled-cell-1d-restricted-v1')
        throw new Error('Wrong dispatch');
      expect(configured.result.currentA).toBeGreaterThan(0);
      expect(Math.abs(configured.result.ionicChargeResidualA)).toBeLessThan(
        1e-10,
      );
      expect(Math.abs(configured.result.circuitResidualV)).toBeLessThan(1e-8);
      expect(configured.composition.bindings).toContainEqual(
        expect.objectContaining({
          implementation_id:
            'uniform-donnan-membrane-1d.electroneutral-current',
          equation_id: 'EQ-MEM-1D-002',
        }),
      );
      expect(configured.result.electricalBoundary).toBe(
        system === 'MFC' ? 'generated' : 'consumed',
      );
      const repository = new MemoryEvaluationRepository();
      try {
        const raw = rawCaseInputSchema.parse({
          ...rawCase,
          technology_family:
            system === 'MFC'
              ? 'microbial_fuel_cell'
              : 'microbial_electrolysis_cell',
          mechanistic_model: {
            model_version: 'coupled-cell-1d-restricted-v1',
            model_fidelity_id: 'coupled-cell-1d-restricted-v1',
            system_type: system,
            cell_1d: input,
          },
        });
        expect(
          normalizeCaseInput(raw).mechanistic_model?.cell_1d?.membrane.donnan
            ?.fixedChargeDensity.source_ref,
        ).toBe('test-fixture://distinct-fixed-charge-source');
        const saved = await createPersistedCaseEvaluation({
          rawInput: raw,
          evaluationRepository: repository,
          environment: 'test',
          actor: {
            userId: 'charged-1d',
            email: 'test@example.invalid',
            role: 'ANALYST',
            sessionId: 'test',
            sessionToken: 'test',
          },
          logger: { warn: () => undefined } as Pick<FastifyBaseLogger, 'warn'>,
        });
        const reloaded = await repository.getEvaluation(saved.evaluation_id);
        const enrichment = reloaded!.simulation_enrichment!;
        expect(enrichment.status).toBe('completed');
        expect(enrichment.series).toHaveLength(5);
        expect(
          enrichment.series.find(
            (s) => s.series_id === 'development-1d:membrane-potential',
          )?.y_axis.unit,
        ).toBe('V');
        expect(enrichment.provenance.source_refs).toContain(
          'test-fixture://distinct-fixed-charge-source',
        );
        expect(
          enrichment.derived_observations.every(
            (o) => o.decision_relevance === 'informational',
          ),
        ).toBe(true);
        const report = buildReportModelingSection(enrichment)!;
        expect(
          report.derived_observations.every((o) => o.source_kind === 'modeled'),
        ).toBe(true);
        expect(
          report.derived_observations.find(
            (o) => o.key === 'membrane_volume_charge_residual_mol_m3',
          )?.value,
        ).toBeLessThan(1e-9);
        expect(
          enrichment.derived_observations.find(
            (o) => o.key === 'membrane_ion_0_current_a',
          )?.value,
        ).toBeCloseTo(configured.result.membrane.species[0].currentA, 12);
      } finally {
        await repository.disconnect();
      }
    },
  );

  it('rejects missing provenance, extra species/K, asymmetric or non-electroneutral reservoirs and wrong charge units', () => {
    const base = membrane();
    for (const invalid of [
      {
        ...base,
        donnan: {
          ...base.donnan,
          fixedChargeDensity: {
            ...base.donnan.fixedChargeDensity,
            source_ref: '',
          },
        },
      },
      {
        ...base,
        donnan: {
          ...base.donnan,
          partitionCoefficients: {
            ...base.donnan.partitionCoefficients,
            unknown: q(1, '1'),
          },
        },
      },
      {
        ...base,
        species: base.species.map((ion, i) =>
          i ? ion : { ...ion, rightConcentration: q(99, 'mol/m3') },
        ),
      },
      {
        ...base,
        species: base.species.map((ion, i) =>
          i ? { ...ion, valence: q(2, '1') } : ion,
        ),
      },
    ]) {
      expect(() => prepareUniformDonnanMembrane1d(invalid)).toThrow(RangeError);
      expect(
        coupledCell1dInputSchema.safeParse({ ...fixture(), membrane: invalid })
          .success,
      ).toBe(false);
    }
    expect(
      coupledCell1dInputSchema.safeParse({
        ...fixture(),
        membrane: {
          ...base,
          donnan: { ...base.donnan, fixedChargeDensity: q(-50, 'C/m3') },
        },
      }).success,
    ).toBe(false);
    expect(() =>
      prepareUniformDonnanMembrane1d({
        ...base,
        donnan: {
          ...base.donnan,
          partitionCoefficients: { cation: q(0, '1'), anion: q(1, '1') },
        },
      }),
    ).toThrow(RangeError);
  });
});
