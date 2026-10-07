import { z } from 'zod';
import { spatialValueSchema } from './spatial-model-schema';
import {
  structuredCellPrescribedDarcyFlow,
  structuredCellTransportFaces,
} from './structured-cell-topology';
import {
  structuredCellCaseContextSchema,
  structuredCellDomainMappingMatches,
} from './structured-cell-case-context';

const id = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const value = (unit: string, minimum: number, positive = false) =>
  spatialValueSchema.refine(
    (v) =>
      v.unit === unit && (positive ? v.value > minimum : v.value >= minimum),
    `Expected ${unit} within the declared range`,
  );
const positive = (unit: string) => value(unit, 0, true);
const signed = (unit: string) =>
  spatialValueSchema.refine((v) => v.unit === unit, `Expected ${unit}`);
const stoichiometry = z.record(id, signed('1'));
const orders = z.record(
  id,
  value('1', 0).refine(
    (v) => Number.isInteger(v.value),
    'This rate profile supports nonnegative integer orders',
  ),
);
export const STRUCTURED_CELL_DARCY_PRESSURE_SOLVE_TOLERANCE = 1e-10;
const darcyHydraulicParameters = {
  dynamic_viscosity: positive('Pa*s'),
  permeability_by_region: z.record(id, positive('m2')),
  boundary_pressure: z.partialRecord(
    z.enum(['y_min', 'y_max', 'z_min', 'z_max']),
    signed('Pa'),
  ),
  impermeable_faces: z
    .array(z.enum(['y_min', 'y_max', 'z_min', 'z_max']))
    .max(4),
  inlet_concentrations: z.partialRecord(
    z.enum(['y_min', 'y_max', 'z_min', 'z_max']),
    z.record(id, value('mol/m3', 0)),
  ),
};
const darcyHydraulicsSchema = z.discriminatedUnion('version', [
  z
    .object({
      ...darcyHydraulicParameters,
      version: z.literal('structured-cell-prescribed-darcy-v1'),
      cell_pressure: z.array(signed('Pa')).max(20000),
    })
    .strict(),
  z
    .object({
      ...darcyHydraulicParameters,
      version: z.literal('structured-cell-darcy-pressure-solve-v1'),
    })
    .strict(),
]);

