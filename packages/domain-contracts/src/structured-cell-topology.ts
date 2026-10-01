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
