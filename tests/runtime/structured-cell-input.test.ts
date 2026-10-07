import { describe, expect, it } from 'vitest';
import {
  structuredCellInputSchema,
  structuredCellRunAdmissionSchema,
} from '../../packages/domain-contracts/src/structured-cell-schema';
import { spatialRuntimeInputSha256 } from '../../packages/domain-contracts/src/spatial-runtime-input';
import { structuredCellFixture } from '../fixtures/structured-cell';
import {
  structuredCellTopology,
  structuredCellTransportFaces,
} from '../../packages/domain-contracts/src/structured-cell-topology';
import { compileStructuredCellEquationGraph } from '../../packages/domain-contracts/src/structured-cell-equation-graph';

function prescribedFixture(dimension: 2 | 3 = 2, speed = 1e-6) {
  const input = structuredCellFixture(dimension);
  input.geometry.layers[1].kind = 'separator';
  const faces = structuredCellTransportFaces(input);
  const velocity = (value: number) => ({
    value,
    unit: 'm/s',
    source_kind: 'test_fixture' as const,
    source_ref: 'synthetic:prescribed-incompressible-cell-flow',
  });
  input.advection = {
    version: 'structured-cell-prescribed-flow-v1',
    face_normal_velocity: faces.interior.map((face) =>
      velocity(face.axis === 1 ? speed : 0),
    ),
    boundary_normal_velocity: faces.boundary.map((face) =>
      velocity(face.axis === 1 ? face.sign * speed : 0),
    ),
    inlet_concentrations:
      speed === 0
        ? {}
        : {
            [speed > 0 ? 'y_min' : 'y_max']: Object.fromEntries(
              input.species.map((species) => [
                species.id,
                { ...species.reservoir_concentration },
              ]),
            ),
          },
  };
  return input;
}

function darcyFixture(dimension: 2 | 3 = 2) {
  const input = structuredCellFixture(dimension);
  input.geometry.layers[1].kind = 'separator';
  const mesh = structuredCellTopology(input);
  const v = (value: number, unit: string) => ({
    value,
    unit,
    source_kind: 'test_fixture' as const,
    source_ref: 'synthetic:prescribed-darcy-linear-pressure',
  });
  const pressureAt = (y: number) => 10 - 1000 * y;
  input.hydraulics = {
    version: 'structured-cell-prescribed-darcy-v1',
    dynamic_viscosity: v(1e-3, 'Pa*s'),
    permeability_by_region: Object.fromEntries(
      input.geometry.layers.map((layer) => [layer.tag, v(1e-12, 'm2')]),
    ),
    cell_pressure: mesh.centers_m.map((center) =>
      v(pressureAt(center[1]), 'Pa'),
    ),
    boundary_pressure: {
      y_min: v(pressureAt(0), 'Pa'),
      y_max: v(pressureAt(input.geometry.lengths_m[1].value), 'Pa'),
    },
    impermeable_faces: dimension === 3 ? ['z_min', 'z_max'] : [],
    inlet_concentrations: {
      y_min: Object.fromEntries(
        input.species.map((species) => [
          species.id,
          { ...species.reservoir_concentration },
        ]),
      ),
    },
  };
  return input;
}

function prescribedDarcy(input: ReturnType<typeof darcyFixture>) {
  const flow = input.hydraulics;
  if (!flow || flow.version !== 'structured-cell-prescribed-darcy-v1')
    throw new Error('Expected prescribed Darcy fixture');
  return flow;
}

function solvedDarcyFixture(dimension: 2 | 3 = 2) {
  const input = darcyFixture(dimension);
  const flow = prescribedDarcy(input);
  input.hydraulics = {
    version: 'structured-cell-darcy-pressure-solve-v1',
    dynamic_viscosity: flow.dynamic_viscosity,
    permeability_by_region: flow.permeability_by_region,
    boundary_pressure: flow.boundary_pressure,
    impermeable_faces: flow.impermeable_faces,
    inlet_concentrations: flow.inlet_concentrations,
  };
  return input;
}

function neutralMembranePartitionFixture(dimension: 2 | 3 = 2) {
  const input = structuredCellFixture(dimension);
  const neutral = { ...input.species[0], id: 'neutral' };
  input.species.push(neutral);
  for (const layer of input.geometry.layers)
    layer.diffusivity.neutral = { ...layer.diffusivity.reduced };
  input.interface_partition = {
    version: 'structured-cell-neutral-membrane-partition-v1',
    interfaces: [
      {
        left_domain: 'anode',
        right_domain: 'membrane',
        species: {
          neutral: {
            ...input.species[0].valence,
            value: 2,
            source_ref: 'synthetic:neutral-membrane-partition',
          },
        },
      },
    ],
  };
  return input;
}

