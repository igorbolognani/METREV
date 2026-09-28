import { z } from 'zod';

import spatialParameterAuthority from '../../../bioelectrochem_agent_kit/domain/ontology/spatial-parameter-authority.json' with { type: 'json' };
import spatialVariableAuthority from '../../../bioelectrochem_agent_kit/domain/ontology/spatial-variable-authority.json' with { type: 'json' };

import { spatialFieldSchema, spatialValueSchema } from './spatial-model-schema';
import {
  planarMeshSchema,
  spatialSidecarResponseSchema,
  type SpatialSidecarResponse,
} from './spatial-sidecar-schema';

export { spatialVariableAuthority };

const identifier = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const sourceRef = z.string().trim().min(1);

export const spatialMeshReferenceSchema = z
  .object({
    kind: z.literal('generated_mesh'),
    uri: sourceRef,
    sha256: digest,
    format: z.literal('msh4'),
    refinement_factor: z.number().int().positive(),
    input_sha256: digest,
    sidecar_version: sourceRef,
    gmsh_version: sourceRef,
    physical_groups: z.record(z.number().int().positive()),
    component_map: z.record(sourceRef),
    interfaces: z.array(
      z
        .object({
          tag: sourceRef,
          from_tag: identifier,
          to_tag: identifier,
          normal: z.tuple([z.literal(1), z.literal(0)]),
        })
        .strict(),
    ),
  })
  .strict();

const variableSchema = z
  .object({
    id: identifier,
    kind: identifier,
    species_id: identifier.optional(),
    domain_tags: z.array(identifier).min(1),
    unit: sourceRef,
  })
  .strict();

const speciesSchema = z
  .object({
    id: identifier,
    valence: spatialValueSchema,
    molecular_diffusivity: spatialFieldSchema,
    effective_diffusivity: spatialFieldSchema.optional(),
    ion_mobility: spatialFieldSchema.optional(),
    henry_coefficient: spatialFieldSchema.optional(),
    gas_solubility: spatialFieldSchema.optional(),
  })
  .strict();

const boundarySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('dirichlet'),
      tag: sourceRef,
      variable: identifier,
      value: spatialValueSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('neumann'),
      tag: sourceRef,
      variable: identifier,
      value: spatialValueSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('flux'),
      tag: sourceRef,
      variable: identifier,
      value: spatialValueSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('robin'),
      tag: sourceRef,
      variable: identifier,
      ambient: spatialValueSchema,
      coefficient: spatialValueSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('symmetry'),
      tag: sourceRef,
      variable: identifier,
    })
    .strict(),
  z
    .object({
      kind: z.literal('interface_continuity'),
      tag: sourceRef,
      variable: identifier,
    })
    .strict(),
  z
    .object({
      kind: z.literal('circuit_coupling'),
      tag: sourceRef,
      variable: identifier,
    })
    .strict(),
]);

type Bounds = { min?: number; max?: number; exclusive_min?: number };
type Field = z.infer<typeof spatialFieldSchema>;
type VariableSpec = {
  unit: string;
  gradient_unit: string | null;
  flux_unit: string | null;
  robin_coefficient_unit: string | null;
  domains: string[];
  bounds: Bounds;
};
const variableSpecs = spatialVariableAuthority.variables as Record<
  string,
  VariableSpec
>;
const speciesSpecs = spatialVariableAuthority.species_properties as Record<
  string,
  { unit: string; bounds: Bounds }
>;
const materialSpecs = spatialParameterAuthority.parameters as Record<
  string,
  { unit: string; bounds: Bounds; domains: string[]; dimensions: number[] }
>;

