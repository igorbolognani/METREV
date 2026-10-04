import type { StructuredCellInput } from './structured-cell-schema';

/** The same lexicographic cell order as numpy.ndindex; no Gmsh mesh is substituted. */
export function structuredCellTopology(input: StructuredCellInput) {
  const widths: number[] = [];
  const regions: number[] = [];
  input.geometry.layers.forEach((l, r) => {
    for (let i = 0; i < l.cells; i++) {
      widths.push(l.width_m.value / l.cells);
      regions.push(r);
    }
  });
  const shape = [widths.length, ...input.geometry.transverse_cells];
  const centers_m: number[][] = [];
  const sizes_m: number[][] = [];
  const region_index: number[] = [];
  const volumes_m3: number[] = [];
  let x = 0;
  for (let i = 0; i < shape[0]; i++) {
    for (let j = 0; j < shape[1]; j++)
      for (let k = 0; k < (shape[2] ?? 1); k++) {
        const sizes = [
          widths[i],
          input.geometry.lengths_m[1].value / shape[1],
          ...(input.dimension === 3
            ? [input.geometry.lengths_m[2].value / shape[2]]
            : []),
        ];
        centers_m.push([
          x + widths[i] / 2,
          (j + 0.5) * sizes[1],
          ...(input.dimension === 3 ? [(k + 0.5) * sizes[2]] : []),
        ]);
        sizes_m.push(sizes);
        region_index.push(regions[i]);
        volumes_m3.push(
          sizes.reduce((a, b) => a * b, 1) *
            (input.geometry.out_of_plane_depth?.value ?? 1),
        );
      }
    x += widths[i];
  }
  return { shape, centers_m, sizes_m, region_index, volumes_m3 };
}

/** Explicit finite-volume face order used by prescribed-flow source arrays. */
export function structuredCellTransportFaces(input: {
  dimension: 2 | 3;
  geometry: {
    lengths_m: { value: number }[];
    transverse_cells: number[];
    out_of_plane_depth?: { value: number };
    layers: { width_m: { value: number }; cells: number; kind: string }[];
  };
}) {
  const widths = input.geometry.layers.flatMap((layer) =>
    Array.from(
      { length: layer.cells },
      () => layer.width_m.value / layer.cells,
    ),
  );
  const regions = input.geometry.layers.flatMap((layer, region) =>
    Array.from({ length: layer.cells }, () => region),
  );
  const shape = [widths.length, ...input.geometry.transverse_cells];
  const strides = shape.map((_, axis) =>
    shape.slice(axis + 1).reduce((a, b) => a * b, 1),
  );
  const count = shape.reduce((a, b) => a * b, 1);
  const interior: {
    left_cell: number;
    right_cell: number;
    axis: number;
    area_m2: number;
    left_region: number;
    right_region: number;
  }[] = [];
  const boundary: {
    cell_index: number;
    axis: number;
    sign: -1 | 1;
    face: string;
    area_m2: number;
    region_index: number;
  }[] = [];
  for (let cell = 0; cell < count; cell++) {
    const coordinate = strides.map(
      (stride, axis) => Math.floor(cell / stride) % shape[axis],
    );
    const sizes = [
      widths[coordinate[0]],
      ...shape
        .slice(1)
        .map((n, index) => input.geometry.lengths_m[index + 1].value / n),
    ];
    const volume =
      sizes.reduce((a, b) => a * b, 1) *
      (input.dimension === 2 ? input.geometry.out_of_plane_depth!.value : 1);
    for (let axis = 0; axis < input.dimension; axis++) {
      const area = volume / sizes[axis];
      if (coordinate[axis] < shape[axis] - 1) {
        const other = cell + strides[axis];
        interior.push({
          left_cell: cell,
          right_cell: other,
          axis,
          area_m2: area,
          left_region: regions[coordinate[0]],
          right_region: regions[Math.floor(other / strides[0])],
        });
      }
      for (const sign of [-1, 1] as const)
        if (coordinate[axis] === (sign < 0 ? 0 : shape[axis] - 1))
          boundary.push({
            cell_index: cell,
            axis,
            sign,
            face: `${'xyz'[axis]}_${sign < 0 ? 'min' : 'max'}`,
            area_m2: area,
            region_index: regions[coordinate[0]],
          });
    }
  }
  return { interior, boundary, cell_count: count };
}

/**
 * Reconstruct one conservative, prescribed Darcy face field from sourced cell
 * and boundary pressures. This is an algebraic constitutive evaluation; it is
 * deliberately not a pressure solve.
 */
export function structuredCellPrescribedDarcyFlow(input: {
  dimension: 2 | 3;
  geometry: {
    lengths_m: { value: number }[];
    transverse_cells: number[];
    out_of_plane_depth?: { value: number };
    layers: {
      tag: string;
      kind: string;
      width_m: { value: number };
      cells: number;
    }[];
  };
  hydraulics: {
    dynamic_viscosity: { value: number };
    permeability_by_region: Record<string, { value: number }>;
    cell_pressure: { value: number }[];
    boundary_pressure: Record<string, { value: number }>;
    impermeable_faces: string[];
  };
}) {
  const faces = structuredCellTransportFaces(input);
  if (input.hydraulics.cell_pressure.length !== faces.cell_count)
    throw new RangeError('Darcy pressure must cover every ordered mesh cell');
  const regionMobility = input.geometry.layers.map((layer) => {
    const permeability = input.hydraulics.permeability_by_region[layer.tag];
    if (!permeability)
      throw new RangeError('Darcy permeability must cover every region');
    return permeability.value / input.hydraulics.dynamic_viscosity.value;
  });
  const pressures = input.hydraulics.cell_pressure.map((value) => value.value);
  const topology = structuredCellTopology(
    input as Parameters<typeof structuredCellTopology>[0],
  );
  const interior = faces.interior.map((face) => {
    const leftDistance = topology.sizes_m[face.left_cell][face.axis] / 2;
    const rightDistance = topology.sizes_m[face.right_cell][face.axis] / 2;
    const resistance =
      leftDistance / regionMobility[face.left_region] +
      rightDistance / regionMobility[face.right_region];
    return (
      -(pressures[face.right_cell] - pressures[face.left_cell]) / resistance
    );
  });
  const impermeable = new Set(input.hydraulics.impermeable_faces);
  const boundary = faces.boundary.map((face) => {
    if (face.axis === 0 || impermeable.has(face.face)) return 0;
    const prescribed = input.hydraulics.boundary_pressure[face.face];
    if (!prescribed)
      throw new RangeError('Every transverse Darcy boundary must be declared');
    const distance = topology.sizes_m[face.cell_index][face.axis] / 2;
    const resistance = distance / regionMobility[face.region_index];
    return -(prescribed.value - pressures[face.cell_index]) / resistance;
  });
  return {
    ...faces,
    interior_velocity_m_s: interior,
    boundary_velocity_m_s: boundary,
  };
}
