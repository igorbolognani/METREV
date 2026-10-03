import {
  spatialFieldSchema,
  spatialParameterAuthority,
  type SpatialModelInput,
} from './spatial-model-schema';

export type SpatialField =
  SpatialModelInput['material_fields'][number]['field'];
export type SpatialQuantity = Extract<
  SpatialField,
  { kind: 'constant' }
>['value'];
export interface SpatialFieldPoint {
  dimension: 1 | 2 | 3;
  domain_tag: string;
  position_m: readonly number[];
}
export interface SpatialParameterBounds {
  min?: number;
  max?: number;
  exclusive_min?: number;
  integer?: boolean;
  nonzero?: boolean;
}
export interface SpatialFieldEvaluation {
  quantity: SpatialQuantity;
  method: 'constant' | 'piecewise' | 'nearest' | 'multilinear';
  /** Original values and locators are retained, including derived assumptions. */
  contributors: Array<{ quantity: SpatialQuantity; weight: number }>;
}

function assertQuantity(
  quantity: SpatialQuantity,
  unit: string,
  bounds: SpatialParameterBounds,
): void {
  if (quantity.unit !== unit)
    throw new RangeError(`Expected canonical field unit ${unit}`);
  if (
    (bounds.min !== undefined && quantity.value < bounds.min) ||
    (bounds.max !== undefined && quantity.value > bounds.max) ||
    (bounds.exclusive_min !== undefined &&
      quantity.value <= bounds.exclusive_min) ||
    (bounds.integer === true && !Number.isInteger(quantity.value)) ||
    (bounds.nonzero === true && quantity.value === 0)
  )
    throw new RangeError('Field value is outside physical parameter bounds');
}

/**
 * Evaluate explicitly supplied coefficients. Linear interpolation requires
 * tensor-product sample corners; no extrapolation or hidden field defaults.
 * Artifact fields must be loaded and hash checked by the artifact service first.
 */
