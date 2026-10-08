import type { CoupledCell1dInput } from '@metrev/electrochem-models';

// Deliberately synthetic: these parameters are numerical fixtures, not study data.
export const q = <U extends string>(value: number, unit: U) => ({
  value,
  unit,
  source_kind: 'test_fixture' as const,
  source_ref: 'test-fixture://coupled-cell-1d',
});

export function fixture(n = 12): CoupledCell1dInput {
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

/** Synthetic fixed-charge input: values are not measured membrane properties. */
export function uniformDonnanFixture(n = 12): CoupledCell1dInput {
  const cell = fixture(n);
  cell.membrane.donnan = {
    version: 'uniform-binary-ideal-donnan-v1',
    fixedChargeDensity: q(-50, 'mol/m3'),
    partitionCoefficients: { cation: q(1.2, '1'), anion: q(0.8, '1') },
  };
  cell.membrane.species[1].freeDiffusivity = q(2e-9, 'm2/s');
  return cell;
}
