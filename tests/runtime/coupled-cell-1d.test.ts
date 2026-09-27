import { describe, expect, it } from 'vitest';
import rawCaseFixture from '../fixtures/raw-case-input.json';
import {
  normalizeCaseInput,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import {
  runConfiguredElectrochemicalModel,
  solveCoupledCell1d,
  type CoupledCell1dInput,
} from '@metrev/electrochem-models';

// Deliberately synthetic: these parameters are numerical fixtures, not study data.
const q = <U extends string>(value: number, unit: U) => ({
  value,
  unit,
  source_kind: 'test_fixture' as const,
  source_ref: 'test-fixture://coupled-cell-1d',
});

function fixture(n = 12): CoupledCell1dInput {
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
      cells: Array.from({ length: n }, (_, i) => ({
        porosity: q(i < n / 2 ? 0.4 : 0.6, '1'),
        tortuosity: q(2, '1'),
        specificSurfaceArea: q(i < n / 2 ? 800 : 1200, 'm2/m3'),
        accessibleAreaFraction: q(0.5, '1'),
        anodePotential: q(0.1, 'V'),
      })),
    },
    membrane: {
      thickness: q(0.0002, 'm'),
      area: q(0.01, 'm2'),
      temperature: q(298, 'K'),
      segments: Array.from({ length: n }, (_, i) => ({
        porosity: q(i < n / 2 ? 0.4 : 0.6, '1'),
        tortuosity: q(2, '1'),
      })),
      species: [
        {
          name: 'cation',
          valence: q(1, '1'),
          freeDiffusivity: q(1e-9, 'm2/s'),
          leftConcentration: q(100, 'mol/m3'),
          rightConcentration: q(100, 'mol/m3'),
        },
        {
          name: 'anion',
          valence: q(-1, '1'),
          freeDiffusivity: q(1e-9, 'm2/s'),
          leftConcentration: q(100, 'mol/m3'),
          rightConcentration: q(100, 'mol/m3'),
        },
      ],
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

describe('restricted coupled planar cell', () => {
  it('selects the declared 0D or 1D equations through one engine entrypoint', () => {
    const oneD = runConfiguredElectrochemicalModel({
      model: 'coupled-cell-1d-restricted-v1',
      cell: fixture(),
    });
    if (oneD.model !== 'coupled-cell-1d-restricted-v1')
      throw new Error('Wrong model');
    expect(oneD.result.modelStatus).toBe('development_only');
    const zeroD = runConfiguredElectrochemicalModel({
      model: 'coupled-0d-dae-v1',
      normalizedCase: normalizeCaseInput(
        rawCaseInputSchema.parse(rawCaseFixture),
      ),
    });
    if (zeroD.model !== 'coupled-0d-dae-v1') throw new Error('Wrong model');
    expect(zeroD.result.status).toBe('completed');
  });

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