function donnanMembranePartitionFixture(dimension: 2 | 3 = 2) {
  const input = structuredCellFixture(dimension);
  const chloride = {
    ...input.species[1],
    id: 'chloride',
    valence: {
      ...input.species[1].valence,
      value: -1,
      source_ref: 'synthetic:ideal-donnan-fixture',
    },
    elements: { Cl: { ...input.species[1].elements.C } },
  };
  input.species[1].initial_concentration.value = 100;
  input.species[1].reservoir_concentration.value = 100;
  input.species[1].reference_concentration.value = 100;
  chloride.initial_concentration.value = 100;
  chloride.reservoir_concentration.value = 100;
  chloride.reference_concentration.value = 100;
  input.species.push(chloride);
  for (const layer of input.geometry.layers)
    layer.diffusivity.chloride = { ...layer.diffusivity.reduced };
  const sourced = (value: number, unit: string, source_ref: string) => ({
    value,
    unit,
    source_kind: 'test_fixture' as const,
    source_ref,
  });
  input.interface_partition = {
    version: 'structured-cell-ideal-donnan-partition-v1',
    interfaces: [
      {
        left_domain: 'anode',
        right_domain: 'membrane',
        fixed_charge_density: sourced(-50, 'mol/m3', 'synthetic:fixed-charge'),
        species: {
          reduced: sourced(1.5, '1', 'synthetic:partition'),
          oxidized: sourced(1.1, '1', 'synthetic:partition'),
          chloride: sourced(0.8, '1', 'synthetic:partition'),
        },
      },
      {
        left_domain: 'membrane',
        right_domain: 'cathode',
        fixed_charge_density: sourced(-50, 'mol/m3', 'synthetic:fixed-charge'),
        species: {
          reduced: sourced(1.5, '1', 'synthetic:partition'),
          oxidized: sourced(0.9, '1', 'synthetic:partition'),
          chloride: sourced(1.2, '1', 'synthetic:partition'),
        },
      },
    ],
  };
  return input;
}

