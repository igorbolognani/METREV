import { z } from 'zod';
import { spatialValueSchema } from './spatial-model-schema';
import {
  structuredCellInputSchema,
  type StructuredCellInput,
} from './structured-cell-schema';
import { structuredCellTopology } from './structured-cell-topology';
import { structuredCellFieldExtremumSchema } from './structured-cell-observables';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const finite = z.number().finite();
const id = z.string().trim().min(1).max(160);
const fieldUnit = z.enum(['mol/m3', 'V', 'A/m3', 'Pa', 'm/s']);

/** The bounded external field payload, never an observation/measurement. */
export const structuredCellFieldSamplesSchema = z
  .object({
    id,
    unit: fieldUnit,
    values: z.array(finite).min(1).max(20000),
    cells: z.array(z.number().int().nonnegative().max(19999)).min(1).max(20000),
  })
  .strict();
export type StructuredCellFieldSamples = z.infer<
  typeof structuredCellFieldSamplesSchema
>;

export function validateStructuredCellFieldSamples(
  value: unknown,
  input: StructuredCellInput,
): StructuredCellFieldSamples {
  const data = structuredCellFieldSamplesSchema.parse(value);
  const mesh = structuredCellTopology(input);
  const region =
    data.id === 'solid_potential_anode'
      ? 0
      : data.id === 'solid_potential_cathode'
        ? input.geometry.layers.length - 1
        : null;
  const hydraulicField =
    data.id === 'darcy_pressure' || /^darcy_velocity_[xyz]$/.test(data.id);
  const ids = new Set([
    'liquid_potential',
    'solid_potential_anode',
    'solid_potential_cathode',
    'faradaic_current_density',
    ...('hydraulics' in input && input.hydraulics
      ? [
          'darcy_pressure',
          ...['x', 'y', ...(input.dimension === 3 ? ['z'] : [])].map(
            (axis) => 'darcy_velocity_' + axis,
          ),
        ]
      : []),
    ...input.species.map((species) => 'concentration_' + species.id),
  ]);
  const expected = mesh.region_index.flatMap((r, cell) =>
    (region === null || r === region) &&
    (!hydraulicField || input.geometry.layers[r].kind !== 'membrane')
      ? [cell]
      : [],
  );
  const expectedUnit = data.id.startsWith('concentration_')
    ? 'mol/m3'
    : data.id === 'darcy_pressure'
      ? 'Pa'
      : data.id.startsWith('darcy_velocity_')
        ? 'm/s'
        : data.id === 'faradaic_current_density'
          ? 'A/m3'
          : 'V';
  if (
    !ids.has(data.id) ||
    data.unit !== expectedUnit ||
    data.values.length !== expected.length ||
    data.cells.length !== expected.length ||
    data.cells.some((cell, index) => cell !== expected[index]) ||
    (data.unit === 'mol/m3' && data.values.some((v) => v < 0)) ||
    (data.id === 'faradaic_current_density' &&
      data.cells.some(
        (cell, index) =>
          input.geometry.layers[mesh.region_index[cell]].kind === 'membrane' &&
          data.values[index] !== 0,
      ))
  )
    throw new Error(
      'Field samples differ from the admitted cell topology or unit',
    );
  return data;
}

