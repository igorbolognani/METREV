import type { CellField, CellMesh } from './spatial-cell-field';

export const slicePlanes = {
  XY: { horizontal: 0, vertical: 1, fixed: 2 },
  XZ: { horizontal: 0, vertical: 2, fixed: 1 },
  YZ: { horizontal: 1, vertical: 2, fixed: 0 },
} as const;
export type SlicePlane = keyof typeof slicePlanes;

export function cellGridIndex(mesh: CellMesh, cell: number) {
  if (!Number.isInteger(cell) || cell < 0 || cell >= mesh.centers_m.length)
    throw new Error('Cell outside mesh');
  const nz = mesh.shape[2] ?? 1;
  return [
    Math.floor(cell / (mesh.shape[1] * nz)),
    Math.floor(cell / nz) % mesh.shape[1],
    cell % nz,
  ].slice(0, mesh.shape.length);
}

export function fieldSliceCells(
  mesh: CellMesh,
  field: CellField,
  plane: SlicePlane,
  slice: number,
  region: number | null = null,
) {
  if (mesh.shape.length === 2 && plane !== 'XY')
    throw new Error('Plane requires a 3D mesh');
  const fixed = slicePlanes[plane].fixed;
  const count = mesh.shape[fixed] ?? 1;
  if (!Number.isInteger(slice) || slice < 0 || slice >= count)
    throw new Error('Slice outside mesh');
  return field.cells.flatMap((cell, index) =>
    (mesh.shape.length === 2 || cellGridIndex(mesh, cell)[fixed] === slice) &&
    (region === null || mesh.region_index[cell] === region)
      ? [{ cell, value: field.values[index] }]
      : [],
  );
}

/** Exact grid-axis samples through a selected cell; absent domain values stay gaps. */
export function cellLineProfile(
  mesh: CellMesh,
  field: CellField,
  probe: number,
  axis: number,
) {
  if (!Number.isInteger(axis) || axis < 0 || axis >= mesh.shape.length)
    throw new Error('Axis outside mesh');
  const coordinates = cellGridIndex(mesh, probe);
  const values = new Map(
    field.cells.map((cell, index) => [cell, field.values[index]]),
  );
  return Array.from({ length: mesh.shape[axis] }, (_, i) => {
    const location = [...coordinates];
    location[axis] = i;
    const cell =
      mesh.shape.length === 3
        ? (location[0] * mesh.shape[1] + location[1]) * mesh.shape[2] +
          location[2]
        : location[0] * mesh.shape[1] + location[1];
    return {
      cell,
      position_m: mesh.centers_m[cell],
      coordinate_m: mesh.centers_m[cell][axis],
      region_index: mesh.region_index[cell],
      value: values.get(cell) ?? null,
    };
  });
}

export function fieldProfileCSV(options: {
  mesh: CellMesh;
  field: CellField;
  probe: number;
  axis: number;
  domainTags: string[];
  binding: {
    run_id: string;
    input_sha256: string;
    mesh_sha256: string;
    field_sha256: string;
    numerical_status: string;
  };
}) {
  const quote = (value: string | number | null) =>
    value === null
      ? ''
      : typeof value === 'number'
        ? String(value)
        : `"${value.replaceAll('"', '""')}"`;
  const header = [
    'run_id',
    'input_sha256',
    'mesh_sha256',
    'field_sha256',
    'numerical_status',
    'result_role',
    'field_id',
    'unit',
    'axis',
    'cell_index',
    'domain_tag',
    'x_m',
    'y_m',
    'z_m',
    'value',
  ];
  const b = options.binding;
  const rows = cellLineProfile(
    options.mesh,
    options.field,
    options.probe,
    options.axis,
  ).map((sample) => [
    b.run_id,
    b.input_sha256,
    b.mesh_sha256,
    b.field_sha256,
    b.numerical_status,
    b.numerical_status === 'completed'
      ? 'modeled_development_result'
      : 'failed_run_diagnostics',
    options.field.id,
    options.field.unit,
    'xyz'[options.axis],
    sample.cell,
    options.domainTags[sample.region_index],
    ...sample.position_m,
    ...(sample.position_m.length === 2 ? [null] : []),
    sample.value,
  ]);
  return (
    [
      header.map(quote).join(','),
      ...rows.map((row) => row.map(quote).join(',')),
    ].join('\r\n') + '\r\n'
  );
}