describe('restricted structured spatial cell admission', () => {
  it.each([2, 3] as const)('retains dimension %i and provenance', (dim) => {
    const input = structuredCellInputSchema.parse(structuredCellFixture(dim));
    expect(input.dimension).toBe(dim);
    expect(spatialRuntimeInputSha256(input)).toHaveLength(64);
  });
  it('keeps prescribed Darcy inputs readable but blocks them from new run admission', () => {
    const legacy = darcyFixture();
    expect(structuredCellInputSchema.safeParse(legacy).success).toBe(true);
    const legacyAdmission = structuredCellRunAdmissionSchema.safeParse(legacy);
    expect(legacyAdmission.success).toBe(false);
    if (!legacyAdmission.success)
      expect(legacyAdmission.error.issues[0]?.message).toContain(
        'boundary-driven Darcy pressure solve',
      );

    const solved = solvedDarcyFixture();
    expect(structuredCellRunAdmissionSchema.safeParse(solved).success).toBe(
      true,
    );
  });

  it('rejects mismatched electron charge and atoms', () => {
    const input = structuredCellFixture();
    input.electrodes[0].electron_count.value = 2;
    expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    const atoms = structuredCellFixture();
    atoms.species[1].elements.C.value = 2;
    expect(structuredCellInputSchema.safeParse(atoms).success).toBe(false);
  });
  it('admits sourced ideal Donnan partition on both ion-exchange membrane interfaces', () => {
    for (const dimension of [2, 3] as const) {
      const input = donnanMembranePartitionFixture(dimension);
      expect(structuredCellInputSchema.safeParse(input).success).toBe(true);
      const graph = compileStructuredCellEquationGraph(input);
      expect(graph.interfaces.map((entry) => entry.law)).toEqual([
        'structured-cell-ideal-donnan-partition-v1',
        'structured-cell-ideal-donnan-partition-v1',
      ]);
      expect(
        graph.nodes.filter(
          (node) => node.equation_id === 'cell-ideal-donnan-interface-v1',
        ),
      ).toHaveLength(2);
      expect(
        graph.couplings.filter(
          (coupling) => coupling.kind === 'donnan_interface',
        ),
      ).toHaveLength(12);
    }
  });
  it('rejects unsourced charge, missing charged partition, porous separator Donnan, and excessive valence', () => {
    const unsourced = donnanMembranePartitionFixture();
    unsourced.interface_partition!.interfaces[0].fixed_charge_density.source_ref =
      '';
    expect(structuredCellInputSchema.safeParse(unsourced).success).toBe(false);

    const missingIon = donnanMembranePartitionFixture();
    delete missingIon.interface_partition!.interfaces[0].species.chloride;
    expect(structuredCellInputSchema.safeParse(missingIon).success).toBe(false);

    const separator = donnanMembranePartitionFixture();
    separator.geometry.layers[1].kind = 'separator';
    expect(structuredCellInputSchema.safeParse(separator).success).toBe(false);

    const excessive = donnanMembranePartitionFixture();
    excessive.species[1].valence.value = 5;
    expect(structuredCellInputSchema.safeParse(excessive).success).toBe(false);

    const convective = donnanMembranePartitionFixture();
    const faces = structuredCellTransportFaces(convective);
    const membraneFace = faces.interior.findIndex(
      (face) => face.left_region === 0 && face.right_region === 1,
    );
    const velocity = (value: number) => ({
      value,
      unit: 'm/s',
      source_kind: 'test_fixture' as const,
      source_ref: 'synthetic:donnan-interface-flow-limit',
    });
    convective.advection = {
      version: 'structured-cell-prescribed-flow-v1',
      face_normal_velocity: faces.interior.map((_, index) =>
        velocity(index === membraneFace ? 1e-6 : 0),
      ),
      boundary_normal_velocity: faces.boundary.map(() => velocity(0)),
      inlet_concentrations: {},
    };
    const rejectedFlow = structuredCellInputSchema.safeParse(convective);
    expect(rejectedFlow.success).toBe(false);
    if (!rejectedFlow.success)
      expect(
        rejectedFlow.error.issues.map((issue) => issue.message).join(' '),
      ).toContain('Membrane convection/water transport is not implemented');
  });
  it('rejects missing provenance, wrong units, depth and geometry rank', () => {
    const input = structuredCellFixture();
    input.temperature.source_ref = '';
    expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    input.temperature.source_ref = 'synthetic';
    input.temperature.unit = 'C';
    expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    const rank = structuredCellFixture(3);
    rank.geometry.lengths_m.pop();
    expect(structuredCellInputSchema.safeParse(rank).success).toBe(false);
    const depth = structuredCellFixture();
    delete depth.geometry.out_of_plane_depth;
    expect(structuredCellInputSchema.safeParse(depth).success).toBe(false);
  });
  it('rejects incompatible circuit and unknown reaction state', () => {
    const input = structuredCellFixture();
    input.system = 'MEC';
    expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    const unknown = structuredCellFixture();
    unknown.electrodes[0].forward_orders.unknown = {
      ...unknown.electrodes[0].alpha,
    };
    expect(structuredCellInputSchema.safeParse(unknown).success).toBe(false);
  });
  it.each([2, 3] as const)(
    'admits explicitly sourced conservative face flow in %iD',
    (dimension) => {
      const input = prescribedFixture(dimension);
      expect(structuredCellInputSchema.parse(input).advection).toEqual(
        input.advection,
      );
      const reverse = prescribedFixture(dimension, -1e-6);
      expect(structuredCellInputSchema.safeParse(reverse).success).toBe(true);
      const zero = prescribedFixture(dimension, 0);
      zero.geometry.layers[1].kind = 'membrane';
      expect(structuredCellInputSchema.safeParse(zero).success).toBe(true);
      expect(spatialRuntimeInputSha256(input)).not.toBe(
        spatialRuntimeInputSha256(reverse),
      );
      const graph = compileStructuredCellEquationGraph(input);
      const species = graph.nodes.find(
        (node) => node.id === 'species_reduced',
      )!;
      expect(species.parameter_paths).toContain(
        'advection.inlet_concentrations',
      );
      expect(species.boundary).toContain('prescribed incompressible');
    },
  );
  it('rejects incomplete, divergent, unsourced, wrong-unit and membrane flow', () => {
    const mutations: ((input: ReturnType<typeof prescribedFixture>) => void)[] =
      [
        (input) => {
          input.advection!.face_normal_velocity.pop();
        },
        (input) => {
          input.advection!.face_normal_velocity[0].unit = 'm3/s';
        },
        (input) => {
          input.advection!.face_normal_velocity[0].source_ref = '';
        },
        (input) => {
          input.advection!.boundary_normal_velocity[0].value = 1e-6;
        },
        (input) => {
          input.advection!.face_normal_velocity[1].value = 2e-6;
        },
        (input) => {
          input.advection!.inlet_concentrations = {};
        },
        (input) => {
          delete input.advection!.inlet_concentrations.y_min!.reduced;
        },
        (input) => {
          input.geometry.layers[1].kind = 'membrane';
        },
      ];
    for (const mutate of mutations) {
      const input = prescribedFixture();
      mutate(input);
      expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    }
  });
  it.each([2, 3] as const)(
    'admits source-backed conservative prescribed Darcy flow in %iD',
    (dimension) => {
      const input = darcyFixture(dimension);
      expect(structuredCellInputSchema.parse(input).hydraulics).toEqual(
        input.hydraulics,
      );
      const graph = compileStructuredCellEquationGraph(input);
      expect(graph.nodes[0].parameter_paths).toContain(
        'hydraulics.permeability_by_region',
      );
      expect(graph.nodes[0].boundary).toContain('no pressure solve');
    },
  );
  it('rejects incomplete, divergent and ambiguous prescribed Darcy inputs', () => {
    const mutations: ((input: ReturnType<typeof darcyFixture>) => void)[] = [
      (input) => prescribedDarcy(input).cell_pressure.pop(),
      (input) => {
        prescribedDarcy(input).cell_pressure[0].value += 1;
      },
      (input) => {
        delete input.hydraulics!.permeability_by_region.anode;
      },
      (input) => {
        input.hydraulics!.dynamic_viscosity.unit = 'Pa';
      },
      (input) => {
        input.hydraulics!.impermeable_faces.push('y_min');
      },
      (input) => {
        input.hydraulics!.inlet_concentrations = {};
      },
      (input) => {
        input.geometry.layers[1].kind = 'membrane';
      },
      (input) => {
        input.advection = prescribedFixture().advection;
      },
    ];
    for (const mutate of mutations) {
      const input = darcyFixture();
      mutate(input);
      expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    }
  });
  it.each([2, 3] as const)(
    'admits boundary-driven finite-volume Darcy pressure in %iD',
    (dimension) => {
      const input = solvedDarcyFixture(dimension);
      const parsed = structuredCellInputSchema.parse(input);
      expect(parsed.hydraulics?.version).toBe(
        'structured-cell-darcy-pressure-solve-v1',
      );
      const graph = compileStructuredCellEquationGraph(parsed);
      expect(graph.nodes[0].boundary).toContain('pressure solve');
      expect(graph.nodes[0].parameter_paths).not.toContain(
        'hydraulics.cell_pressure',
      );
    },
  );
  it('rejects an unanchored Darcy pressure solve', () => {
    const input = solvedDarcyFixture();
    const flow = input.hydraulics!;
    if (flow.version !== 'structured-cell-darcy-pressure-solve-v1')
      throw new Error('Expected solved Darcy fixture');
    flow.boundary_pressure = {};
    flow.impermeable_faces = ['y_min', 'y_max'];
    flow.inlet_concentrations = {};
    expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
  });
  it.each([2, 3] as const)(
    'admits source-backed neutral membrane partition in %iD and records its equation',
    (dimension) => {
      const input = neutralMembranePartitionFixture(dimension);
      const parsed = structuredCellInputSchema.parse(input);
      expect(
        parsed.interface_partition?.interfaces[0].species.neutral,
      ).toMatchObject({
        value: 2,
        unit: '1',
      });
      const graph = compileStructuredCellEquationGraph(parsed);
      expect(graph.interfaces[0].law).toBe(
        'cell-neutral-membrane-partition-v1',
      );
      expect(
        graph.nodes.find((node) => node.id === 'species_neutral')
          ?.parameter_paths,
      ).toContain(
        'interface_partition.interfaces.0.species.neutral.partition_coefficient',
      );
    },
  );
  it('rejects charged, unbound, nonadjacent, unsourced and dimensionally invalid partition input', () => {
    const mutations: ((
      input: ReturnType<typeof neutralMembranePartitionFixture>,
    ) => void)[] = [
      (input) => {
        input.interface_partition!.interfaces[0].species.neutral = {
          ...input.interface_partition!.interfaces[0].species.neutral,
          source_ref: '',
        };
      },
      (input) => {
        input.interface_partition!.interfaces[0].species.neutral.unit = 'm/s';
      },
      (input) => {
        input.interface_partition!.interfaces[0].species.oxidized = {
          ...input.interface_partition!.interfaces[0].species.neutral,
        };
      },
      (input) => {
        input.interface_partition!.interfaces[0].right_domain = 'cathode';
      },
      (input) => {
        input.interface_partition!.interfaces[0].species.neutral.value = 0;
      },
    ];
    for (const mutate of mutations) {
      const input = neutralMembranePartitionFixture();
      mutate(input);
      expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    }
  });
});