export function evaluateSpatialField(
  candidate: SpatialField,
  point: SpatialFieldPoint,
  unit: string,
  bounds: SpatialParameterBounds = {},
): SpatialFieldEvaluation {
  const field = spatialFieldSchema.parse(candidate);
  if (
    point.position_m.length !== point.dimension ||
    point.position_m.some((coordinate) => !Number.isFinite(coordinate))
  )
    throw new RangeError(
      'Field query coordinates must match the declared dimension',
    );
  const exact = (
    quantity: SpatialQuantity,
    method: SpatialFieldEvaluation['method'],
  ): SpatialFieldEvaluation => {
    assertQuantity(quantity, unit, bounds);
    return {
      quantity: { ...quantity },
      method,
      contributors: [{ quantity, weight: 1 }],
    };
  };
  if (field.kind === 'artifact')
    throw new RangeError(
      'Artifact coefficients require a hash-verified field loader',
    );
  if (field.kind === 'constant') return exact(field.value, 'constant');
  if (field.kind === 'piecewise') {
    field.regions.forEach(({ value }) => assertQuantity(value, unit, bounds));
    const region = field.regions.find(({ tag }) => tag === point.domain_tag);
    if (!region)
      throw new RangeError(`No field value for domain ${point.domain_tag}`);
    return exact(region.value, 'piecewise');
  }
  field.samples.forEach(({ position_m, value }) => {
    if (position_m.length !== point.dimension)
      throw new RangeError(
        'Sample coordinates must match the declared dimension',
      );
    assertQuantity(value, unit, bounds);
  });
  const axes = Array.from({ length: point.dimension }, (_, axis) =>
    [...new Set(field.samples.map(({ position_m }) => position_m[axis]))].sort(
      (a, b) => a - b,
    ),
  );
  axes.forEach((coordinates, axis) => {
    const query = point.position_m[axis];
    if (query < coordinates[0] || query > coordinates[coordinates.length - 1])
      throw new RangeError('Field extrapolation is not permitted');
  });
  const squaredDistance = (sample: (typeof field.samples)[number]) =>
    sample.position_m.reduce(
      (total, coordinate, axis) =>
        total + (coordinate - point.position_m[axis]) ** 2,
      0,
    );
  if (field.interpolation === 'nearest') {
    const distances = field.samples.map(squaredDistance);
    const nearestDistance = Math.min(...distances);
    const nearest = field.samples.filter(
      (_, index) => distances[index] === nearestDistance,
    );
    if (nearest.some(({ value }) => value.value !== nearest[0].value.value))
      throw new RangeError(
        'Nearest field sample is ambiguous at an equidistant discontinuity',
      );
    return exact(nearest[0].value, 'nearest');
  }
  const intervals = axes.map((coordinates, axis) => {
    const query = point.position_m[axis];
    const exactCoordinate = coordinates.find(
      (coordinate) => coordinate === query,
    );
    if (exactCoordinate !== undefined) return [[exactCoordinate, 1]];
    const upper = coordinates.find((coordinate) => coordinate > query)!;
    const lower = [...coordinates]
      .reverse()
      .find((coordinate) => coordinate < query)!;
    return [
      [lower, (upper - query) / (upper - lower)],
      [upper, (query - lower) / (upper - lower)],
    ];
  });
  let corners: Array<{ coordinates: number[]; weight: number }> = [
    { coordinates: [], weight: 1 },
  ];
  for (const interval of intervals)
    corners = corners.flatMap((corner) =>
      interval.map(([coordinate, weight]) => ({
        coordinates: [...corner.coordinates, coordinate],
        weight: corner.weight * weight,
      })),
    );
  const contributors = corners.map(({ coordinates, weight }) => {
    const sample = field.samples.find(({ position_m }) =>
      position_m.every((coordinate, axis) => coordinate === coordinates[axis]),
    );
    if (!sample)
      throw new RangeError(
        'Linear field interpolation requires every tensor-product cell corner',
      );
    return { quantity: sample.value, weight };
  });
  if (contributors.length === 1)
    return exact(contributors[0].quantity, 'multilinear');
  const value = contributors.reduce(
    (total, contributor) =>
      total + contributor.quantity.value * contributor.weight,
    0,
  );
  const allUncertaintiesSupplied = contributors.every(
    ({ quantity }) => quantity.uncertainty !== undefined,
  );
  const quantity: SpatialQuantity = {
    value,
    unit,
    source_kind: 'assumption',
    source_ref: 'derived-field://tensor-product-linear-interpolation',
    source_locator: JSON.stringify({
      position_m: point.position_m,
      contributors,
    }),
    ...(allUncertaintiesSupplied
      ? {
          uncertainty: contributors.reduce(
            (total, contributor) =>
              total + contributor.weight * contributor.quantity.uncertainty!,
            0,
          ),
          uncertainty_unit: unit,
        }
      : {}),
  };
  assertQuantity(quantity, unit, bounds);
  return { quantity, method: 'multilinear', contributors };
}

/** Shared authority enforcement for material coefficients consumed by runtime adapters. */
export function evaluateSpatialMaterialField(
  parameterId: string,
  field: SpatialField,
  point: SpatialFieldPoint & { domain_kind: string },
): SpatialFieldEvaluation {
  const spec = (
    spatialParameterAuthority.parameters as Record<
      string,
      {
        unit: string;
        domains: string[];
        dimensions: number[];
        bounds: SpatialParameterBounds;
        form: string;
      }
    >
  )[parameterId];
  if (!spec) throw new RangeError(`Unknown spatial parameter ${parameterId}`);
  if (
    !spec.dimensions.includes(point.dimension) ||
    !spec.domains.includes(point.domain_kind)
  )
    throw new RangeError(
      `Parameter ${parameterId} is incompatible with this domain or dimension`,
    );
  if (spec.form === 'scalar' && field.kind !== 'constant')
    throw new RangeError(`Parameter ${parameterId} requires a constant scalar`);
  return evaluateSpatialField(field, point, spec.unit, spec.bounds);
}