const statistics = z
  .object({
    sample_count: z.number().int().positive().max(20000),
    physical_volume_m3: finite.positive(),
    volume_weighted_mean: finite,
    volume_weighted_standard_deviation: finite.nonnegative(),
    physical_integral: finite,
    physical_integral_unit: z.enum(['mol', 'V*m3', 'A', 'Pa*m3', 'm4/s']),
    current_rms_uniformity: finite.min(0).max(1).nullable(),
    minimum: structuredCellFieldExtremumSchema,
    maximum: structuredCellFieldExtremumSchema,
  })
  .strict()
  .superRefine((stats, context) => {
    if (
      stats.minimum.value > stats.volume_weighted_mean ||
      stats.volume_weighted_mean > stats.maximum.value ||
      stats.minimum.unit !== stats.maximum.unit
    )
      context.addIssue({
        code: 'custom',
        message: 'Invalid weighted field statistics',
      });
    if (
      (stats.minimum.unit !== 'A/m3' &&
        stats.current_rms_uniformity !== null) ||
      stats.physical_integral_unit !==
        (stats.minimum.unit === 'mol/m3'
          ? 'mol'
          : stats.minimum.unit === 'A/m3'
            ? 'A'
            : stats.minimum.unit === 'Pa'
              ? 'Pa*m3'
              : stats.minimum.unit === 'm/s'
                ? 'm4/s'
                : 'V*m3')
    )
      context.addIssue({
        code: 'custom',
        message: 'Weighted statistic unit/meaning mismatch',
      });
    const expectedUniformity =
      stats.minimum.unit === 'A/m3'
        ? Math.hypot(
            stats.volume_weighted_mean,
            stats.volume_weighted_standard_deviation,
          ) > 0
          ? Math.abs(stats.volume_weighted_mean) /
            Math.hypot(
              stats.volume_weighted_mean,
              stats.volume_weighted_standard_deviation,
            )
          : null
        : null;
    if (
      expectedUniformity === null
        ? stats.current_rms_uniformity !== null
        : stats.current_rms_uniformity === null ||
          Math.abs(stats.current_rms_uniformity - expectedUniformity) > 1e-12
    )
      context.addIssue({
        code: 'custom',
        message: 'Current RMS uniformity must bind to the weighted moments',
      });
  });

export const structuredCellFieldThresholdSchema = z
  .object({
    threshold_id: id,
    field_id: id,
    domain_tag: id.nullable(),
    comparison: z.enum(['lt', 'lte', 'gt', 'gte']),
    threshold: spatialValueSchema,
  })
  .strict();

/** Thresholds have no implicit defaults or biological/decision interpretation. */
export const structuredCellFieldReductionRequestSchema = z
  .object({ thresholds: z.array(structuredCellFieldThresholdSchema).max(16) })
  .strict()
  .superRefine((request, context) => {
    if (
      new Set(request.thresholds.map((t) => t.threshold_id)).size !==
      request.thresholds.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Threshold identifiers must be unique',
      });
  });

const thresholdRegion = structuredCellFieldThresholdSchema
  .extend({
    record_kind: z.literal('modeled_threshold_region'),
    sampled_cells: z.number().int().positive().max(20000),
    matching_cells: z.number().int().nonnegative().max(20000),
    domain_volume_m3: finite.positive(),
    matching_volume_m3: finite.nonnegative(),
    volume_fraction: finite.min(0).max(1),
    representative_cells: z.array(structuredCellFieldExtremumSchema).max(64),
    omitted_matching_cells: z.number().int().nonnegative().max(20000),
  })
  .strict();

