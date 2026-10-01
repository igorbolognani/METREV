import { describe, expect, it } from 'vitest';
import { structuredCellInputSchema } from '../../packages/domain-contracts/src/structured-cell-schema';
import { spatialRuntimeInputSha256 } from '../../packages/domain-contracts/src/spatial-runtime-input';
import { structuredCellFixture } from '../fixtures/structured-cell';

describe('restricted structured spatial cell admission', () => {
  it.each([2, 3] as const)('retains dimension %i and provenance', (dim) => {
    const input = structuredCellInputSchema.parse(structuredCellFixture(dim));
    expect(input.dimension).toBe(dim);
    expect(spatialRuntimeInputSha256(input)).toHaveLength(64);
  });
  it('rejects mismatched electron charge and atoms', () => {
    const input = structuredCellFixture();
    input.electrodes[0].electron_count.value = 2;
    expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    const atoms = structuredCellFixture();
    atoms.species[1].elements.C.value = 2;
    expect(structuredCellInputSchema.safeParse(atoms).success).toBe(false);
  });
  it('rejects missing provenance, wrong units, depth and geometry rank', () => {
    const input = structuredCellFixture();
    input.temperature.source_ref = '';
    expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    input.temperature.source_ref = 'synthetic';
    input.temperature.unit = 'C';
    expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    const rank = structuredCellFixture(3);
    rank.geometry.lengths_m.pop();
    expect(structuredCellInputSchema.safeParse(rank).success).toBe(false);
    const depth = structuredCellFixture();
    delete depth.geometry.out_of_plane_depth;
    expect(structuredCellInputSchema.safeParse(depth).success).toBe(false);
  });
  it('rejects incompatible circuit and unknown reaction state', () => {
    const input = structuredCellFixture();
    input.system = 'MEC';
    expect(structuredCellInputSchema.safeParse(input).success).toBe(false);
    const unknown = structuredCellFixture();
    unknown.electrodes[0].forward_orders.unknown = {
      ...unknown.electrodes[0].alpha,
    };
    expect(structuredCellInputSchema.safeParse(unknown).success).toBe(false);
  });
});
