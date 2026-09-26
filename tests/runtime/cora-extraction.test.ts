import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());
const dataDir = resolve(
  root,
  'packages/database/data/research-candidates/10.34810-DATA2866',
);

interface Extract {
  review_status: string;
  source_kind: string;
}

interface DensityExtract extends Extract {
  coordinate: { sample_count: number };
  series: Array<{ values: number[] }>;
  excluded_series: Array<{
    available_sample_count: number;
    missing_sample_count: number;
    observed_row_numbers: number[];
    observed_time_days: number[];
    observed_current_density_mA_cm2: number[];
  }>;
  unpaired_source_rows: Array<{
    worksheet_row: number;
    cell: string;
    raw_value: string;
    reason: string;
  }>;
}

interface LsvExtract extends Extract {
  coordinate: { sample_count: number };
  series: Array<{ values: number[] }>;
}

interface EisExtract extends Extract {
  series: Array<{
    sample_count: number;
    real_ohm: number[];
    secondary_ohm_raw: number[];
  }>;
}

function readExtract<T extends Extract>(name: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, name), 'utf8')) as T;
}

describe('CORA native ODS measurement extraction', () => {
  it('reproduces all checked-in observations from the unmodified source files', () => {
    expect(() =>
      execFileSync(
        'python3',
        ['packages/database/scripts/extract-cora-electrochem.py', '--check'],
        { cwd: root },
      ),
    ).not.toThrow();

    const density = readExtract<DensityExtract>(
      'current-density-complete-series.json',
    );
    expect(density.coordinate.sample_count).toBe(3673);
    expect(density.series).toHaveLength(5);
    expect(
      density.series.every((series) => series.values.length === 3673),
    ).toBe(true);
    expect(density.excluded_series).toHaveLength(1);
    const partial = density.excluded_series[0];
    expect(partial.available_sample_count).toBe(3169);
    expect(partial.missing_sample_count).toBe(504);
    expect(partial.observed_row_numbers).toHaveLength(3169);
    expect(partial.observed_time_days).toHaveLength(3169);
    expect(partial.observed_current_density_mA_cm2).toHaveLength(3169);
    expect(density.unpaired_source_rows).toEqual([
      {
        worksheet_row: 3676,
        cell: 'F3676',
        raw_value: '0',
        reason: 'No time coordinate; not treated as an observation',
      },
    ]);

    const lsv = readExtract<LsvExtract>('lsv-complete-series.json');
    expect(lsv.coordinate.sample_count).toBe(3001);
    expect(lsv.series).toHaveLength(6);
    expect(lsv.series.every((series) => series.values.length === 3001)).toBe(
      true,
    );

    const eis = readExtract<EisExtract>('eis-observed-pairs.json');
    expect(eis.series).toHaveLength(8);
    expect(
      eis.series.reduce((sum, series) => sum + series.sample_count, 0),
    ).toBe(290);
    expect(
      eis.series.every(
        (series) => series.real_ohm.length === series.secondary_ohm_raw.length,
      ),
    ).toBe(true);

    for (const extract of [density, lsv, eis]) {
      expect(extract.review_status).toBe('pending');
      expect(extract.source_kind).toBe('measured');
    }
  });
});