export const structuredCellFieldReductionSchema = z
  .object({
    contract_version: z.literal('structured-cell-field-reduction-v1'),
    record_kind: z.literal('modeled_field_observations'),
    source_kind: z.literal('modeled_field_artifact'),
    result_role: z.enum([
      'modeled_development_result',
      'failed_run_diagnostics',
    ]),
    decision_eligible: z.literal(false),
    independent_validation: z.literal(false),
    algorithm: z.literal('physical_volume_weighted_cell_statistics_v1'),
    input_sha256: digest,
    mesh_sha256: digest,
    geometry_request_sha256: digest,
    threshold_request_sha256: digest.nullable(),
    spatial_weighting: z.literal(
      'physical_cell_volume_including_declared_2d_depth',
    ),
    current_uniformity_definition: z.literal(
      'abs(volume_weighted_mean)/volume_weighted_rms; null if rms=0',
    ),
    fields: z
      .array(
        z
          .object({
            field_id: id,
            field_artifact_sha256: digest,
            dataset_path: z.literal('/values'),
            association: z.literal('mesh_cells'),
            unit: fieldUnit,
            global: statistics,
            domains: z
              .array(
                z
                  .object({
                    domain_tag: id,
                    region_index: z.number().int().nonnegative().max(127),
                    statistics,
                  })
                  .strict(),
              )
              .min(1)
              .max(128),
          })
          .strict(),
      )
      .min(1)
      .max(32),
    threshold_regions: z.array(thresholdRegion).max(16),
    electrode_overpotentials: z
      .array(
        z
          .object({
            role: z.enum(['anode', 'cathode']),
            domain_tag: id,
            formula: z.literal(
              'solid_potential-liquid_potential-equilibrium_potential',
            ),
            equilibrium_potential: spatialValueSchema,
            source_fields: z
              .array(z.object({ field_id: id, sha256: digest }).strict())
              .length(2),
            statistics,
          })
          .strict(),
      )
      .max(2),
    hydraulic_boundary_pressure_differences: z
      .array(
        z
          .object({
            axis: z.enum(['x', 'y', 'z']),
            minimum_face_pressure: spatialValueSchema,
            maximum_face_pressure: spatialValueSchema,
            imposed_pressure_difference_Pa: finite,
            pressure_field_sha256: digest,
            record_kind: z.literal('modeled_boundary_pressure_difference'),
          })
          .strict(),
      )
      .max(3),
    unsupported_observables: z
      .array(z.object({ observable: id, reason: z.string().min(1) }).strict())
      .max(32),
  })
  .strict()
  .superRefine((reduction, context) => {
    const problem = (message: string) =>
      context.addIssue({ code: 'custom', message });
    if (
      new Set(reduction.fields.map((f) => f.field_id)).size !==
      reduction.fields.length
    )
      problem('Reduced fields must be unique');
    if (
      reduction.threshold_regions.length > 0 &&
      reduction.threshold_request_sha256 === null
    )
      problem('Explicit thresholds require their request digest');
    for (const field of reduction.fields) {
      if (
        field.global.minimum.unit !== field.unit ||
        field.global.maximum.unit !== field.unit ||
        new Set(field.domains.map((d) => d.domain_tag)).size !==
          field.domains.length ||
        field.domains.some(
          (d) =>
            d.statistics.minimum.unit !== field.unit ||
            d.statistics.maximum.unit !== field.unit,
        )
      )
        problem('Reduced field domain identity or units differ');
      const volume = field.domains.reduce(
        (sum, d) => sum + d.statistics.physical_volume_m3,
        0,
      );
      const integral = field.domains.reduce(
        (sum, d) => sum + d.statistics.physical_integral,
        0,
      );
      const scale = field.domains.reduce(
        (sum, d) => sum + Math.abs(d.statistics.physical_integral),
        0,
      );
      const close = (a: number, b: number) =>
        Math.abs(a - b) <=
        1e-12 * Math.max(Math.abs(a), Math.abs(b), scale, 1e-30);
      if (
        !close(volume, field.global.physical_volume_m3) ||
        !close(integral, field.global.physical_integral) ||
        !close(field.global.volume_weighted_mean * volume, integral) ||
        field.domains.reduce((sum, d) => sum + d.statistics.sample_count, 0) !==
          field.global.sample_count
      )
        problem(
          'Global statistics must close against physical domain volumes and integrals',
        );
    }
    for (const region of reduction.threshold_regions) {
      const field = reduction.fields.find(
        (f) => f.field_id === region.field_id,
      );
      const scope =
        region.domain_tag === null
          ? field?.global
          : field?.domains.find((d) => d.domain_tag === region.domain_tag)
              ?.statistics;
      if (
        !scope ||
        region.threshold.unit !== field?.unit ||
        region.sampled_cells !== scope.sample_count ||
        region.matching_cells > region.sampled_cells ||
        Math.abs(region.domain_volume_m3 - scope.physical_volume_m3) >
          1e-12 * scope.physical_volume_m3 ||
        region.representative_cells.length + region.omitted_matching_cells !==
          region.matching_cells ||
        region.matching_volume_m3 > region.domain_volume_m3 ||
        Math.abs(
          region.volume_fraction -
            region.matching_volume_m3 / region.domain_volume_m3,
        ) > 1e-12
      )
        problem('Threshold region does not match its field/domain/volume');
      const predicate = (value: number) =>
        region.comparison === 'lt'
          ? value < region.threshold.value
          : region.comparison === 'lte'
            ? value <= region.threshold.value
            : region.comparison === 'gt'
              ? value > region.threshold.value
              : value >= region.threshold.value;
      if (
        new Set(region.representative_cells.map((p) => p.cell_index)).size !==
          region.representative_cells.length ||
        region.representative_cells.some(
          (p) =>
            p.unit !== region.threshold.unit ||
            !predicate(p.value) ||
            (region.domain_tag !== null && p.domain_tag !== region.domain_tag),
        )
      )
        problem(
          'Threshold coordinates must satisfy the explicit field predicate',
        );
    }
  });
