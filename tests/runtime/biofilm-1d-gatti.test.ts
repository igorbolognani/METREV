import { describe, expect, it } from 'vitest';

import {
  GATTI_2017_MEAN_PARAMETERS as paper,
  GATTI_2017_PARAMETER_EVIDENCE,
  gattiParameterEvidence,
  initialGattiBiofilmState,
  simulateGattiBiofilm,
  sweepGattiFittedIntervals,
} from '@metrev/electrochem-models';

describe('Gatti and Milocco 1D biofilm development solver', () => {
  it('keeps the fitted paper values separately traceable, without inferring D or thickness', () => {
    for (const key of Object.keys(GATTI_2017_PARAMETER_EVIDENCE) as Array<
      keyof typeof paper
    >) {
      const evidence = gattiParameterEvidence(key);
      expect(evidence.value).toBe(paper[key]);
      expect(evidence.unit).toBeTruthy();
      expect(evidence.source_ref).toContain('10.1007/s40095-017-0249-1');
      expect(evidence.review_status).toBe('pending');
    }
    expect(paper.intervals).toBe(7);
    expect('biofilmThicknessM' in paper).toBe(false);
    expect('diffusivityM2S' in paper).toBe(false);
  });

  it('remains at the analytical open-circuit equilibrium and conserves fixed bulk', () => {
    const initial = initialGattiBiofilmState(paper);
    const [later] = simulateGattiBiofilm(paper, [
      { durationSeconds: 300, loadOhm: null },
    ]);
    expect(later.interfacialPotentialMillivolt).toBeCloseTo(
      initial.interfacialPotentialMillivolt,
      8,
    );
    expect(later.substrateFractionBySlice).toEqual(
      initial.substrateFractionBySlice,
    );
    expect(later.faradaicCurrentMilliamp).toBeCloseTo(0, 10);
    expect(later.currentMilliamp).toBe(0);
  });

  it('transports substrate toward the electrode, splits current, and recovers at open circuit', () => {
    const [underLoad, recovered] = simulateGattiBiofilm(paper, [
      { durationSeconds: 600, loadOhm: 676 },
      { durationSeconds: 1200, loadOhm: null },
    ]);
    expect(underLoad.currentMilliamp).toBeGreaterThan(0);
    expect(underLoad.terminalVoltageMillivolt).toBeCloseTo(
      676 * underLoad.currentMilliamp,
      8,
    );
    expect(
      underLoad.faradaicCurrentMilliamp - underLoad.currentMilliamp,
    ).toBeCloseTo(underLoad.capacitiveCurrentMilliamp, 10);
    expect(underLoad.substrateFractionBySlice[0]).toBeLessThan(
      underLoad.substrateFractionBySlice[1],
    );
    expect(underLoad.substrateFractionBySlice.at(-1)).toBe(1);
    expect(recovered.currentMilliamp).toBe(0);
    expect(recovered.substrateFractionBySlice[0]).toBeGreaterThan(
      underLoad.substrateFractionBySlice[0],
    );
  });

  it('converges as the integration step is refined for a load transient', () => {
    const schedule = [{ durationSeconds: 60, loadOhm: 676 }];
    const coarse = simulateGattiBiofilm(paper, schedule, {
      maximumStepSeconds: 1,
    })[0];
    const fine = simulateGattiBiofilm(paper, schedule, {
      maximumStepSeconds: 0.25,
    })[0];
    expect(coarse.terminalVoltageMillivolt).toBeCloseTo(
      fine.terminalVoltageMillivolt,
      4,
    );
    expect(coarse.substrateFractionBySlice[0]).toBeCloseTo(
      fine.substrateFractionBySlice[0],
      5,
    );
  });

  it('explores published fitted extrema without interpreting them as uncertainty bounds', () => {
    const sweep = sweepGattiFittedIntervals([
      { durationSeconds: 60, loadOhm: 676 },
    ]);
    expect(sweep.variations).toHaveLength(12);
    expect(sweep.interpretation).toContain('not a confidence');
    expect(sweep.variations[0].evidence.source_ref).toContain('Table 2');
    expect(
      sweep.variations.every(({ observations }) =>
        Number.isFinite(observations[0].terminalVoltageMillivolt),
      ),
    ).toBe(true);
    const resistance = sweep.variations.filter(
      ({ parameter }) => parameter === 'internalResistanceOhm',
    );
    expect(resistance[0].observations[0].currentMilliamp).toBeGreaterThan(
      resistance[1].observations[0].currentMilliamp,
    );
  });

  it('rejects missing physical boundaries and invalid study inputs', () => {
    expect(() =>
      simulateGattiBiofilm({ ...paper, diffusionRatePerSecond: NaN }, []),
    ).toThrow(RangeError);
    expect(() =>
      simulateGattiBiofilm(paper, [{ durationSeconds: 1, loadOhm: -1 }]),
    ).toThrow(RangeError);
    expect(() =>
      simulateGattiBiofilm(paper, [], {
        initialState: {
          substrateFractionBySlice: [1],
          interfacialPotentialMillivolt: 800,
        },
      }),
    ).toThrow(RangeError);
  });
});