/** A separately versioned, restricted steady cell. It never replaces a requested research fidelity. */
export const structuredCellInputSchema = z
  .object({
    contract_version: z.literal('spatial-cell-input-v1'),
    model_id: z.literal('structured-cell-supporting-electrolyte-v1'),
    system: z.enum(['MFC', 'MEC']),
    dimension: z.union([z.literal(2), z.literal(3)]),
    coordinate_system: z.literal('cartesian'),
    charge_model: z.literal('fixed-conductivity-supporting-electrolyte'),
    case_context: structuredCellCaseContextSchema.optional(),
    advection: z
      .object({
        version: z.literal('structured-cell-prescribed-flow-v1'),
        face_normal_velocity: z.array(signed('m/s')).max(60000),
        boundary_normal_velocity: z.array(signed('m/s')).max(40000),
        inlet_concentrations: z.partialRecord(
          z.enum(['y_min', 'y_max', 'z_min', 'z_max']),
          z.record(id, value('mol/m3', 0)),
        ),
      })
      .strict()
      .optional(),
    hydraulics: darcyHydraulicsSchema.optional(),
    geometry: z
      .object({
        geometry_version: z.literal('structured-layers-v1'),
        lengths_m: z.array(positive('m')).min(2).max(3),
        out_of_plane_depth: positive('m').optional(),
        transverse_cells: z
          .array(z.number().int().min(1).max(64))
          .min(1)
          .max(2),
        layers: z
          .array(
            z
              .object({
                tag: id,
                kind: z.enum([
                  'bulk_liquid',
                  'anode',
                  'biofilm',
                  'membrane',
                  'separator',
                  'cathode',
                ]),
                width_m: positive('m'),
                cells: z.number().int().min(1).max(128),
                electrolyte_conductivity: positive('S/m'),
                solid_conductivity: value('S/m', 0),
                diffusivity: z.record(id, positive('m2/s')),
              })
              .strict(),
          )
          .min(3)
          .max(16),
      })
      .strict(),
    temperature: positive('K'),
    reservoir_faces: z
      .array(z.enum(['y_min', 'y_max', 'z_min', 'z_max']))
      .min(1)
      .max(4),
    species: z
      .array(
        z
          .object({
            id,
            valence: signed('1').refine((v) => Number.isInteger(v.value)),
            elements: z
              .record(
                z.string().regex(/^[A-Z][a-z]?$/),
                value('1', 0).refine((v) => Number.isInteger(v.value)),
              )
              .refine((v) => Object.keys(v).length > 0),
            initial_concentration: value('mol/m3', 0),
            reservoir_concentration: value('mol/m3', 0),
            reference_concentration: positive('mol/m3'),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    reactions: z
      .array(
        z
          .object({
            id,
            domain_tag: id,
            equation_ref: z.string().trim().min(1),
            stoichiometry,
            law: z.discriminatedUnion('kind', [
              z
                .object({
                  kind: z.literal('mass_action'),
                  rate: value('mol/(m3*s)', 0),
                  orders,
                })
                .strict(),
              z
                .object({
                  kind: z.literal('monod'),
                  rate: value('mol/(m3*s)', 0),
                  substrate: id,
                  half_saturation: positive('mol/m3'),
                })
                .strict(),
            ]),
          })
          .strict(),
      )
      .max(32),
    electrodes: z.tuple([
      z
        .object({
          role: z.literal('anode'),
          domain_tag: id,
          electron_count: positive('1'),
          equilibrium_potential: signed('V'),
          exchange_current: positive('A/m3'),
          alpha: positive('1').refine((v) => v.value < 1),
          stoichiometry,
          forward_orders: orders,
          reverse_orders: orders,
        })
        .strict(),
      z
        .object({
          role: z.literal('cathode'),
          domain_tag: id,
          electron_count: positive('1'),
          equilibrium_potential: signed('V'),
          exchange_current: positive('A/m3'),
          alpha: positive('1').refine((v) => v.value < 1),
          stoichiometry,
          forward_orders: orders,
          reverse_orders: orders,
        })
        .strict(),
    ]),
    circuit: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('external_load'),
          resistance: positive('ohm'),
        })
        .strict(),
      z
        .object({ kind: z.literal('applied_voltage'), voltage: positive('V') })
        .strict(),
    ]),
    numerics: z
      .object({
        max_evaluations: z.number().int().min(1).max(10000),
        nonlinear_tolerance: z.number().finite().positive().max(1e-3),
        conservation_tolerance: z.number().finite().positive().max(1e-3),
        concentration_scale: positive('mol/m3'),
        potential_scale: positive('V'),
        species_rate_scale: positive('mol/(m3*s)'),
        charge_rate_scale: positive('A/m3'),
      })
      .strict(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: 'custom', message });
    const layers = input.geometry.layers;
    const species = new Map(input.species.map((s) => [s.id, s]));
    if (input.case_context) {
      if (
        !structuredCellDomainMappingMatches(
          layers,
          input.case_context.component_domains,
        )
      )
        issue(
          'Case component mapping must cover every layer with its compatible stack block',
        );
    }
    if (
      species.size !== input.species.length ||
      new Set(layers.map((l) => l.tag)).size !== layers.length
    )
      issue('Species and region IDs must be unique');
    if (
      input.geometry.lengths_m.length !== input.dimension ||
      input.geometry.transverse_cells.length !== input.dimension - 1
    )
      issue('Geometry rank must match requested dimension');
    if (
      (input.dimension === 2) !==
      (input.geometry.out_of_plane_depth !== undefined)
    )
      issue('2D requires an explicit physical depth; 3D uses its z length');
    if (
      new Set(input.reservoir_faces).size !== input.reservoir_faces.length ||
      (input.dimension === 2 &&
        input.reservoir_faces.some((f) => f.startsWith('z')))
    )
      issue('Reservoir faces must be unique and match the dimension');
    const width = layers.reduce((sum, l) => sum + l.width_m.value, 0);
    if (
      Math.abs(width - input.geometry.lengths_m[0].value) >
      1e-12 * Math.max(width, input.geometry.lengths_m[0].value)
    )
      issue('Layer widths must sum to the x length');
    const count =
      layers.reduce((sum, l) => sum + l.cells, 0) *
      input.geometry.transverse_cells.reduce((a, b) => a * b, 1);
    if (count * (input.species.length + 2) + 1 > 20000)
      issue(
        'Requested nonlinear system exceeds the 20000-state development limit',
      );
    if (
      input.advection &&
      count * (input.species.length + 2) + 1 <= 20000 &&
      input.geometry.lengths_m.length === input.dimension &&
      input.geometry.transverse_cells.length === input.dimension - 1 &&
      (input.dimension === 3 || input.geometry.out_of_plane_depth !== undefined)
    ) {
      const flow = input.advection;
      const faces = structuredCellTransportFaces(input);
      if (
        flow.face_normal_velocity.length !== faces.interior.length ||
        flow.boundary_normal_velocity.length !== faces.boundary.length
      ) {
        issue('Prescribed velocity must cover every ordered mesh face');
      } else {
        const divergence = Array<number>(count).fill(0);
        const throughput = Array<number>(count).fill(0);
        const inflow = new Set<string>();
        faces.interior.forEach((face, index) => {
          const velocity = flow.face_normal_velocity[index].value;
          if (
            velocity !== 0 &&
            [face.left_region, face.right_region].some(
              (region) => layers[region].kind === 'membrane',
            )
          )
            issue('Membrane convection/water transport is not implemented');
          const q = face.area_m2 * velocity;
          divergence[face.left_cell] += q;
          divergence[face.right_cell] -= q;
          throughput[face.left_cell] += Math.abs(q);
          throughput[face.right_cell] += Math.abs(q);
        });
        faces.boundary.forEach((face, index) => {
          const velocity = flow.boundary_normal_velocity[index].value;
          if (
            velocity !== 0 &&
            (face.axis === 0 || layers[face.region_index].kind === 'membrane')
          )
            issue('Collector and membrane boundaries do not admit flow');
          const q = face.area_m2 * velocity;
          divergence[face.cell_index] += q;
          throughput[face.cell_index] += Math.abs(q);
          if (velocity < 0) inflow.add(face.face);
        });
        if (
          divergence.some((q) => !Number.isFinite(q)) ||
          throughput.some((q) => !Number.isFinite(q))
        )
          issue('Prescribed flow produces nonfinite volumetric flux');
        if (
          divergence.some(
            (q, cell) =>
              Math.abs(q) > 1e-12 * Math.max(throughput[cell], 1e-30),
          )
        )
          issue(
            'Prescribed flow violates local incompressible volume conservation',
          );
        if (
          [...inflow].sort().join() !==
          Object.keys(flow.inlet_concentrations).sort().join()
        )
          issue('Every flowing inlet requires explicit species concentrations');
        for (const concentrations of Object.values(flow.inlet_concentrations))
          if (
            Object.keys(concentrations).sort().join() !==
            [...species.keys()].sort().join()
          )
            issue('Inlet concentrations must cover exactly all species');
      }
    }
    if (input.advection && input.hydraulics)
      issue(
        'Prescribed velocity and prescribed Darcy flow are mutually exclusive',
      );
    if (
      input.hydraulics &&
      count * (input.species.length + 2) + 1 <= 20000 &&
      input.geometry.lengths_m.length === input.dimension &&
      input.geometry.transverse_cells.length === input.dimension - 1 &&
      (input.dimension === 3 || input.geometry.out_of_plane_depth !== undefined)
    ) {
      const flow = input.hydraulics;
      const transverseFaces = [
        'y_min',
        'y_max',
        ...(input.dimension === 3 ? ['z_min', 'z_max'] : []),
      ];
      const boundaryNames = Object.keys(flow.boundary_pressure);
      const impermeableNames = flow.impermeable_faces;
      if (
        new Set(impermeableNames).size !== impermeableNames.length ||
        [...boundaryNames, ...impermeableNames].sort().join() !==
          transverseFaces.sort().join()
      )
        issue(
          'Every transverse Darcy face must declare pressure or impermeability exactly once',
        );
      if (
        Object.keys(flow.permeability_by_region).sort().join() !==
        layers
          .map((layer) => layer.tag)
          .sort()
          .join()
      )
        issue('Darcy permeability must cover exactly every region');
      if (layers.some((layer) => layer.kind === 'membrane'))
        issue('Darcy membrane flow requires an unsupported membrane water law');
      let prescribedInflow: Set<string> | null = null;
      if (flow.version === 'structured-cell-prescribed-darcy-v1') {
        try {
          const faces = structuredCellPrescribedDarcyFlow({
            ...input,
            hydraulics: flow,
          });
          const divergence = Array<number>(count).fill(0);
          const throughput = Array<number>(count).fill(0);
          prescribedInflow = new Set<string>();
          faces.interior.forEach((face, index) => {
            const q = face.area_m2 * faces.interior_velocity_m_s[index];
            divergence[face.left_cell] += q;
            divergence[face.right_cell] -= q;
            throughput[face.left_cell] += Math.abs(q);
            throughput[face.right_cell] += Math.abs(q);
          });
          faces.boundary.forEach((face, index) => {
            const velocity = faces.boundary_velocity_m_s[index];
            const q = face.area_m2 * velocity;
            divergence[face.cell_index] += q;
            throughput[face.cell_index] += Math.abs(q);
            if (velocity < 0) prescribedInflow!.add(face.face);
          });
          if (
            divergence.some((q) => !Number.isFinite(q)) ||
            throughput.some((q) => !Number.isFinite(q))
          )
            issue('Prescribed Darcy flow produces nonfinite volumetric flux');
          if (
            divergence.some(
              (q, cell) =>
                Math.abs(q) > 1e-12 * Math.max(throughput[cell], 1e-30),
            )
          )
            issue(
              'Prescribed Darcy pressure violates local incompressible volume conservation',
            );
        } catch (error) {
          issue(error instanceof Error ? error.message : 'Invalid Darcy flow');
        }
      } else if (boundaryNames.length === 0) {
        issue('A Darcy pressure solve requires at least one pressure boundary');
      }
      const inletFaces = Object.keys(flow.inlet_concentrations);
      if (
        (prescribedInflow &&
          [...prescribedInflow].sort().join() !== inletFaces.sort().join()) ||
        (!prescribedInflow &&
          inletFaces.some((face) => !boundaryNames.includes(face)))
      )
        issue('Every Darcy inflow requires explicit species concentrations');
      for (const concentrations of Object.values(flow.inlet_concentrations))
        if (
          Object.keys(concentrations).sort().join() !==
          [...species.keys()].sort().join()
        )
          issue('Darcy inlet concentrations must cover exactly all species');
    }
    if ((input.system === 'MFC') !== (input.circuit.kind === 'external_load'))
      issue('Circuit must match MFC load or MEC applied voltage');
    layers.forEach((l) => {
      if (
        Object.keys(l.diffusivity).sort().join() !==
        [...species.keys()].sort().join()
      )
        issue(`Every species needs a diffusivity in ${l.tag}`);
      if (
        ['anode', 'cathode'].includes(l.kind) !==
        l.solid_conductivity.value > 0
      )
        issue('Only electrode regions conduct electronically in this profile');
    });
    input.electrodes.forEach((e, i) => {
      if (
        e.domain_tag !== layers[i === 0 ? 0 : layers.length - 1].tag ||
        layers[i === 0 ? 0 : layers.length - 1].kind !== e.role
      )
        issue(
          'Anode/cathode must occupy the first/last layer and contact their outer collector',
        );
      if (!Number.isInteger(e.electron_count.value))
        issue('Electron count must be an integer');
    });
    if (
      layers
        .slice(1, -1)
        .some((l) => l.kind === 'anode' || l.kind === 'cathode')
    )
      issue('This profile has exactly two disconnected electrode regions');
    const checkReaction = (
      nu: Record<string, { value: number }>,
      electrons: number,
    ) => {
      const elementBalance: Record<string, number> = {};
      let charge = 0;
      if (
        Object.keys(nu).length < 2 ||
        !Object.values(nu).some((v) => v.value < 0) ||
        !Object.values(nu).some((v) => v.value > 0)
      )
        issue('Reaction requires reactants and products');
      for (const [key, coefficient] of Object.entries(nu)) {
        const s = species.get(key);
        if (!s) {
          issue(`Unknown reaction species ${key}`);
          continue;
        }
        charge += coefficient.value * s.valence.value;
        for (const [element, n] of Object.entries(s.elements))
          elementBalance[element] =
            (elementBalance[element] ?? 0) + coefficient.value * n.value;
      }
      if (
        Object.values(elementBalance).some((v) => Math.abs(v) > 1e-10) ||
        Math.abs(charge - electrons) > 1e-10
      )
        issue(
          'Reaction must conserve elements and charge, including explicitly produced electrons',
        );
    };
    for (const r of input.reactions) {
      if (!layers.some((l) => l.tag === r.domain_tag))
        issue(`Unknown reaction region ${r.domain_tag}`);
      checkReaction(r.stoichiometry, 0);
      if (
        r.law.kind === 'monod' &&
        (!species.has(r.law.substrate) ||
          !r.stoichiometry[r.law.substrate] ||
          r.stoichiometry[r.law.substrate].value >= 0)
      )
        issue('Monod substrate must be a declared reactant');
      if (
        r.law.kind === 'mass_action' &&
        Object.keys(r.law.orders).some((s) => !species.has(s))
      )
        issue('Unknown kinetic species');
    }
    for (const e of input.electrodes) {
      checkReaction(e.stoichiometry, e.electron_count.value);
      if (
        [
          ...Object.keys(e.forward_orders),
          ...Object.keys(e.reverse_orders),
        ].some((s) => !species.has(s))
      )
        issue('Unknown electrode activity species');
    }
  });

export const structuredCellRunAdmissionSchema =
  structuredCellInputSchema.superRefine((input, context) => {
    if (input.hydraulics?.version === 'structured-cell-prescribed-darcy-v1')
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hydraulics', 'cell_pressure'],
        message:
          'New runs must use the boundary-driven Darcy pressure solve; mesh-sized cell_pressure provenance arrays cannot be stored in run snapshots.',
      });
  });

export type StructuredCellInput = z.infer<typeof structuredCellInputSchema>;
export const STRUCTURED_CELL_LIMITS = [
  'Steady Cartesian orthogonal layers with isothermal coefficients; optional sourced face advection, prescribed-cell-pressure Darcy flow, or a boundary-driven finite-volume Darcy pressure solve. No bulk/porous interface, variable or tensor permeability, membrane water law, or independent experimental validation.',
  'Trace-species Nernst–Planck transport; fixed conductivity represents an unmodeled supporting electrolyte.',
  'Continuous concentration/potential interfaces; no partition, Donnan or fixed membrane charge.',
  'No double layer, biofilm growth, gas phases, thermal field or independently validated prediction.',
] as const;