export type StructuredCellFieldReduction = z.infer<
  typeof structuredCellFieldReductionSchema
>;

/** Metadata binding; field samples are independently checked when derived or read. */
export function assertStructuredCellFieldReductionBinding(
  reduction: StructuredCellFieldReduction,
  result: {
    input_sha256: string;
    mesh: { artifact: { sha256: string }; request_sha256: string };
    fields: {
      field_id: string;
      unit: string;
      domain_tags: string[];
      artifact: { sha256: string; dataset_path: string };
      summary?: {
        sample_count: number;
        minimum: number;
        maximum: number;
        mean: number;
        integral: number;
      };
    }[];
    convergence: { status: string }[];
    conservation_residuals: { passed: boolean }[];
  },
  input?: StructuredCellInput,
): void {
  if (
    reduction.input_sha256 !== result.input_sha256 ||
    reduction.mesh_sha256 !== result.mesh.artifact.sha256 ||
    reduction.geometry_request_sha256 !== result.mesh.request_sha256 ||
    reduction.fields.length !== result.fields.length ||
    reduction.threshold_request_sha256 !== null ||
    reduction.threshold_regions.length !== 0 ||
    reduction.result_role !==
      (result.convergence.every((c) => c.status === 'converged') &&
      result.conservation_residuals.every((r) => r.passed)
        ? 'modeled_development_result'
        : 'failed_run_diagnostics')
  )
    throw new Error(
      'Field reduction identity or numerical role differs from its persisted result',
    );
  const close = (a: number, b: number) =>
    Math.abs(a - b) <= 1e-12 * Math.max(Math.abs(a), Math.abs(b), 1e-30);
  const topology = input ? structuredCellTopology(input) : null;
  const depth =
    input?.dimension === 2 ? input.geometry.out_of_plane_depth!.value : 1;
  for (const entry of reduction.fields) {
    const field = result.fields.find((f) => f.field_id === entry.field_id);
    if (
      !field ||
      !field.summary ||
      entry.unit !== field.unit ||
      entry.field_artifact_sha256 !== field.artifact.sha256 ||
      entry.dataset_path !== field.artifact.dataset_path ||
      entry.global.sample_count !== field.summary.sample_count ||
      entry.global.minimum.value !== field.summary.minimum ||
      entry.global.maximum.value !== field.summary.maximum ||
      Math.abs(entry.global.volume_weighted_mean - field.summary.mean) >
        1e-12 *
          Math.max(
            Math.abs(field.summary.minimum),
            Math.abs(field.summary.maximum),
            1e-30,
          ) ||
      (input &&
        Math.abs(
          entry.global.physical_integral - field.summary.integral * depth,
        ) >
          1e-12 *
            Math.max(
              Math.abs(field.summary.minimum),
              Math.abs(field.summary.maximum),
              1e-30,
            ) *
            entry.global.physical_volume_m3) ||
      [...entry.domains.map((d) => d.domain_tag)].sort().join() !==
        [...field.domain_tags].sort().join()
    )
      throw new Error(
        'Field reduction differs from the persisted field manifest',
      );
    if (input && topology)
      for (const domain of entry.domains) {
        const cells = topology.region_index.flatMap((region, cell) =>
          region === domain.region_index ? [cell] : [],
        );
        const volume = cells.reduce(
          (sum, cell) => sum + topology.volumes_m3[cell],
          0,
        );
        if (
          input.geometry.layers[domain.region_index]?.tag !==
            domain.domain_tag ||
          cells.length !== domain.statistics.sample_count ||
          !close(volume, domain.statistics.physical_volume_m3)
        )
          throw new Error(
            'Field reduction domain differs from the immutable mesh',
          );
        for (const point of [
          domain.statistics.minimum,
          domain.statistics.maximum,
        ]) {
          const cell = point.cell_index;
          if (
            point.region_index !== domain.region_index ||
            point.domain_tag !== domain.domain_tag ||
            topology.region_index[cell] !== domain.region_index ||
            point.cell_center_m.length !== input.dimension ||
            point.cell_size_m.length !== input.dimension ||
            point.cell_center_m.some(
              (v, axis) => !close(v, topology.centers_m[cell]?.[axis]),
            ) ||
            point.cell_size_m.some(
              (v, axis) => !close(v, topology.sizes_m[cell]?.[axis]),
            )
          )
            throw new Error(
              'Field reduction extrema do not match their domain mesh cells',
            );
        }
      }
  }
  for (const electrode of reduction.electrode_overpotentials) {
    if (
      electrode.equilibrium_potential.unit !== 'V' ||
      electrode.statistics.minimum.unit !== 'V' ||
      electrode.source_fields.some(
        (source) =>
          !result.fields.some(
            (field) =>
              field.field_id === source.field_id &&
              field.artifact.sha256 === source.sha256,
          ),
      )
    )
      throw new Error(
        'Overpotential differs from its source fields or voltage unit',
      );
    if (input) {
      const admitted = input.electrodes.find(
        (e) =>
          e.role === electrode.role && e.domain_tag === electrode.domain_tag,
      );
      if (
        !admitted ||
        JSON.stringify(admitted.equilibrium_potential) !==
          JSON.stringify(electrode.equilibrium_potential)
      )
        throw new Error(
          'Overpotential equilibrium parameter differs from its immutable input',
        );
    }
  }
  for (const pressure of reduction.hydraulic_boundary_pressure_differences)
    if (
      pressure.minimum_face_pressure.unit !== 'Pa' ||
      pressure.maximum_face_pressure.unit !== 'Pa' ||
      pressure.imposed_pressure_difference_Pa !==
        pressure.minimum_face_pressure.value -
          pressure.maximum_face_pressure.value ||
      !result.fields.some(
        (field) =>
          field.field_id === 'darcy_pressure' &&
          field.artifact.sha256 === pressure.pressure_field_sha256,
      )
    )
      throw new Error(
        'Hydraulic pressure difference requires the solved field and sourced Pa boundaries',
      );
}

