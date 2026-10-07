import { z } from 'zod';
import {
  structuredCellInputSchema,
  type StructuredCellInput,
} from './structured-cell-schema';

const node = z
  .object({
    id: z.string().min(1),
    equation_id: z.enum([
      'cell-species-steady-v1',
      'cell-liquid-charge-v1',
      'cell-solid-charge-v1',
      'cell-butler-volmer-v1',
      'cell-homogeneous-reactions-v1',
      'cell-circuit-v1',
      'cell-ideal-donnan-interface-v1',
    ]),
    domain_tags: z.array(z.string()).min(1),
    states: z.array(
      z
        .object({
          id: z.string(),
          unit: z.enum(['mol/m3', 'V', 'A/m3']),
          role: z.enum(['unknown', 'derived']),
        })
        .strict(),
    ),
    parameter_paths: z.array(z.string()).min(1),
    boundary: z.string().min(1),
  })
  .strict();

/** An executable-profile assembly plan, not a general symbolic PDE compiler. */
export const structuredCellEquationGraphSchema = z
  .object({
    version: z.literal('structured-cell-equation-graph-v1'),
    model_id: z.literal('structured-cell-supporting-electrolyte-v1'),
    dimension: z.union([z.literal(2), z.literal(3)]),
    assembly: z.literal('monolithic_sparse_newton_fixed_profile'),
    equation_authority: z.literal(
      'bioelectrochem_agent_kit/domain/ontology/structured-cell-equations.yaml',
    ),
    cell_count: z.number().int().positive().max(20000),
    algebraic_state_count: z.number().int().positive().max(20000),
    nodes: z.array(node).min(6).max(64),
    couplings: z
      .array(
        z
          .object({
            from: z.string(),
            to: z.string(),
            kind: z.enum([
              'reaction_source',
              'potential_migration',
              'faradaic_charge',
              'circuit_boundary',
              'donnan_interface',
            ]),
          })
          .strict(),
      )
      .max(1024),
    interfaces: z
      .array(
        z
          .object({
            from: z.string(),
            to: z.string(),
            orientation: z.literal('positive_x'),
            law: z.enum([
              'continuous_concentration_potential_shared_face_flux',
              'cell-neutral-membrane-partition-v1',
              'structured-cell-ideal-donnan-partition-v1',
            ]),
          })
          .strict(),
      )
      .max(15),
    decision_eligible: z.literal(false),
  })
  .strict()
  .superRefine((graph, ctx) => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    if (
      ids.size !== graph.nodes.length ||
      graph.couplings.some((c) => !ids.has(c.from) || !ids.has(c.to))
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Equation nodes must be unique and all couplings resolved',
      });
  });
export type StructuredCellEquationGraph = z.infer<
  typeof structuredCellEquationGraphSchema
>;

