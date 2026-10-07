import { describe, expect, it } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { SessionActor } from '@metrev/auth';
import { MemoryEvaluationRepository } from '@metrev/database';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';
import { fixture, q } from '../fixtures/coupled-cell-1d';
import rawCaseFixture from '../fixtures/raw-case-input.json';
import {
  normalizeCaseInput,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import {
  evaluateSimulationEnrichment,
  runConfiguredElectrochemicalModel,
  solveCoupledCell1d,
} from '@metrev/electrochem-models';

describe('restricted coupled planar cell', () => {
  it('persists the 1D development result through the same evaluation repository', async () => {
    const repository = new MemoryEvaluationRepository();
    const actor: SessionActor = {
      userId: 'test-1d',
      email: 'test@example.invalid',
      role: 'ANALYST',
      sessionId: 'test-session',
      sessionToken: 'test-token',
    };
    try {
      const evaluation = await createPersistedCaseEvaluation({
        rawInput: rawCaseInputSchema.parse({
          ...rawCaseFixture,
          mechanistic_model: {
            model_version: 'coupled-cell-1d-restricted-v1',
            model_fidelity_id: 'coupled-cell-1d-restricted-v1',
            system_type: 'MFC',
            cell_1d: fixture(),
          },
        }),
        actor,
        evaluationRepository: repository,
        logger: { warn: () => undefined } as Pick<FastifyBaseLogger, 'warn'>,
        environment: 'test',
      });
      const saved = await repository.getEvaluation(evaluation.evaluation_id);
      expect(saved?.simulation_enrichment?.model_version).toBe(
        'coupled-cell-1d-restricted-v1',
      );
      expect(saved?.simulation_enrichment?.series[0].points).toHaveLength(12);
      expect(saved?.simulation_enrichment?.series).toHaveLength(2);
      expect(
        saved?.simulation_enrichment?.derived_observations.some(
          (entry) => entry.key === 'anode_substrate_consumption_mol_s',
        ),
      ).toBe(true);
      expect(
        saved?.simulation_enrichment?.derived_observations.every(
          (entry) => entry.decision_relevance === 'informational',
        ),
      ).toBe(true);
    } finally {
      await repository.disconnect();
    }
  });

  it('runs through normalized case evaluation without promoting results to decision evidence', () => {
    const raw = rawCaseInputSchema.parse({
      ...rawCaseFixture,
      mechanistic_model: {
        model_version: 'coupled-cell-1d-restricted-v1',
        model_fidelity_id: 'coupled-cell-1d-restricted-v1',
        system_type: 'MFC',
        cell_1d: fixture(),
      },
    });
    const result = evaluateSimulationEnrichment({
      normalizedCase: normalizeCaseInput(raw),
    });
    expect(result.status).toBe('completed');
    expect(result.model_version).toBe('coupled-cell-1d-restricted-v1');
    expect(
      result.derived_observations.every(
        (entry) => entry.decision_relevance === 'informational',
      ),
    ).toBe(true);
    expect(
      result.derived_observations.find(
        (entry) => entry.key === 'mfc_electrical_generation_w',
      )?.value,
    ).toBeGreaterThan(0);
    expect(result.series[0].points).toHaveLength(12);
    expect(result.series[1].points).toHaveLength(12);
    expect(result.series[1].y_axis.unit).toBe('mol/(m3 s)');
    expect(
      result.derived_observations.find(
        (entry) => entry.key === 'anode_substrate_consumption_mol_s',
      )?.value,
    ).toBeGreaterThan(0);
    expect(result.provenance.source_refs).toContain(
      'test-fixture://coupled-cell-1d',
    );

    const mismatch = evaluateSimulationEnrichment({
      normalizedCase: normalizeCaseInput(
        rawCaseInputSchema.parse({
          ...raw,
          mechanistic_model: {
            ...raw.mechanistic_model,
            system_type: 'MEC',
          },
        }),
      ),
    });
    expect(mismatch.status).toBe('insufficient_data');
    expect(mismatch.series).toHaveLength(0);
  });

  it('selects the declared 0D or 1D equations through one engine entrypoint', () => {
    const oneD = runConfiguredElectrochemicalModel({
      model: 'coupled-cell-1d-restricted-v1',
      cell: fixture(),
    });
    if (oneD.model !== 'coupled-cell-1d-restricted-v1')
      throw new Error('Wrong model');
    expect(oneD.result.modelStatus).toBe('development_only');
    expect(oneD.composition.contract_version).toBe('physics-runtime-plan-v2');
    expect(oneD.composition.bindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module_id: 'reaction',
          implementation_id: 'porous-anode-1d.nernst-monod-electron-equivalent',
          equation_ids: ['EQ-BIO-002', 'EQ-RX-002'],
          reaction_law: expect.objectContaining({
            substrate_basis: 'mol_substrate',
            rate_observation_key: 'anode_substrate_reaction_rate_mol_m3_s',
            rate_series_id: 'development-1d:anode-reaction-rate',
            stoichiometry_status:
              'substrate_electron_equivalent_without_molecular_products',
          }),
        }),
      ]),
    );
    const zeroD = runConfiguredElectrochemicalModel({
      model: 'coupled-0d-dae-v1',
      normalizedCase: normalizeCaseInput(
        rawCaseInputSchema.parse(rawCaseFixture),
      ),
    });
    if (zeroD.model !== 'coupled-0d-dae-v1') throw new Error('Wrong model');
    expect(zeroD.result.status).toBe('completed');
    expect(zeroD.composition.contract_version).toBe('physics-runtime-plan-v2');
    expect(zeroD.composition.bindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module_id: 'reaction',
          implementation_id: 'mechanistic.monod-cod-electron-equivalent',
          equation_ids: ['EQ-BIO-001', 'EQ-RX-002'],
          reaction_law: expect.objectContaining({
            substrate_basis: 'kgCOD',
            rate_observation_key: 'cod_uptake_rate_kgcod_m3_s',
            rate_series_id: 'mechanistic:cod_uptake_rate_kgcod_m3_s',
            stoichiometry_status:
              'lumped_COD_equivalent_without_molecular_products',
          }),
        }),
      ]),
    );
    expect(() =>
      runConfiguredElectrochemicalModel({
        model: 'coupled-0d-dae-v1',
        normalizedCase: normalizeCaseInput(
          rawCaseInputSchema.parse({
            ...rawCaseFixture,
            mechanistic_model: {
              model_version: 'coupled-cell-1d-restricted-v1',
              model_fidelity_id: 'coupled-cell-1d-restricted-v1',
              system_type: 'MFC',
              cell_1d: fixture(),
            },
          }),
        ),
      }),
    ).toThrow(/cannot execute selected fidelity/);
  });

  it.each(['MFC', 'MEC'] as const)(
    'persists a zero-reaction %s case with zero cell current and local rates',
    (system) => {
      const cell = fixture();
      cell.system = system;
      cell.anode.maximumSurfaceReactionFlux = q(0, 'mol/(m2 s)');
      if (system === 'MEC') {
        const hydrogen = {
          faradayEfficiency: q(0.8, '1'),
          captureFraction: q(0.75, '1'),
        };
        cell.circuit = {
          kind: 'applied_voltage',
          voltage: q(0.9, 'V'),
        };
        cell.cathode = {
          ...cell.cathode,
          oxygen: undefined,
          hydrogen,
        };
      }
      const raw = rawCaseInputSchema.parse({
        ...rawCaseFixture,
        technology_family:
          system === 'MFC'
            ? 'microbial_fuel_cell'
            : 'microbial_electrolysis_cell',
        mechanistic_model: {
          model_version: 'coupled-cell-1d-restricted-v1',
          model_fidelity_id: 'coupled-cell-1d-restricted-v1',
          system_type: system,
          cell_1d: cell,
        },
      });
      const result = evaluateSimulationEnrichment({
        normalizedCase: normalizeCaseInput(raw),
      });
      const value = (key: string) =>
        result.derived_observations.find((entry) => entry.key === key)?.value;
      const reactionSeries = result.series.find(
        (entry) => entry.series_id === 'development-1d:anode-reaction-rate',
      );

      expect(result.status).toBe('completed');
      expect(value('cell_current_a')).toBe(0);
      expect(value('anode_substrate_consumption_mol_s')).toBe(0);
      expect(value('anode_substrate_reaction_rate_mol_m3_s')).toBe(0);
      expect(value('anode_faradaic_current_a')).toBe(0);
      expect(reactionSeries?.points.every((point) => point.y === 0)).toBe(true);
      if (system === 'MEC') expect(value('hydrogen_gross_mol_s')).toBe(0);
      expect(result.input_snapshot).toMatchObject({
        physics_composition: {
          bindings: expect.arrayContaining([
            expect.objectContaining({ module_id: 'reaction' }),
          ]),
        },
      });
    },
  );

  it('closes one current through anode, ions, cathode and MFC load', () => {
    const result = solveCoupledCell1d(fixture());
    expect(result.currentA).toBeGreaterThan(0);
    expect(result.cellVoltageV).toBeCloseTo(result.currentA * 1000, 12);
    expect(result.electricalPowerW).toBeCloseTo(
      result.currentA ** 2 * 1000,
      12,
    );
    expect(result.electricalBoundary).toBe('generated');
    expect(Math.abs(result.electronBalanceResidualA)).toBeLessThan(1e-12);
    expect(Math.abs(result.ionicChargeResidualA)).toBeLessThan(1e-10);
    expect(Math.abs(result.circuitResidualV)).toBeLessThan(1e-9);
    expect(Math.abs(result.anode.balanceResidualMolS)).toBeLessThan(1e-15);
    expect(result.anode.cells[0].accessibleAreaM2).toBeLessThan(
      result.anode.cells.at(-1)!.accessibleAreaM2,
    );
    expect(
      result.membrane.species.every((s) => s.fluxResidualMolM2S < 1e-14),
    ).toBe(true);
  });

  it('responds to circuit, porous area and membrane transport and refines the mesh', () => {
    const base = fixture();
    const nominal = solveCoupledCell1d(base);
    const highLoad = solveCoupledCell1d({
      ...base,
      circuit: { kind: 'external_load', resistance: q(4000, 'ohm') },
    });
    expect(highLoad.currentA).toBeLessThan(nominal.currentA);
    const blocked = solveCoupledCell1d({
      ...base,
      anode: {
        ...base.anode,
        cells: base.anode.cells.map((cell) => ({
          ...cell,
          accessibleAreaFraction: q(0, '1'),
        })),
      },
    });
    expect(blocked.currentA).toBe(0);
    const poorMembrane = solveCoupledCell1d({
      ...base,
      membrane: {
        ...base.membrane,
        segments: base.membrane.segments.map((segment) => ({
          ...segment,
          porosity: q(0.1, '1'),
        })),
      },
    });
    expect(poorMembrane.currentA).toBeLessThan(nominal.currentA);
    const oxygenLimited = solveCoupledCell1d({
      ...base,
      cathode: {
        ...base.cathode,
        oxygen: { ...base.cathode.oxygen!, concentration: q(0.005, 'mol/m3') },
      },
    });
    expect(oxygenLimited.currentA).toBeLessThan(nominal.currentA);
    expect(oxygenLimited.cathodeMassTransferOverpotentialV).toBeGreaterThan(0);
    const fine = solveCoupledCell1d(fixture(48));
    expect(
      Math.abs(fine.currentA - nominal.currentA) / fine.currentA,
    ).toBeLessThan(0.03);
  });

  it('closes MEC input and distinguishes Faradaic from captured hydrogen', () => {
    const base = fixture();
    const result = solveCoupledCell1d({
      ...base,
      system: 'MEC',
      circuit: { kind: 'applied_voltage', voltage: q(0.9, 'V') },
      cathode: {
        ...base.cathode,
        oxygen: undefined,
        hydrogen: {
          faradayEfficiency: q(0.8, '1'),
          captureFraction: q(0.75, '1'),
        },
      },
    });
    expect(result.currentA).toBeGreaterThan(0);
    expect(result.cellVoltageV).toBe(0.9);
    expect(result.electricalPowerW).toBeCloseTo(result.currentA * 0.9, 12);
    expect(result.electricalBoundary).toBe('consumed');
    expect(result.hydrogenGrossMolS).toBeCloseTo(
      (result.currentA * 0.8) / (2 * 96485.33212),
      16,
    );
    expect(result.hydrogenCapturedMolS).toBeCloseTo(
      result.hydrogenGrossMolS * 0.75,
      16,
    );
    expect(Math.abs(result.ionicChargeResidualA)).toBeLessThan(1e-10);
    expect(Math.abs(result.circuitResidualV)).toBeLessThan(1e-9);
  });

  it('returns zero current for an oxygen-free MFC and rejects absent or incompatible boundaries', () => {
    const base = fixture();
    expect(
      solveCoupledCell1d({
        ...base,
        cathode: {
          ...base.cathode,
          oxygen: { ...base.cathode.oxygen!, concentration: q(0, 'mol/m3') },
        },
      }).currentA,
    ).toBe(0);
    expect(() =>
      solveCoupledCell1d({
        ...base,
        membrane: {
          ...base.membrane,
          species: base.membrane.species.map((s, i) =>
            i === 0 ? { ...s, rightConcentration: q(90, 'mol/m3') } : s,
          ),
        },
      }),
    ).toThrow(/equal positive concentrations/);
    expect(() =>
      solveCoupledCell1d({
        ...base,
        membrane: {
          ...base.membrane,
          species: base.membrane.species.map((s, i) =>
            i === 0 ? { ...s, freeDiffusivity: q(2e-9, 'm2/s') } : s,
          ),
        },
      }),
    ).toThrow(/equal ion diffusivities/);
    expect(() =>
      solveCoupledCell1d({
        ...base,
        electrolyteResistance: {
          ...base.electrolyteResistance,
          source_ref: '',
        },
      }),
    ).toThrow(/electrolyteResistance.source_ref/);
    expect(() =>
      solveCoupledCell1d({
        ...base,
        anode: {
          ...base.anode,
          thickness: { ...base.anode.thickness, uncertainty: 0.0001 },
        },
      }),
    ).toThrow(/uncertainty_unit/);
    expect(
      solveCoupledCell1d({
        ...base,
        anode: {
          ...base.anode,
          thickness: {
            ...base.anode.thickness,
            uncertainty: 0.0001,
            uncertainty_unit: 'm',
          },
        },
      }).currentA,
    ).toBeGreaterThan(0);
    expect(() =>
      solveCoupledCell1d({
        ...base,
        anode: {
          ...base.anode,
          membrane: {
            thickness: q(0.0002, 'm'),
            ionicConductivity: q(1, 'S/m'),
            activeArea: q(0.01, 'm2'),
          },
        },
      }),
    ).toThrow(/double counting/);
    expect(() =>
      solveCoupledCell1d({ ...base, maximumAnodeOverpotential: q(0.01, 'V') }),
    ).toThrow(/outside declared kinetic domain/);
  });
});
