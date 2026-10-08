/** Exact steady electroneutral Nernst–Planck family, not a general membrane BVP.
 * Equal, electroneutral 1:1 solution reservoirs; uniform fixed charge and K_i;
 * D_eff,i(x)=D_free,i epsilon(x)/tau(x); no reaction, water or convection.
 * EQ-MEM-1D-002: c+ - c- + X=0, c_i=K_i c_s exp(-z_i psi_D),
 * kappa(x)=F²/(RT) sum_i D_eff,i(x)c_i, I=FA sum_i z_i J_i.
 * Moshtarikhah et al., 10.1007/s10800-016-1017-2, Eqs. 1,3,7,11–14
 * motivate the formulation; this exact reduction does not reproduce that
 * paper's high-concentration, nonideal, swelling or water-transport dataset.
 */
import type { SourcedSpatialValue } from './porous-anode-1d';
import { POROUS_ANODE_1D_SOURCES } from './porous-anode-1d';
import {
  membraneParameterValue as parameter,
  positiveMembraneParameterValue as positive,
  solveMembraneIon1d,
  type MembraneIonInput,
  type MembraneIonResult,
} from './membrane-ion-1d';

export interface UniformDonnanBoundary {
  version: 'uniform-binary-ideal-donnan-v1';
  /** Signed molar charge equivalents per membrane pore-liquid volume. */
  fixedChargeDensity: SourcedSpatialValue<'mol/m3'>;
  partitionCoefficients: Record<string, SourcedSpatialValue<'1'>>;
}

export type UniformDonnanMembraneInput = Omit<
  MembraneIonInput,
  'interfacePotential'
> & {
  /** Species boundary concentrations are solution-side in this formulation. */
  donnan: UniformDonnanBoundary;
};

