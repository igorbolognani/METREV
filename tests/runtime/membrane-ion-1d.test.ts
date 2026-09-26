import { describe, expect, it } from 'vitest';
import {
  solveMembraneIon1d,
  type MembraneIonInput,
} from '@metrev/electrochem-models';

// Synthetic numerical fixture; no measured Nafion or MFC values are implied.
const q = <U extends string>(value: number, unit: U) => ({
  value,
  unit,
  source_kind: 'test_fixture' as const,
  source_ref: 'test-fixture://membrane-ion-1d',
});
function fixture(n = 10): MembraneIonInput {
  return {
    thickness: q(0.001, 'm'),
    area: q(0.01, 'm2'),
    temperature: q(298, 'K'),
    segments: Array.from({ length: n }, () => ({
      porosity: q(0.5, '1'),
      tortuosity: q(2, '1'),
    })),
    interfacePotential: Array.from({ length: n + 1 }, () => q(0, 'V')),
    species: [
      {
        name: 'cation',
        valence: q(1, '1'),
        freeDiffusivity: q(1e-9, 'm2/s'),
        leftConcentration: q(2, 'mol/m3'),
        rightConcentration: q(1, 'mol/m3'),
      },
    ],
  };
}

describe('steady 1D membrane ionic transport', () => {
  it('reproduces a planar Fickian gradient and Faraday charge flux', () => {
    const result = solveMembraneIon1d(fixture());
    const ion = result.species[0];
    expect(ion.fluxMolM2S).toBeCloseTo(2.5e-7, 14);
    expect(ion.concentrationMolM3[5]).toBeCloseTo(1.5, 12);
    expect(ion.currentA).toBeCloseTo(2.5e-7 * 96485.33212 * 0.01, 12);
    expect(ion.fluxResidualMolM2S).toBeLessThan(1e-18);
  });

  it('uses local pore diffusivity and preserves constant flux', () => {
    const input = fixture(8);
    const result = solveMembraneIon1d({
      ...input,
      segments: input.segments.map((cell, i) => ({
        ...cell,
        porosity: q(i < 4 ? 0.25 : 0.75, '1'),
      })),
    });
    expect(result.species[0].effectiveDiffusivityM2S[0]).toBeCloseTo(
      1.25e-10,
      16,
    );
    expect(result.species[0].effectiveDiffusivityM2S[7]).toBeCloseTo(
      3.75e-10,
      16,
    );
    expect(result.species[0].fluxMolM2S).toBeCloseTo(1.875e-7, 14);
    expect(result.species[0].fluxResidualMolM2S).toBeLessThan(1e-18);
  });

  it('resolves migration direction and sums counterion currents separately', () => {
    const input = fixture();
    const membrane = {
      ...input,
      species: [
        { ...input.species[0], rightConcentration: q(2, 'mol/m3') },
        {
          ...input.species[0],
          name: 'anion',
          valence: q(-1, '1'),
          rightConcentration: q(2, 'mol/m3'),
        },
      ],
      interfacePotential: input.interfacePotential.map((_, i) =>
        q((-0.01 * i) / 10, 'V'),
      ),
    };
    const result = solveMembraneIon1d(membrane);
    expect(result.species[0].fluxMolM2S).toBeGreaterThan(0);
    expect(result.species[1].fluxMolM2S).toBeLessThan(0);
    expect(result.species[0].currentA).toBeGreaterThan(0);
    expect(result.species[1].currentA).toBeGreaterThan(0);
    expect(result.totalIonicCurrentA).toBeCloseTo(
      result.species[0].currentA + result.species[1].currentA,
      12,
    );
    expect(result.species.every((ion) => ion.fluxResidualMolM2S < 1e-18)).toBe(
      true,
    );
  });

  it('rejects missing provenance and incompatible membrane boundaries', () => {
    const input = fixture();
    expect(() =>
      solveMembraneIon1d({ ...input, area: { ...input.area, source_ref: '' } }),
    ).toThrow(RangeError);
    expect(() =>
      solveMembraneIon1d({
        ...input,
        interfacePotential: input.interfacePotential.slice(1),
      }),
    ).toThrow(RangeError);
    expect(() =>
      solveMembraneIon1d({
        ...input,
        species: [{ ...input.species[0], valence: q(0, '1') }],
      }),
    ).toThrow(RangeError);
    expect(() =>
      solveMembraneIon1d({
        ...input,
        segments: input.segments.map((cell) => ({
          ...cell,
          porosity: q(1, '1'),
        })),
      }),
    ).toThrow(RangeError);
  });
});