export function deriveStructuredCellFieldReduction(options: {
  input: StructuredCellInput;
  input_sha256: string;
  mesh_sha256: string;
  geometry_request_sha256: string;
  numerical_status: 'converged' | 'not_converged';
  fields: { samples: StructuredCellFieldSamples; artifact_sha256: string }[];
  thresholds?: z.infer<typeof structuredCellFieldThresholdSchema>[];
  threshold_request_sha256?: string;
}): StructuredCellFieldReduction {
  const input = structuredCellInputSchema.parse(options.input);
  const mesh = structuredCellTopology(input);
  const fields = options.fields.map((entry) => ({
    ...entry,
    samples: validateStructuredCellFieldSamples(entry.samples, input),
  }));
  const thresholds = structuredCellFieldReductionRequestSchema.parse({
    thresholds: options.thresholds ?? [],
  }).thresholds;
  const point = (field: StructuredCellFieldSamples, index: number) => {
    const cell = field.cells[index];
    const region = mesh.region_index[cell];
    return {
      value: field.values[index],
      unit: field.unit,
      cell_index: cell,
      cell_center_m: mesh.centers_m[cell],
      cell_size_m: mesh.sizes_m[cell],
      region_index: region,
      domain_tag: input.geometry.layers[region].tag,
    };
  };
  const stats = (field: StructuredCellFieldSamples, indices: number[]) => {
    const weights = indices.map((i) => mesh.volumes_m3[field.cells[i]]);
    const total = weights.reduce((sum, w) => sum + w, 0);
    let smallest = indices[0],
      largest = indices[0];
    for (const i of indices) {
      if (
        field.values[i] < field.values[smallest] ||
        (field.values[i] === field.values[smallest] &&
          field.cells[i] < field.cells[smallest])
      )
        smallest = i;
      if (
        field.values[i] > field.values[largest] ||
        (field.values[i] === field.values[largest] &&
          field.cells[i] < field.cells[largest])
      )
        largest = i;
    }
    const minimum = field.values[smallest];
    const mean =
      minimum +
      indices.reduce(
        (sum, i, j) => sum + (field.values[i] - minimum) * weights[j],
        0,
      ) /
        total;
    const variance =
      indices.reduce(
        (sum, i, j) => sum + (field.values[i] - mean) ** 2 * weights[j],
        0,
      ) / total;
    const deviation = Math.sqrt(variance);
    const rms = Math.hypot(mean, deviation);
    return {
      sample_count: indices.length,
      physical_volume_m3: total,
      volume_weighted_mean: mean,
      volume_weighted_standard_deviation: deviation,
      physical_integral: indices.reduce(
        (sum, i, j) => sum + field.values[i] * weights[j],
        0,
      ),
      physical_integral_unit:
        field.unit === 'mol/m3'
          ? ('mol' as const)
          : field.unit === 'A/m3'
            ? ('A' as const)
            : field.unit === 'Pa'
              ? ('Pa*m3' as const)
              : field.unit === 'm/s'
                ? ('m4/s' as const)
                : ('V*m3' as const),
      current_rms_uniformity:
        field.unit === 'A/m3' && rms > 0 ? Math.abs(mean) / rms : null,
      minimum: point(field, smallest),
      maximum: point(field, largest),
    };
  };
  const reduced = fields.map(({ samples, artifact_sha256 }) => ({
    field_id: samples.id,
    field_artifact_sha256: artifact_sha256,
    dataset_path: '/values' as const,
    association: 'mesh_cells' as const,
    unit: samples.unit,
    global: stats(
      samples,
      samples.cells.map((_, i) => i),
    ),
    domains: input.geometry.layers.flatMap((layer, region) => {
      const indices = samples.cells.flatMap((cell, i) =>
        mesh.region_index[cell] === region ? [i] : [],
      );
      return indices.length === 0
        ? []
        : [
            {
              domain_tag: layer.tag,
              region_index: region,
              statistics: stats(samples, indices),
            },
          ];
    }),
  }));
  const regions = thresholds.map((threshold) => {
    const field = fields.find(
      (f) => f.samples.id === threshold.field_id,
    )?.samples;
    if (!field || threshold.threshold.unit !== field.unit)
      throw new Error('Threshold field or SI unit is unavailable');
    if (
      threshold.domain_tag !== null &&
      !input.geometry.layers.some((l) => l.tag === threshold.domain_tag)
    )
      throw new Error('Threshold domain is unavailable');
    const indices = field.cells.flatMap((cell, index) =>
      threshold.domain_tag === null ||
      input.geometry.layers[mesh.region_index[cell]].tag ===
        threshold.domain_tag
        ? [index]
        : [],
    );
    if (indices.length === 0)
      throw new Error('Threshold domain has no field samples');
    const matches = indices.filter((index) => {
      const value = field.values[index],
        bound = threshold.threshold.value;
      return threshold.comparison === 'lt'
        ? value < bound
        : threshold.comparison === 'lte'
          ? value <= bound
          : threshold.comparison === 'gt'
            ? value > bound
            : value >= bound;
    });
    const volume = indices.reduce(
      (sum, index) => sum + mesh.volumes_m3[field.cells[index]],
      0,
    );
    const matchingVolume = matches.reduce(
      (sum, index) => sum + mesh.volumes_m3[field.cells[index]],
      0,
    );
    return {
      ...threshold,
      record_kind: 'modeled_threshold_region' as const,
      sampled_cells: indices.length,
      matching_cells: matches.length,
      domain_volume_m3: volume,
      matching_volume_m3: matchingVolume,
      volume_fraction: matchingVolume / volume,
      representative_cells: matches
        .slice(0, 64)
        .map((index) => point(field, index)),
      omitted_matching_cells: Math.max(0, matches.length - 64),
    };
  });
  const overpotentials = input.electrodes.flatMap((electrode) => {
    const liquid = fields.find((f) => f.samples.id === 'liquid_potential');
    const solid = fields.find(
      (f) => f.samples.id === 'solid_potential_' + electrode.role,
    );
    if (!liquid || !solid) return [];
    const liquidByCell = new Map(
      liquid.samples.cells.map((cell, index) => [
        cell,
        liquid.samples.values[index],
      ]),
    );
    const samples: StructuredCellFieldSamples = {
      id: 'overpotential_' + electrode.role,
      unit: 'V',
      cells: solid.samples.cells,
      values: solid.samples.cells.map(
        (cell, index) =>
          solid.samples.values[index] -
          liquidByCell.get(cell)! -
          electrode.equilibrium_potential.value,
      ),
    };
    return [
      {
        role: electrode.role,
        domain_tag: electrode.domain_tag,
        formula:
          'solid_potential-liquid_potential-equilibrium_potential' as const,
        equilibrium_potential: electrode.equilibrium_potential,
        source_fields: [
          { field_id: solid.samples.id, sha256: solid.artifact_sha256 },
          { field_id: liquid.samples.id, sha256: liquid.artifact_sha256 },
        ],
        statistics: stats(
          samples,
          samples.cells.map((_, index) => index),
        ),
      },
    ];
  });
  const hydraulic =
    'hydraulics' in input && input.hydraulics
      ? z
          .object({ boundary_pressure: z.record(spatialValueSchema) })
          .passthrough()
          .parse(input.hydraulics)
      : null;
  const pressure = fields.find(
    (field) => field.samples.id === 'darcy_pressure',
  );
  const pressureDifferences =
    hydraulic && pressure
      ? (['x', 'y', 'z'] as const).flatMap((axis) => {
          const low = hydraulic.boundary_pressure[axis + '_min'];
          const high = hydraulic.boundary_pressure[axis + '_max'];
          return low && high
            ? [
                {
                  axis,
                  minimum_face_pressure: low,
                  maximum_face_pressure: high,
                  imposed_pressure_difference_Pa: low.value - high.value,
                  pressure_field_sha256: pressure.artifact_sha256,
                  record_kind: 'modeled_boundary_pressure_difference' as const,
                },
              ]
            : [];
        })
      : [];
  return structuredCellFieldReductionSchema.parse({
    contract_version: 'structured-cell-field-reduction-v1',
    record_kind: 'modeled_field_observations',
    source_kind: 'modeled_field_artifact',
    result_role:
      options.numerical_status === 'converged'
        ? 'modeled_development_result'
        : 'failed_run_diagnostics',
    decision_eligible: false,
    independent_validation: false,
    algorithm: 'physical_volume_weighted_cell_statistics_v1',
    input_sha256: options.input_sha256,
    mesh_sha256: options.mesh_sha256,
    geometry_request_sha256: options.geometry_request_sha256,
    threshold_request_sha256: options.threshold_request_sha256 ?? null,
    spatial_weighting: 'physical_cell_volume_including_declared_2d_depth',
    current_uniformity_definition:
      'abs(volume_weighted_mean)/volume_weighted_rms; null if rms=0',
    fields: reduced,
    threshold_regions: regions,
    electrode_overpotentials: overpotentials,
    hydraulic_boundary_pressure_differences: pressureDifferences,
    unsupported_observables: [
      {
        observable: 'surface_current_density_A_m2',
        reason:
          'The modeled Faradaic source is volumetric A/m3; no resolved surface-area transfer map is supplied.',
      },
      ...(!pressure
        ? [
            {
              observable: 'pressure_drop',
              reason:
                'No solved pressure field is present; prescribed flow does not establish hydraulic pressure drop.',
            },
          ]
        : []),
      {
        observable: 'ph_excursion',
        reason:
          'No coupled proton/speciation or pH field is solved by this profile.',
      },
      {
        observable: 'active_electrode_fraction',
        reason:
          'No reviewed or user-supplied biological activity classification is implied by current variation.',
      },
      {
        observable: 'hydrogen_production_and_capture',
        reason:
          'No resolved gas/product transfer and capture accounting is supplied by this profile.',
      },
      {
        observable: 'energy_loss_breakdown',
        reason:
          'The circuit records net signed electrical power; it does not resolve a complete audited loss decomposition.',
      },
    ],
  });
}
