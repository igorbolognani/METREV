import { describe, expect, it } from 'vitest';

import {
  solvePorousAnode1d,
  type PorousAnodeInput,
} from '@metrev/electrochem-models';

// Synthetic fixture: these numbers do not come from the cited experiments.
const q = <Unit extends string>(value: number, unit: Unit) => ({
  value,
  unit,
  source_kind: 'test_fixture' as const,
  source_ref: 'test-fixture://porous-anode-1d',
});

function fixture(count: number, areaPerVolume = 1000): PorousAnodeInput {
  return {
    thickness: q(0.001, 'm'),
    projectedArea: q(0.01, 'm2'),
    freeSubstrateDiffusivity: q(1e-9, 'm2/s'),
    bulkSubstrateConcentration: q(1, 'mol/m3'),
    maximumSurfaceReactionFlux: q(1e-8, 'mol/(m2 s)'),
    halfSaturationConcentration: q(100, 'mol/m3'),
    halfRateAnodePotential: q(0, 'V'),
    temperature: q(298, 'K'),
    electronsPerSubstrateMolecule: q(8, '1'),
    cells: Array.from({ length: count }, () => ({
      porosity: q(0.5, '1'),
      tortuosity: q(2, '1'),
      specificSurfaceArea: q(areaPerVolume, 'm2/m3'),
      accessibleAreaFraction: q(0.5, '1'),
      anodePotential: q(0.2, 'V'),
    })),
    membrane: {
      thickness: q(0.001, 'm'),
      ionicConductivity: q(1, 'S/m'),
      activeArea: q(0.01, 'm2'),
    },
  };
}

describe('steady 1D porous bioanode reaction–transport', () => {
  it('separates pore fraction, total area and electroactive area with units', () => {
    const result = solvePorousAnode1d(fixture(20));
    expect(result.internalAreaM2).toBeCloseTo(0.01, 10);
    expect(result.accessibleAreaM2).toBeCloseTo(0.005, 10);
    expect(result.cells[0].effectiveDiffusivityM2S).toBeCloseTo(2.5e-10, 16);
    expect(result.membraneResistanceOhm).toBeCloseTo(0.1, 10);
    expect(result.membraneOhmicDropAtFaradaicCurrentV).toBeCloseTo(
      result.faradaicCurrentA * 0.1,
      12,
    );
  });

  it('balances boundary substrate flux, distributed reaction, and Faraday current', () => {
    const result = solvePorousAnode1d(fixture(32));
    expect(result.faradaicCurrentA).toBeGreaterThan(0);
    expect(result.cells[0].substrateConcentrationMolM3).toBeLessThan(
      result.cells.at(-1)!.substrateConcentrationMolM3,
    );
    expect(result.substrateInflowMolS).toBeCloseTo(
      result.substrateConsumptionMolS,
      12,
    );
    expect(Math.abs(result.balanceResidualMolS)).toBeLessThan(1e-15);
    expect(result.faradaicCurrentA).toBeCloseTo(
      result.cells.reduce((sum, cell) => sum + cell.faradaicCurrentA, 0),
      12,
    );
  });

  it('approaches the analytical planar first-order reaction profile on refinement', () => {
    const coarse = solvePorousAnode1d(fixture(10));
    const fine = solvePorousAnode1d(fixture(80));
    const D = 2.5e-10;
    const potentialFactor =
      1 / (1 + Math.exp((-96485.33212 * 0.2) / (8.31446261815324 * 298)));
    const kLinear = (1000 * 0.5 * 1e-8 * potentialFactor) / 100;
    const expectedAtBacking = 1 / Math.cosh(0.001 * Math.sqrt(kLinear / D));
    const coarseError = Math.abs(
      coarse.cells[0].substrateConcentrationMolM3 - expectedAtBacking,
    );
    const fineError = Math.abs(
      fine.cells[0].substrateConcentrationMolM3 - expectedAtBacking,
    );
    expect(fineError).toBeLessThan(coarseError);
    expect(fineError).toBeLessThan(0.002);
  });

  it('does not derive accessible surface from porosity or silently choose a membrane', () => {
    const input = fixture(20);
    const noArea = solvePorousAnode1d({
      ...input,
      cells: input.cells.map((cell) => ({
        ...cell,
        accessibleAreaFraction: q(0, '1'),
      })),
    });
    expect(noArea.faradaicCurrentA).toBe(0);
    expect(
      noArea.cells.every((cell) => cell.substrateConcentrationMolM3 === 1),
    ).toBe(true);
    const lowPorosity = solvePorousAnode1d({
      ...input,
      cells: input.cells.map((cell) => ({
        ...cell,
        porosity: q(0.25, '1'),
      })),
    });
    expect(lowPorosity.accessibleAreaM2).toBeCloseTo(0.005, 10);
    expect(lowPorosity.faradaicCurrentA).toBeLessThan(
      solvePorousAnode1d(input).faradaicCurrentA,
    );
    const noMembrane = solvePorousAnode1d({ ...input, membrane: undefined });
    expect(noMembrane.membraneResistanceOhm).toBeNull();
  });

  it('uses the local pore transport and electroactive surface along electrode thickness', () => {
    const input = fixture(8);
    const graded = solvePorousAnode1d({
      ...input,
      cells: input.cells.map((cell, i) => ({
        ...cell,
        porosity: q(i < 4 ? 0.25 : 0.75, '1'),
        specificSurfaceArea: q(i < 4 ? 500 : 1500, 'm2/m3'),
      })),
    });
    expect(graded.cells[0].effectiveDiffusivityM2S).toBeCloseTo(1.25e-10, 16);
    expect(graded.cells[7].effectiveDiffusivityM2S).toBeCloseTo(3.75e-10, 16);
    expect(graded.cells[7].accessibleAreaM2).toBeCloseTo(
      3 * graded.cells[0].accessibleAreaM2,
      12,
    );
    expect(graded.cells[7].reactionMolM3S).toBeGreaterThan(
      graded.cells[0].reactionMolM3S,
    );
    expect(Math.abs(graded.balanceResidualMolS)).toBeLessThan(1e-15);
  });

  it('rejects absent provenance, wrong units and physically invalid porous geometry', () => {
    const input = fixture(4);
    expect(() =>
      solvePorousAnode1d({
        ...input,
        thickness: { ...input.thickness, source_ref: '' },
      }),
    ).toThrow(RangeError);
    expect(() =>
      solvePorousAnode1d({
        ...input,
        cells: input.cells.map((cell) => ({
          ...cell,
          specificSurfaceArea: {
            ...cell.specificSurfaceArea,
            unit: 'm2' as 'm2/m3',
          },
        })),
      }),
    ).toThrow(RangeError);
    expect(() =>
      solvePorousAnode1d({
        ...input,
        cells: input.cells.map((cell) => ({
          ...cell,
          porosity: q(1, '1'),
        })),
      }),
    ).toThrow(RangeError);
    expect(() =>
      solvePorousAnode1d({
        ...input,
        membrane: {
          ...input.membrane!,
          ionicConductivity: q(0, 'S/m'),
        },
      }),
    ).toThrow(RangeError);
  });
});
