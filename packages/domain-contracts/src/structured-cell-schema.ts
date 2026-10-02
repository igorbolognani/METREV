import { z } from 'zod';
import { spatialValueSchema } from './spatial-model-schema';
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

export type StructuredCellInput = z.infer<typeof structuredCellInputSchema>;
export const STRUCTURED_CELL_LIMITS = [
  'Steady Cartesian orthogonal layers with zero convection and isothermal coefficients.',
  'Trace-species Nernst–Planck transport; fixed conductivity represents an unmodeled supporting electrolyte.',
  'Continuous concentration/potential interfaces; no partition, Donnan or fixed membrane charge.',
  'No double layer, biofilm growth, gas phases, thermal field or independently validated prediction.',
] as const;
