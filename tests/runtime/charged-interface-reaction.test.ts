import { describe, expect, it } from 'vitest';
import {
  assembleChargedInterfaceFlux,
  assembleDonnanInterface,
  assembleHomogeneousReactions,
  solveDonnanInterface,
  type ChargedInterfaceFluxInput,
  type ChargedSpeciesContract,
  type DonnanInterfaceInput,
  type HomogeneousReactionInput,
} from '@metrev/electrochem-models';

const q = <U extends string>(value: number, unit: U) => ({
  value,
  unit,
  source_kind: 'test_fixture' as const,
  source_ref: 'test-fixture://charged-interface-reaction',
});

const species: ChargedSpeciesContract[] = [
  { id: 'Na+', valence: q(1, '1'), composition: { Na: q(1, '1') } },
  { id: 'Cl-', valence: q(-1, '1'), composition: { Cl: q(1, '1') } },
];

function donnanFixture(): DonnanInterfaceInput {
  return {
    interfaceKind: 'ion_exchange_membrane',
    temperature: q(298.15, 'K'),
    fixedChargeDensity: q(-100, 'mol/m3'),
    solutionPotentialV: 0,
    membranePotentialV: 0,
    species,
    solutionConcentrationMolM3: { 'Na+': 200, 'Cl-': 200 },
    membraneConcentrationMolM3: { 'Na+': 200, 'Cl-': 200 },
    partitionCoefficient: { 'Na+': q(1, '1'), 'Cl-': q(1, '1') },
  };
}

function fluxFixture(): ChargedInterfaceFluxInput {
  return {
    interfaceKind: 'ion_exchange_membrane',
    temperature: q(298.15, 'K'),
    species,
    leftPotentialV: 0,
    rightPotentialV: 0.005,
    leftConcentrationMolM3: { 'Na+': 200, 'Cl-': 100 },
    rightConcentrationMolM3: { 'Na+': 100, 'Cl-': 200 },
    transferVelocityMS: { 'Na+': q(2e-6, 'm/s'), 'Cl-': q(1e-6, 'm/s') },
  };
}

describe('charged membrane interface development kernels', () => {
  it('solves ideal Donnan partitioning and closes electroneutrality', () => {
    const input = donnanFixture();
    const result = solveDonnanInterface({
      ...input,
      membranePotentialV: undefined,
      membraneConcentrationMolM3: undefined,
    } as never);
    expect(result.membraneConcentrationMolM3['Na+']).toBeGreaterThan(200);
    expect(result.membraneConcentrationMolM3['Cl-']).toBeLessThan(200);
    // With phi_membrane - phi_solution as the sign convention, a fixed
    // negative membrane charge attracts Na+ and produces a negative Donnan jump.
    expect(result.membranePotentialV).toBeLessThan(0);
    expect(Math.abs(result.chargeResidualMolM3)).toBeLessThan(1e-9);
    expect(Math.max(...result.assembled.residual.map(Math.abs))).toBeLessThan(
      1e-9,
    );
    expect(result.assembled.residualUnits).toEqual(['1', '1', 'mol/m3']);
  });

  it('provides the exact Donnan residual Jacobian', () => {
    const input = donnanFixture();
    const base = assembleDonnanInterface(input);
    const variables = [200, 200, 0];
    const step = [1e-4, 1e-4, 1e-8];
    for (let column = 0; column < variables.length; column += 1) {
      const perturbed: DonnanInterfaceInput = {
        ...input,
        membraneConcentrationMolM3: {
          'Na+': variables[0] + (column === 0 ? step[column] : 0),
          'Cl-': variables[1] + (column === 1 ? step[column] : 0),
        },
        membranePotentialV: variables[2] + (column === 2 ? step[column] : 0),
      };
      const shifted = assembleDonnanInterface(perturbed);
      base.residual.forEach((value, row) => {
        const numerical = (shifted.residual[row] - value) / step[column];
        expect(numerical).toBeCloseTo(base.jacobian[row][column], 5);
      });
    }
  });

  it('assembles equal and opposite interface sources with an exact Jacobian', () => {
    const input = fluxFixture();
    const result = assembleChargedInterfaceFlux(input);
    expect(result.maximumSpeciesConservationResidualMolM2S).toBe(0);
    expect(result.leftBoundarySourceMolM2S['Na+']).toBe(
      -result.rightBoundarySourceMolM2S['Na+'],
    );
    expect(Number.isFinite(result.ionicCurrentDensityAM2)).toBe(true);

    const step = 1e-7;
    const shifted = assembleChargedInterfaceFlux({
      ...input,
      rightPotentialV: input.rightPotentialV + step,
    });
    result.residual.forEach((value, row) => {
      const numerical = (shifted.residual[row] - value) / step;
      expect(numerical).toBeCloseTo(result.jacobian[row][5], 5);
    });
  });

  it('has zero flux at equal electrochemical state', () => {
    const input = fluxFixture();
    const result = assembleChargedInterfaceFlux({
      ...input,
      rightPotentialV: input.leftPotentialV,
      rightConcentrationMolM3: input.leftConcentrationMolM3,
    });
    expect(result.fluxMolM2S['Na+']).toBeCloseTo(0, 18);
    expect(result.fluxMolM2S['Cl-']).toBeCloseTo(0, 18);
    expect(result.ionicCurrentDensityAM2).toBeCloseTo(0, 18);
  });

  it('fails closed for unsupported transport and invalid sourced inputs', () => {
    expect(() =>
      assembleChargedInterfaceFlux({
        ...fluxFixture(),
        requestedEffects: { waterTransport: true },
      }),
    ).toThrow(/unsupported effects/);
    expect(() =>
      assembleDonnanInterface({
        ...donnanFixture(),
        fixedChargeDensity: { ...q(-100, 'mol/m3'), source_ref: '' },
      }),
    ).toThrow(RangeError);
    expect(() =>
      assembleChargedInterfaceFlux({
        ...fluxFixture(),
        rightConcentrationMolM3: { 'Na+': 0, 'Cl-': 200 },
      }),
    ).toThrow(RangeError);
  });
});