/** Data admission only. The mesh URI still needs artifact-store authorization and hash verification. */
export const spatialModelInputV2Schema = z
  .object({
    contract_version: z.literal('spatial-input-v2'),
    model_id: sourceRef,
    system: z.enum(['MFC', 'MEC']),
    dimension: z.literal(2),
    coordinate_system: z.literal('cartesian'),
    axes: z.tuple([z.literal('x'), z.literal('y')]),
    geometry: planarMeshSchema,
    mesh: spatialMeshReferenceSchema,
    material_fields: z.array(
      z
        .object({
          parameter_id: sourceRef,
          domain_tag: identifier,
          field: spatialFieldSchema,
        })
        .strict(),
    ),
    species: z.array(speciesSchema),
    variables: z.array(variableSchema).min(1),
    reaction_laws: z.array(
      z
        .object({
          id: identifier,
          domain_tag: identifier,
          equation_ref: sourceRef,
          stoichiometry: z
            .array(
              z
                .object({
                  species_id: identifier,
                  coefficient: spatialValueSchema,
                })
                .strict(),
            )
            .min(2),
          electron_count: spatialValueSchema,
          proton_count: spatialValueSchema,
        })
        .strict(),
    ),
    initial_conditions: z.array(
      z
        .object({
          variable: identifier,
          domain_tag: identifier,
          field: spatialFieldSchema,
        })
        .strict(),
    ),
    boundary_conditions: z.array(boundarySchema),
    circuit: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('external_load'),
          resistance: spatialValueSchema,
        })
        .strict(),
      z
        .object({
          kind: z.literal('applied_voltage'),
          voltage: spatialValueSchema,
        })
        .strict(),
    ]),
    requested_outputs: z.array(identifier).min(1),
  })
  .strict()
  .superRefine((input, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message });
    const layers = input.geometry.layers;
    const domains = new Map(layers.map((layer) => [layer.tag, layer]));
    const boundarySides = Object.entries(input.geometry.boundaries);
    const boundaries = new Map(
      boundarySides.map(([side, boundary]) => [
        boundary.tag,
        { side, role: boundary.role },
      ]),
    );
    const interfaces: Map<string, readonly [string, string]> = new Map(
      layers.slice(1).map((layer, index) => {
        const from = layers[index].tag;
        return [`interface:${from}:${layer.tag}`, [from, layer.tag]] as const;
      }),
    );
    const expectedGroups = [
      ...layers.map((layer) => `region:${layer.tag}`),
      ...boundarySides.map(([, boundary]) => `boundary:${boundary.tag}`),
      ...interfaces.keys(),
    ];
    if (
      Object.keys(input.mesh.physical_groups).length !==
        expectedGroups.length ||
      expectedGroups.some((tag) => !input.mesh.physical_groups[tag]) ||
      new Set(Object.values(input.mesh.physical_groups)).size !==
        expectedGroups.length
    )
      issue(
        ['mesh', 'physical_groups'],
        'Physical groups must match all declared regions, exterior facets and interfaces',
      );
    const components = Object.fromEntries(
      layers
        .filter((layer) => layer.component_id)
        .map((layer) => [layer.tag, layer.component_id]),
    );
    if (
      Object.keys(input.mesh.component_map).length !==
        Object.keys(components).length ||
      Object.entries(components).some(
        ([tag, component]) => input.mesh.component_map[tag] !== component,
      )
    )
      issue(
        ['mesh', 'component_map'],
        'Mesh component map differs from planar geometry',
      );
    if (
      input.mesh.interfaces.length !== interfaces.size ||
      new Set(input.mesh.interfaces.map((face) => face.tag)).size !==
        interfaces.size ||
      input.mesh.interfaces.some((face) => {
        const pair = interfaces.get(face.tag);
        return !pair || face.from_tag !== pair[0] || face.to_tag !== pair[1];
      })
    )
      issue(
        ['mesh', 'interfaces'],
        'Interfaces must follow adjacent layers with normal [+x]',
      );
    if (
      !input.geometry.refinement_factors.includes(input.mesh.refinement_factor)
    )
      issue(
        ['mesh', 'refinement_factor'],
        'Referenced mesh level is absent from the geometry recipe',
      );
    const width = layers.reduce((sum, layer) => sum + layer.width_m.value, 0);
    const checkField = (
      field: Field,
      path: (string | number)[],
      unit: string,
      bounds: Bounds,
      allowedTags?: string[],
    ) => {
      const values =
        field.kind === 'constant'
          ? [field.value]
          : field.kind === 'piecewise'
            ? field.regions.map(({ value }) => value)
            : field.kind === 'sampled'
              ? field.samples.map(({ value }) => value)
              : [];
      if (field.kind === 'artifact' && field.unit !== unit)
        issue([...path, 'unit'], `Expected ${unit}`);
      values.forEach((value, index) => {
        if (value.unit !== unit)
          issue([...path, index, 'unit'], `Expected ${unit}`);
        if (
          (bounds.min !== undefined && value.value < bounds.min) ||
          (bounds.max !== undefined && value.value > bounds.max) ||
          (bounds.exclusive_min !== undefined &&
            value.value <= bounds.exclusive_min)
        )
          issue([...path, index, 'value'], 'Value outside declared bounds');
      });
      if (field.kind === 'piecewise') {
        const tags = field.regions.map(({ tag }) => tag);
        if (
          new Set(tags).size !== tags.length ||
          tags.some(
            (tag) =>
              !domains.has(tag) || (allowedTags && !allowedTags.includes(tag)),
          )
        )
          issue(
            [...path, 'regions'],
            'Piecewise tags must be unique and within the declared domains',
          );
      }
      if (field.kind === 'sampled') {
        let x0 = 0;
        const ranges = layers.map((layer) => {
          const range = [x0, x0 + layer.width_m.value, layer.tag] as const;
          x0 = range[1];
          return range;
        });
        for (const [index, sample] of field.samples.entries()) {
          const [x, y] = sample.position_m;
          if (
            sample.position_m.length !== 2 ||
            x < 0 ||
            x > width ||
            y < 0 ||
            y > input.geometry.height_m.value ||
            (allowedTags &&
              !ranges.some(
                ([lo, hi, tag]) =>
                  allowedTags.includes(tag) && x >= lo && x <= hi,
              ))
          )
            issue(
              [...path, 'samples', index, 'position_m'],
              'Sample must lie inside its declared domain',
            );
        }
      }
    };
    const unique = (ids: string[], path: string) => {
      if (new Set(ids).size !== ids.length)
        issue([path], `${path} identifiers must be unique`);
    };
    unique(
      input.species.map((entry) => entry.id),
      'species',
    );
    unique(
      input.variables.map((entry) => entry.id),
      'variables',
    );
    unique(
      input.reaction_laws.map((entry) => entry.id),
      'reaction_laws',
    );
    unique(input.requested_outputs, 'requested_outputs');
    const species = new Set(input.species.map((entry) => entry.id));
    input.species.forEach((entry, index) => {
      if (entry.valence.unit !== '1' || !Number.isInteger(entry.valence.value))
        issue(
          ['species', index, 'valence'],
          'Species valence must be an integer with unit 1',
        );
      for (const property of [
        'molecular_diffusivity',
        'effective_diffusivity',
        'ion_mobility',
        'henry_coefficient',
        'gas_solubility',
      ] as const) {
        const field = entry[property];
        if (field)
          checkField(
            field,
            ['species', index, property],
            speciesSpecs[property].unit,
            speciesSpecs[property].bounds,
          );
      }
    });
    const seenMaterials = new Set<string>();
    input.material_fields.forEach((entry, index) => {
      const path = ['material_fields', index] as (string | number)[];
      const layer = domains.get(entry.domain_tag);
      if (!layer) issue([...path, 'domain_tag'], 'Unknown material domain');
      const spec = materialSpecs[entry.parameter_id];
      if (!spec)
        issue([...path, 'parameter_id'], 'Unknown spatial material parameter');
      else {
        if (
          layer &&
          (!spec.domains.includes(layer.kind) || !spec.dimensions.includes(2))
        )
          issue(
            [...path, 'domain_tag'],
            'Material parameter is incompatible with this region',
          );
        checkField(entry.field, [...path, 'field'], spec.unit, spec.bounds, [
          entry.domain_tag,
        ]);
      }
      const key = `${entry.parameter_id}:${entry.domain_tag}`;
      if (seenMaterials.has(key))
        issue(path, 'Duplicate parameter in one domain');
      seenMaterials.add(key);
    });
    const variables = new Map(
      input.variables.map((entry) => [entry.id, entry]),
    );
    input.variables.forEach((entry, index) => {
      const path = ['variables', index] as (string | number)[];
      const spec = variableSpecs[entry.kind];
      if (!spec) {
        issue([...path, 'kind'], 'Unknown variable kind');
        return;
      }
      if (entry.unit !== spec.unit)
        issue([...path, 'unit'], `Expected ${spec.unit}`);
      if (
        (entry.kind === 'species_concentration') !==
          (entry.species_id !== undefined) ||
        (entry.species_id && !species.has(entry.species_id))
      )
        issue(
          [...path, 'species_id'],
          'Species concentration must reference a declared species',
        );
      if (
        new Set(entry.domain_tags).size !== entry.domain_tags.length ||
        entry.domain_tags.some(
          (tag) =>
            !domains.has(tag) || !spec.domains.includes(domains.get(tag)!.kind),
        )
      )
        issue(
          [...path, 'domain_tags'],
          'Variable domains must be unique and physically eligible',
        );
    });
    input.reaction_laws.forEach((entry, index) => {
      const path = ['reaction_laws', index] as (string | number)[];
      if (!domains.has(entry.domain_tag))
        issue([...path, 'domain_tag'], 'Unknown reaction domain');
      const reactants = entry.stoichiometry.map(
        (term) => term.coefficient.value,
      );
      if (
        !reactants.some((value) => value < 0) ||
        !reactants.some((value) => value > 0) ||
        new Set(entry.stoichiometry.map((term) => term.species_id)).size !==
          entry.stoichiometry.length
      )
        issue(
          [...path, 'stoichiometry'],
          'Reaction needs unique species, a reactant and a product',
        );
      entry.stoichiometry.forEach((term, termIndex) => {
        if (
          !species.has(term.species_id) ||
          term.coefficient.unit !== '1' ||
          term.coefficient.value === 0
        )
          issue(
            [...path, 'stoichiometry', termIndex],
            'Stoichiometry needs a declared species and nonzero dimensionless coefficient',
          );
      });
      if (
        entry.electron_count.unit !== '1' ||
        !Number.isInteger(entry.electron_count.value) ||
        entry.electron_count.value < 0 ||
        entry.proton_count.unit !== '1' ||
        !Number.isInteger(entry.proton_count.value)
      )
        issue(path, 'Electron/proton counts require dimensionless integers');
    });
    input.initial_conditions.forEach((entry, index) => {
      const path = ['initial_conditions', index] as (string | number)[];
      const variable = variables.get(entry.variable);
      const spec = variable && variableSpecs[variable.kind];
      if (
        !variable ||
        !spec ||
        !variable.domain_tags.includes(entry.domain_tag)
      )
        issue(
          path,
          'Initial condition needs a variable declared in this domain',
        );
      else
        checkField(entry.field, [...path, 'field'], spec.unit, spec.bounds, [
          entry.domain_tag,
        ]);
    });
    unique(
      input.initial_conditions.map(
        (entry) => `${entry.variable}:${entry.domain_tag}`,
      ),
      'initial_conditions',
    );
    const assigned = new Set<string>();
    input.boundary_conditions.forEach((entry, index) => {
      const path = ['boundary_conditions', index] as (string | number)[];
      const variable = variables.get(entry.variable);
      const spec = variable && variableSpecs[variable.kind];
      if (!variable || !spec) {
        issue([...path, 'variable'], 'Unknown boundary variable');
        return;
      }
      const boundary = boundaries.get(entry.tag);
      const pair = interfaces.get(entry.tag);
      if (entry.kind === 'interface_continuity') {
        if (!pair || !pair.every((tag) => variable.domain_tags.includes(tag)))
          issue(
            [...path, 'tag'],
            'Interface continuity needs the variable in both adjacent domains',
          );
      } else {
        if (!boundary) {
          issue([...path, 'tag'], 'Exterior boundary tag required');
          return;
        }
        const adjacent =
          boundary.side === 'left'
            ? [layers[0].tag]
            : boundary.side === 'right'
              ? [layers[layers.length - 1].tag]
              : layers.map((layer) => layer.tag);
        if (!adjacent.every((tag) => variable.domain_tags.includes(tag)))
          issue(
            [...path, 'variable'],
            'Variable must exist in every domain touched by this facet group',
          );
        if (entry.kind === 'symmetry' && boundary.role !== 'wall')
          issue([...path, 'tag'], 'Symmetry requires a wall facet');
        if (
          entry.kind === 'circuit_coupling' &&
          (boundary.role !== 'electrode' || variable.kind !== 'solid_potential')
        )
          issue(
            path,
            'Circuit coupling requires solid potential on an electrode terminal',
          );
        if (entry.kind === 'dirichlet' && entry.value.unit !== spec.unit)
          issue([...path, 'value'], `Expected ${spec.unit}`);
        if (
          entry.kind === 'dirichlet' &&
          ((spec.bounds.min !== undefined &&
            entry.value.value < spec.bounds.min) ||
            (spec.bounds.exclusive_min !== undefined &&
              entry.value.value <= spec.bounds.exclusive_min))
        )
          issue(
            [...path, 'value'],
            'Prescribed value is outside variable bounds',
          );
        if (
          entry.kind === 'neumann' &&
          (!spec.gradient_unit || entry.value.unit !== spec.gradient_unit)
        )
          issue(
            [...path, 'value'],
            `Expected gradient in ${spec.gradient_unit ?? 'unsupported unit'}`,
          );
        if (
          entry.kind === 'flux' &&
          (!spec.flux_unit || entry.value.unit !== spec.flux_unit)
        )
          issue(
            [...path, 'value'],
            `Expected flux in ${spec.flux_unit ?? 'unsupported unit'}`,
          );
        if (
          entry.kind === 'robin' &&
          (!spec.robin_coefficient_unit ||
            entry.ambient.unit !== spec.unit ||
            entry.coefficient.unit !== spec.robin_coefficient_unit ||
            entry.coefficient.value < 0 ||
            (spec.bounds.min !== undefined &&
              entry.ambient.value < spec.bounds.min))
        )
          issue(
            path,
            'Robin needs ambient variable unit and nonnegative variable-specific coefficient',
          );
      }
      const key = `${entry.tag}:${entry.variable}`;
      if (assigned.has(key))
        issue(
          path,
          'Conflicting boundary conditions for one variable and facet',
        );
      assigned.add(key);
    });
    if (
      input.system === 'MFC' &&
      (input.circuit.kind !== 'external_load' ||
        input.circuit.resistance.unit !== 'ohm' ||
        input.circuit.resistance.value <= 0)
    )
      issue(['circuit'], 'MFC requires a positive external load in ohm');
    if (
      input.system === 'MEC' &&
      (input.circuit.kind !== 'applied_voltage' ||
        input.circuit.voltage.unit !== 'V' ||
        input.circuit.voltage.value <= 0)
    )
      issue(['circuit'], 'MEC requires a positive applied voltage in V');
    input.requested_outputs.forEach((id, index) => {
      if (!variables.has(id))
        issue(
          ['requested_outputs', index],
          'Output requires a declared variable',
        );
    });
  });