/** Prepare the exact membrane resistance for the same current-root engine. */
export function prepareUniformDonnanMembrane1d(
  input: UniformDonnanMembraneInput,
) {
  if (input.donnan?.version !== 'uniform-binary-ideal-donnan-v1')
    throw new RangeError('Unsupported uniform Donnan formulation');
  if (
    input.species?.length !== 2 ||
    new Set(input.species.map((ion) => ion.name)).size !== 2 ||
    input.species.some((ion) => !ion.name?.trim())
  )
    throw new RangeError('Uniform Donnan requires two distinct named ions');
  const z = input.species.map((ion, i) =>
    parameter(ion.valence, '1', `species[${i}].valence`, -1, 1),
  );
  if (z[0] * z[1] !== -1)
    throw new RangeError('Uniform Donnan requires monovalent cation and anion');
  const salt = positive(
    input.species[0].leftConcentration,
    'mol/m3',
    'solution salt concentration',
  );
  for (const [i, ion] of input.species.entries())
    if (
      parameter(
        ion.leftConcentration,
        'mol/m3',
        `species[${i}].leftConcentration`,
        0,
      ) !== salt ||
      parameter(
        ion.rightConcentration,
        'mol/m3',
        `species[${i}].rightConcentration`,
        0,
      ) !== salt
    )
      throw new RangeError(
        'Uniform Donnan requires identical electroneutral solution reservoirs',
      );
  const keys = Object.keys(input.donnan.partitionCoefficients);
  if (
    keys.length !== 2 ||
    input.species.some((ion) => !keys.includes(ion.name))
  )
    throw new RangeError(
      'Partition coefficients must identify exactly both ions',
    );
  const k = input.species.map((ion) =>
    positive(
      input.donnan.partitionCoefficients[ion.name],
      '1',
      `partition.${ion.name}`,
    ),
  );
  const charge = parameter(
    input.donnan.fixedChargeDensity,
    'mol/m3',
    'fixed charge per pore-liquid volume',
    -Infinity,
  );
  const plus = z.indexOf(1),
    minus = z.indexOf(-1);
  const a = k[plus] * salt,
    b = k[minus] * salt;
  const geometric = Math.sqrt(a) * Math.sqrt(b);
  const psi =
    Math.asinh(charge / (2 * geometric)) + (Math.log(a) - Math.log(b)) / 2;
  const concentrations = k.map(
    (coefficient, i) => coefficient * salt * Math.exp(-z[i] * psi),
  );
  const chargeResidual =
    charge + concentrations.reduce((sum, c, i) => sum + z[i] * c, 0);
  if (
    !Number.isFinite(psi) ||
    concentrations.some((c) => !Number.isFinite(c) || c <= 0) ||
    !Number.isFinite(chargeResidual) ||
    Math.abs(chargeResidual) >
      1e-11 * Math.max(Math.abs(charge), ...concentrations)
  )
    throw new RangeError(
      'Uniform Donnan equilibrium is outside the finite supported domain',
    );
  const n = input.segments?.length ?? 0;
  if (n < 2 || n > 512)
    throw new RangeError('membrane.segments: 2..512 required');
  const length = positive(input.thickness, 'm', 'thickness');
  const area = positive(input.area, 'm2', 'area');
  const temperature = positive(input.temperature, 'K', 'temperature');
  const F = POROUS_ANODE_1D_SOURCES.faradayConstant.value;
  const rt = POROUS_ANODE_1D_SOURCES.gasConstant.value * temperature;
  const mobility = input.species.map(
    (ion, i) =>
      positive(ion.freeDiffusivity, 'm2/s', `species[${i}].freeDiffusivity`) *
      concentrations[i],
  );
  const totalMobility = mobility.reduce((sum, value) => sum + value, 0);
  const segmentResistance = input.segments.map((segment, i) => {
    const eps = positive(segment.porosity, '1', `segments[${i}].porosity`);
    if (eps >= 1) throw new RangeError('Membrane porosity must be below one');
    const tau = parameter(
      segment.tortuosity,
      '1',
      `segments[${i}].tortuosity`,
      1,
    );
    return ((length / n) * tau) / eps;
  });
  const path = segmentResistance.reduce((sum, value) => sum + value, 0);
  const resistanceOhm = (rt * path) / (F * F * area * totalMobility);
  if (!Number.isFinite(resistanceOhm) || resistanceOhm <= 0)
    throw new RangeError(
      'Uniform Donnan ionic resistance outside supported domain',
    );

  return {
    resistanceOhm,
    /** Positive I transports positive charge from left/anode to right/cathode. */
    solve(currentA: number): MembraneIonResult {
      if (!Number.isFinite(currentA))
        throw new RangeError('Finite current required');
      const jumpV = (psi * rt) / F;
      const dropV = currentA * resistanceOhm;
      let cumulative = 0;
      const potential = [
        jumpV,
        ...segmentResistance.map((part) => {
          cumulative += part;
          return jumpV - (dropV * cumulative) / path;
        }),
      ];
      const modeled = <U extends string>(
        value: number,
        unit: U,
      ): SourcedSpatialValue<U> => ({
        value,
        unit,
        source_kind: 'assumption',
        source_ref: 'model://uniform-binary-ideal-donnan-v1/EQ-MEM-1D-002',
      });
      const result = solveMembraneIon1d({
        thickness: input.thickness,
        area: input.area,
        temperature: input.temperature,
        segments: input.segments,
        interfacePotential: potential.map((value) => modeled(value, 'V')),
        species: input.species.map((ion, i) => ({
          ...ion,
          leftConcentration: modeled(concentrations[i], 'mol/m3'),
          rightConcentration: modeled(concentrations[i], 'mol/m3'),
        })),
      });
      const volumeResidual = Math.max(
        ...result.xNodesM.map((_, node) =>
          Math.abs(
            charge +
              result.species.reduce(
                (sum, ion, i) => sum + z[i] * ion.concentrationMolM3[node],
                0,
              ),
          ),
        ),
      );
      const chargeScale = Math.max(Math.abs(charge), ...concentrations);
      if (
        volumeResidual > 1e-8 * chargeScale ||
        Math.abs(result.totalIonicCurrentA - currentA) >
          Math.max(1e-12, Math.abs(currentA) * 1e-8)
      )
        throw new Error(
          'Uniform membrane volume charge/current closure failed',
        );
      return {
        ...result,
        uniformDonnan: {
          formulation: input.donnan.version,
          fixedChargeDensityMolM3: charge,
          chargeResidualMolM3: chargeResidual,
          maximumVolumeChargeResidualMolM3: volumeResidual,
          leftMembraneMinusSolutionPotentialV: jumpV,
          rightMembraneMinusSolutionPotentialV: jumpV,
          netInterfaceVoltageV: 0,
          membraneResistanceOhm: resistanceOhm,
          interfacePotentialV: potential,
          species: input.species.map((ion, i) => ({
            name: ion.name,
            valence: z[i],
            partitionCoefficient: k[i],
            solutionConcentrationMolM3: salt,
            equilibriumMembraneConcentrationMolM3: concentrations[i],
            currentFraction: mobility[i] / totalMobility,
          })),
        },
      };
    },
  };
}