export function compileStructuredCellEquationGraph(
  candidate: StructuredCellInput,
): StructuredCellEquationGraph {
  const input = structuredCellInputSchema.parse(candidate);
  const tags = input.geometry.layers.map((l) => l.tag);
  const nodes: StructuredCellEquationGraph['nodes'] = [];
  const couplings: StructuredCellEquationGraph['couplings'] = [];
  const add = (n: StructuredCellEquationGraph['nodes'][number]) =>
    nodes.push(n);
  for (const [i, species] of input.species.entries()) {
    add({
      id: 'species_' + species.id,
      equation_id: 'cell-species-steady-v1',
      domain_tags: tags,
      states: [
        { id: 'concentration_' + species.id, unit: 'mol/m3', role: 'unknown' },
      ],
      parameter_paths: [
        `species.${i}`,
        'temperature',
        ...input.geometry.layers.map(
          (_, j) => `geometry.layers.${j}.diffusivity.${species.id}`,
        ),
        ...(input.advection
          ? [
              'advection.face_normal_velocity',
              'advection.boundary_normal_velocity',
              'advection.inlet_concentrations',
            ]
          : []),
        ...(input.hydraulics
          ? [
              'hydraulics.dynamic_viscosity',
              'hydraulics.permeability_by_region',
              'hydraulics.boundary_pressure',
              'hydraulics.inlet_concentrations',
              ...(input.hydraulics.version ===
              'structured-cell-prescribed-darcy-v1'
                ? ['hydraulics.cell_pressure']
                : []),
            ]
          : []),
        ...(input.interface_partition?.interfaces.flatMap((entry, index) =>
          entry.species[species.id]
            ? [
                `interface_partition.interfaces.${index}.species.${species.id}.partition_coefficient`,
              ]
            : [],
        ) ?? []),
      ],
      boundary:
        'x insulating; declared transverse reservoir faces: ' +
        input.reservoir_faces.join(', ') +
        (input.advection
          ? '; prescribed incompressible superficial face flow; sourced inflow concentration; solved upwind outflow; impermeable membrane'
          : input.hydraulics
            ? input.hydraulics.version === 'structured-cell-prescribed-darcy-v1'
              ? '; source-backed cell and boundary pressures drive conservative Darcy flow and upwind transport; no pressure solve'
              : '; source-backed boundary pressures and regional permeability drive a finite-volume Darcy pressure solve and conservative upwind transport'
            : '; zero convection'),
    });
    couplings.push({
      from: 'liquid_charge',
      to: 'species_' + species.id,
      kind: 'potential_migration',
    });
  }
  if (
    input.interface_partition?.version ===
    'structured-cell-ideal-donnan-partition-v1'
  )
    for (const [i, entry] of input.interface_partition.interfaces.entries()) {
      const id = `donnan_${entry.left_domain}_${entry.right_domain}`;
      const interfaceTags = [entry.left_domain, entry.right_domain];
      add({
        id,
        equation_id: 'cell-ideal-donnan-interface-v1',
        domain_tags: interfaceTags,
        states: [
          {
            id: id + '_donnan_potential_jump',
            // The local root is dimensionless internally; the reported state
            // is its physical membrane-minus-solution voltage equivalent.
            unit: 'V',
            role: 'derived',
          },
        ],
        parameter_paths: [
          'temperature',
          `interface_partition.interfaces.${i}.fixed_charge_density`,
          ...Object.keys(entry.species).flatMap((speciesId) => {
            const speciesIndex = input.species.findIndex(
              (species) => species.id === speciesId,
            );
            return [
              `interface_partition.interfaces.${i}.species.${speciesId}`,
              `species.${speciesIndex}.valence`,
            ];
          }),
        ],
        boundary:
          'ideal local membrane electroneutrality determines a membrane-minus-solution Donnan jump for trace-species flux; supporting-electrolyte Ohmic current uses the continuous bulk potential; no bulk membrane electroneutrality is imposed',
      });
      for (const speciesId of Object.keys(entry.species)) {
        couplings.push(
          {
            from: 'species_' + speciesId,
            to: id,
            kind: 'donnan_interface',
          },
          { from: id, to: 'species_' + speciesId, kind: 'donnan_interface' },
        );
      }
    }
  add({
    id: 'liquid_charge',
    equation_id: 'cell-liquid-charge-v1',
    domain_tags: tags,
    states: [{ id: 'liquid_potential', unit: 'V', role: 'unknown' }],
    parameter_paths: input.geometry.layers.map(
      (_, i) => `geometry.layers.${i}.electrolyte_conductivity`,
    ),
    boundary:
      'insulating exterior total ionic current; anode collector reference fixes the global gauge',
  });
  for (const [i, electrode] of input.electrodes.entries()) {
    const role = electrode.role;
    add({
      id: 'solid_' + role,
      equation_id: 'cell-solid-charge-v1',
      domain_tags: [electrode.domain_tag],
      states: [{ id: 'solid_potential_' + role, unit: 'V', role: 'unknown' }],
      parameter_paths: [
        `geometry.layers.${i === 0 ? 0 : tags.length - 1}.solid_conductivity`,
      ],
      boundary:
        role === 'anode'
          ? 'outer anode collector = 0 V; remaining faces insulating'
          : 'outer cathode collector = circuit voltage; remaining faces insulating',
    });
    add({
      id: 'kinetics_' + role,
      equation_id: 'cell-butler-volmer-v1',
      domain_tags: [electrode.domain_tag],
      states: [{ id: 'faradaic_' + role, unit: 'A/m3', role: 'derived' }],
      parameter_paths: [`electrodes.${i}`, 'temperature'],
      boundary: 'volumetric reaction on the explicitly tagged electrode',
    });
    couplings.push(
      {
        from: 'kinetics_' + role,
        to: 'solid_' + role,
        kind: 'faradaic_charge',
      },
      {
        from: 'kinetics_' + role,
        to: 'liquid_charge',
        kind: 'faradaic_charge',
      },
      {
        from: 'solid_' + role,
        to: 'kinetics_' + role,
        kind: 'faradaic_charge',
      },
      {
        from: 'liquid_charge',
        to: 'kinetics_' + role,
        kind: 'faradaic_charge',
      },
    );
    for (const species of input.species) {
      if (
        electrode.forward_orders[species.id]?.value ||
        electrode.reverse_orders[species.id]?.value
      )
        couplings.push({
          from: 'species_' + species.id,
          to: 'kinetics_' + role,
          kind: 'reaction_source',
        });
      if (electrode.stoichiometry[species.id]?.value)
        couplings.push({
          from: 'kinetics_' + role,
          to: 'species_' + species.id,
          kind: 'reaction_source',
        });
    }
  }
  for (const [i, reaction] of input.reactions.entries()) {
    add({
      id: 'reaction_' + reaction.id,
      equation_id: 'cell-homogeneous-reactions-v1',
      domain_tags: [reaction.domain_tag],
      states: [],
      parameter_paths: [`reactions.${i}`],
      boundary:
        'local ' + reaction.law.kind + ' source; no boundary flux added',
    });
    for (const species of input.species) {
      if (
        reaction.law.kind === 'monod'
          ? reaction.law.substrate === species.id
          : reaction.law.orders[species.id]?.value
      )
        couplings.push({
          from: 'species_' + species.id,
          to: 'reaction_' + reaction.id,
          kind: 'reaction_source',
        });
      if (reaction.stoichiometry[species.id]?.value)
        couplings.push({
          from: 'reaction_' + reaction.id,
          to: 'species_' + species.id,
          kind: 'reaction_source',
        });
    }
  }
  add({
    id: 'circuit',
    equation_id: 'cell-circuit-v1',
    domain_tags: input.electrodes.map((e) => e.domain_tag),
    states: [{ id: 'collector_voltage', unit: 'V', role: 'unknown' }],
    parameter_paths: ['circuit'],
    boundary:
      input.system === 'MFC'
        ? 'V = I * external load'
        : 'V = -applied voltage; electrical power is input',
  });
  couplings.push(
    { from: 'solid_anode', to: 'circuit', kind: 'circuit_boundary' },
    { from: 'circuit', to: 'solid_cathode', kind: 'circuit_boundary' },
  );
  const cellCount =
    input.geometry.layers.reduce((n, l) => n + l.cells, 0) *
    input.geometry.transverse_cells.reduce((a, b) => a * b, 1);
  return structuredCellEquationGraphSchema.parse({
    version: 'structured-cell-equation-graph-v1',
    model_id: input.model_id,
    dimension: input.dimension,
    assembly: 'monolithic_sparse_newton_fixed_profile',
    equation_authority:
      'bioelectrochem_agent_kit/domain/ontology/structured-cell-equations.yaml',
    cell_count: cellCount,
    algebraic_state_count: cellCount * (input.species.length + 2) + 1,
    nodes,
    couplings,
    interfaces: tags.slice(1).map((tag, i) => ({
      from: tags[i],
      to: tag,
      orientation: 'positive_x',
      law: input.interface_partition?.interfaces.some(
        (entry) => entry.left_domain === tags[i] && entry.right_domain === tag,
      )
        ? input.interface_partition.version ===
          'structured-cell-ideal-donnan-partition-v1'
          ? 'structured-cell-ideal-donnan-partition-v1'
          : 'cell-neutral-membrane-partition-v1'
        : 'continuous_concentration_potential_shared_face_flux',
    })),
    decision_eligible: false,
  });
}