const reactionSpecies: ChargedSpeciesContract[] = [
  {
    id: 'HA',
    valence: q(0, '1'),
    composition: { H: q(1, '1'), A: q(1, '1') },
  },
  { id: 'H+', valence: q(1, '1'), composition: { H: q(1, '1') } },
  { id: 'A-', valence: q(-1, '1'), composition: { A: q(1, '1') } },
];

function reactionFixture(): HomogeneousReactionInput {
  return {
    species: reactionSpecies,
    concentrationMolM3: { HA: 10, 'H+': 2, 'A-': 2 },
    reactions: [
      {
        id: 'acid_dissociation',
        stoichiometry: { HA: q(-1, '1'), 'H+': q(1, '1'), 'A-': q(1, '1') },
        forwardRateScale: q(0.5, 'mol/m3/s'),
        reverseRateScale: q(0.2, 'mol/m3/s'),
        referenceConcentration: {
          HA: q(1, 'mol/m3'),
          'H+': q(1, 'mol/m3'),
          'A-': q(1, 'mol/m3'),
        },
        forwardOrder: { HA: q(1, '1') },
        reverseOrder: { 'H+': q(1, '1'), 'A-': q(1, '1') },
      },
    ],
  };
}

describe('conservative charged reaction development kernel', () => {
  it('assembles species sources, exact derivatives, and conservation checks', () => {
    const input = reactionFixture();
    const result = assembleHomogeneousReactions(input);
    expect(result.netRateMolM3S.acid_dissociation).toBeCloseTo(4.2, 12);
    expect(result.speciesSourceMolM3S.HA).toBeCloseTo(-4.2, 12);
    expect(result.speciesSourceMolM3S['H+']).toBeCloseTo(4.2, 12);
    expect(result.chargeConservationResidualCM3S).toBeCloseTo(0, 12);
    expect(result.elementConservationResidualMolM3S).toEqual({ H: 0, A: 0 });

    const step = 1e-6;
    reactionSpecies.forEach((ion, column) => {
      const shifted = assembleHomogeneousReactions({
        ...input,
        concentrationMolM3: {
          ...input.concentrationMolM3,
          [ion.id]: input.concentrationMolM3[ion.id] + step,
        },
      });
      result.residual.forEach((value, row) => {
        const numerical = (shifted.residual[row] - value) / step;
        expect(numerical).toBeCloseTo(result.jacobian[row][column], 5);
      });
    });
  });

  it('rejects unbalanced stoichiometry and unsupported reaction physics', () => {
    const input = reactionFixture();
    expect(() =>
      assembleHomogeneousReactions({
        ...input,
        reactions: [
          {
            ...input.reactions[0],
            stoichiometry: { HA: q(-1, '1'), 'H+': q(1, '1') },
          },
        ],
      }),
    ).toThrow(/violates charge or element conservation/);
    expect(() =>
      assembleHomogeneousReactions({
        ...input,
        requestedPhysics: { electronTransfer: true },
      }),
    ).toThrow(/unsupported physics/);
  });
});