export type SpatialModelInputV2 = z.infer<typeof spatialModelInputV2Schema>;

/** Bind an independently verified sidecar manifest to an immutable artifact URI. */
export function meshReferenceFromSidecar(
  candidate: SpatialSidecarResponse,
  refinementFactor: number,
  uri: string,
): z.infer<typeof spatialMeshReferenceSchema> {
  const response = spatialSidecarResponseSchema.parse(candidate);
  if (
    response.status !== 'ok' ||
    response.operation !== 'planar_mesh' ||
    !response.metadata.gmsh_version
  )
    throw new RangeError('A successful Gmsh mesh manifest is required');
  const artifact = response.artifacts.find(
    (entry) => entry.refinement_factor === refinementFactor,
  );
  if (!artifact)
    throw new RangeError('Requested mesh level is absent from the manifest');
  return spatialMeshReferenceSchema.parse({
    kind: 'generated_mesh',
    uri,
    sha256: artifact.sha256,
    format: artifact.format,
    refinement_factor: artifact.refinement_factor,
    input_sha256: response.input_sha256,
    sidecar_version: response.metadata.sidecar_version,
    gmsh_version: response.metadata.gmsh_version,
    physical_groups: response.physical_groups,
    component_map: response.component_map,
    interfaces: response.interfaces,
  });
}
