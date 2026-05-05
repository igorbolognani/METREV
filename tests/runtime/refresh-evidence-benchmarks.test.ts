import { describe, expect, it, vi } from 'vitest';

import { refreshCanonicalEvidenceBenchmarks } from '../../packages/database/scripts/refresh-evidence-benchmarks';

describe('refresh canonical evidence benchmarks', () => {
  it('filters out non-decision-ready or incomplete benchmark rows before aggregation', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'run-001' });
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const executeRaw = vi.fn().mockResolvedValue(7);
    const consoleSpy = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    await refreshCanonicalEvidenceBenchmarks({
      evidenceCanonicalizationRun: { findFirst },
      evidenceBenchmarkAggregate: { deleteMany },
      $executeRaw: executeRaw,
    } as never);

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(1);

    const sqlArg = executeRaw.mock.calls[0]?.[0] as { strings: string[] };
    const statement = sqlArg.strings.join(' ');

    expect(statement).toContain('record."decisionReady" = true');
    expect(statement).toContain('record."metricType" IS NOT NULL');
    expect(statement).toContain('record."normalizedValue" IS NOT NULL');
    expect(statement).toContain('record."canonicalKey" IS NOT NULL');
    expect(statement).toContain('record."normalizedUnit" IS NOT NULL');
    expect(statement).toContain('record."sourceTextHash" IS NOT NULL');
    expect(statement).toContain('record."publicationYear"');
    expect(statement).toContain('catalog."reviewStatus" =');
    expect(statement).toContain('catalog."sourceState" =');
    expect(statement).toContain('source."accessStatus" <>');
    expect(statement).toContain('NOT LIKE');

    consoleSpy.mockRestore();
  });
});
