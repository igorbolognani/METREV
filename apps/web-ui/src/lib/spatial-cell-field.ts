import { z } from 'zod';
import {
  structuredCellTopology,
  type StructuredCellRunView,
} from '@metrev/domain-contracts/browser';

const meshSchema = z
  .object({
    shape: z.array(z.number().int().positive()).min(2).max(3),
    centers_m: z.array(z.array(z.number().finite())).min(1).max(20000),
    sizes_m: z.array(z.array(z.number().finite().positive())).min(1).max(20000),
    region_index: z.array(z.number().int().nonnegative()).min(1).max(20000),
    volumes_m3: z.array(z.number().finite().positive()).min(1).max(20000),
  })
  .strict();
const dataSchema = z
  .object({
    id: z.string(),
    unit: z.string(),
    cells: z.array(z.number().int().nonnegative()).min(1).max(20000),
    values: z.array(z.number().finite()).min(1).max(20000),
  })
  .strict();
export type CellMesh = z.infer<typeof meshSchema>;
export type CellField = z.infer<typeof dataSchema>;

export function readCellMesh(
  value: unknown,
  run: StructuredCellRunView,
): CellMesh {
  const mesh = meshSchema.parse(value),
    expected = structuredCellTopology(run.input_snapshot);
  const equal = (a: unknown, b: unknown): boolean =>
    Array.isArray(a) && Array.isArray(b)
      ? a.length === b.length && a.every((v, i) => equal(v, b[i]))
      : typeof a === 'number' && typeof b === 'number'
        ? Math.abs(a - b) <= 1e-12 * Math.max(Math.abs(a), Math.abs(b), 1e-30)
        : a === b;
  for (const key of [
    'shape',
    'centers_m',
    'sizes_m',
    'region_index',
    'volumes_m3',
  ] as const)
    if (!equal(mesh[key], expected[key]))
      throw new Error('Mesh differs from admitted geometry');
  return mesh;
}
export function readCellField(
  value: unknown,
  mesh: CellMesh,
  field: NonNullable<StructuredCellRunView['result']>['fields'][number],
  run: StructuredCellRunView,
): CellField {
  const parsed = dataSchema.parse(value);
  const expectedCells = mesh.region_index.flatMap((region, cell) =>
    field.domain_tags.includes(run.input_snapshot.geometry.layers[region].tag)
      ? [cell]
      : [],
  );
  if (
    parsed.id !== field.field_id ||
    parsed.unit !== field.unit ||
    parsed.values.length !== field.summary.sample_count ||
    parsed.cells.join() !== expectedCells.join() ||
    parsed.values.length !== parsed.cells.length ||
    new Set(parsed.cells).size !== parsed.cells.length ||
    (parsed.unit === 'mol/m3' && parsed.values.some((v) => v < 0))
  )
    throw new Error('Invalid field topology or units');
  return parsed;
}
