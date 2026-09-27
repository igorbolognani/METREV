import { createHash } from 'node:crypto';
import { readFile, mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildDevelopmentBenchmark } from '../../packages/database/scripts/export-development-benchmark.mjs';

const hash = (s: string) => createHash('sha256').update(s).digest('hex');

describe('provisional multi-source development benchmark export', () => {
  it('preserves all measured pairs and source identities without filling gaps', async () => {
    const a = await buildDevelopmentBenchmark();
    const b = await buildDevelopmentBenchmark();
    expect(a).toEqual(b);
    expect(a.manifest.exports).toMatchObject([
      { row_count: 39540, sha256: hash(a.observations) },
      { row_count: 290, sha256: hash(a.eisPairs) },
      { row_count: 26, sha256: hash(a.literatureClaims) },
    ]);
    expect(
      a.manifest.exclusions.time_series_missing_cells_not_interpolated,
    ).toBe(504);
    expect(a.manifest.independent_validation).toBe(false);
    expect(a.manifest.decision_eligible).toBe(false);
    const incompleteRows = a.observations
      .split('\n')
      .filter(
        (line: string) =>
          line.includes('Cloth Ni76Fe16Mo8') &&
          line.includes('current_density'),
      );
    expect(incompleteRows).toHaveLength(3169);
    expect(
      incompleteRows.every((line: string) => line.includes('Hoja1!D')),
    ).toBe(true);
    expect(a.eisPairs).toContain('not_supplied');
    expect(a.observations).toContain('not_reported,pending');
    expect(a.observations).toContain('Hoja1!D2,Hoja1!A2');
    const claims = a.literatureClaims
      .trimEnd()
      .split('\n')
      .map((line: string) => JSON.parse(line));
    expect(
      new Set(claims.map((claim: { source_doi: string }) => claim.source_doi))
        .size,
    ).toBe(3);
    expect(
      claims.every(
        (claim: {
          independent_validation: boolean;
          decision_eligible: boolean;
        }) => !claim.independent_validation && !claim.decision_eligible,
      ),
    ).toBe(true);
    expect(a.literatureClaims).not.toContain('"normalized_value":null');
  });

  it('rejects tampering with a registered numeric extract', async () => {
    const temp = await mkdtemp(resolve(tmpdir(), 'metrev-cora-export-'));
    try {
      await cp(
        resolve('packages/database/data/research-candidates'),
        resolve(temp, 'packages/database/data/research-candidates'),
        { recursive: true },
      );
      const file = resolve(
        temp,
        'packages/database/data/research-candidates/10.34810-DATA2866/eis-observed-pairs.json',
      );
      await writeFile(
        file,
        (await readFile(file, 'utf8')).replace('Cloth Ni', 'Cloth Fe'),
      );
      await expect(buildDevelopmentBenchmark(temp)).rejects.toThrow(
        /extract hash mismatch/,
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
