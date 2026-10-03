import React from 'react';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';
import { describe, expect, it, vi } from 'vitest';
import type { StructuredCellRunView } from '@metrev/domain-contracts/browser';
import { structuredCellFixture } from '../fixtures/structured-cell';
import { compareSpatialRunSummaries } from '../../apps/web-ui/src/lib/spatial-run-comparison';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

import { SpatialCellWorkbench } from '../../apps/web-ui/src/components/modeling/spatial-cell-workbench';

function run(
  id: string,
  overrides: Record<string, unknown> = {},
): StructuredCellRunView {
  const input = structuredCellFixture();
  const field = {
    field_id: 'concentration_reduced',
    unit: 'mol/m3',
    value_type: 'scalar',
    association: 'mesh_cells',
    domain_tags: ['anode', 'membrane', 'cathode'],
    artifact: {
      uri: `metrev-artifact://sha256/${'a'.repeat(64)}`,
      sha256: 'a'.repeat(64),
      bytes: 128,
      format: 'json',
      media_type: 'application/json',
      dataset_path: '/values',
    },
    summary: {
      sample_count: 12,
      minimum: 0.1,
      maximum: 1,
      mean: 0.55,
      integral: 0.00055,
      integral_unit: 'mol',
      integration_measure: 'domain_area',
    },
  };
  return {
    id,
    evaluation_id: null,
    model_id: input.model_id,
    system: input.system,
    dimension: input.dimension,
    status: 'completed',
    progress: 100,
    input_sha256: 'b'.repeat(64),
    input_snapshot: input,
    solver_version: 'solver-test-1',
    runtime_version: 'runtime-test-1',
    failure: null,
    result: {
      contract_version: 'spatial-simulation-result-v3',
      run_id: id,
      input_sha256: 'b'.repeat(64),
      model_id: input.model_id,
      system: input.system,
      dimension: input.dimension,
      produced_at: '2026-10-02T00:00:00.000Z',
      solver_version: 'solver-test-1',
      runtime_version: 'runtime-test-1',
      mesh: {
        artifact: field.artifact,
        request_sha256: 'c'.repeat(64),
        dimension: 2,
        geometry_version: 'structured-layers-v1',
        mesh_quality: { cell_count: 12 },
      },
      fields: [field],
      conservation_residuals: [],
      convergence: [],
      cell_circuit: {
        collector_voltage_V: 0,
        anodic_current_A: 0,
        signed_electrical_power_W: 0,
        mfc_generated_power_W: 0,
        mec_electrical_input_W: null,
      },
      warnings: [],
    },
    ...overrides,
  } as unknown as StructuredCellRunView;
}

describe('spatial run summary comparison', () => {
  it('exposes the summary-only comparison controls and limits in the workbench', () => {
    const html = renderToStaticMarkup(
      React.createElement(SpatialCellWorkbench),
    );
    expect(html).toContain('Compare spatial run summaries');
    expect(html).toContain('aria-label="Second saved run ID"');
    expect(html).toContain('Compare summaries');
    expect(html).toContain('does not interpolate or remap meshes');
    expect(html).toContain('does not compare experimental measurements');
  });

  it('compares same-profile summary metrics and reports B minus A without changing eligibility', () => {
    const a = run('run-a');
    const b = run('run-b', {
      result: {
        ...run('run-b').result!,
        fields: [
          {
            ...run('run-b').result!.fields[0],
            summary: {
              ...run('run-b').result!.fields[0].summary,
              minimum: 0.2,
              maximum: 1.2,
              mean: 0.7,
              integral: 0.0007,
            },
          },
        ],
      },
    });

    const comparison = compareSpatialRunSummaries(a, b);
    expect(comparison.eligible).toBe(true);
    if (!comparison.eligible) throw new Error('Expected eligible comparison');
    expect(comparison.runA.id).toBe('run-a');
    expect(comparison.runB.id).toBe('run-b');
    expect(comparison.metrics[0]).toMatchObject({
      fieldId: 'concentration_reduced',
      unit: 'mol/m3',
    });
    expect(comparison.metrics[0].deltaBMinusA.minimum).toBeCloseTo(0.1);
    expect(comparison.metrics[0].deltaBMinusA.maximum).toBeCloseTo(0.2);
    expect(comparison.metrics[0].deltaBMinusA.mean).toBeCloseTo(0.15);
    expect(comparison.metrics[0].deltaBMinusA.integral).toBeCloseTo(0.00015);
  });

  it.each([
    ['different model', run('run-b', { model_id: 'other-model' }), 'model_id'],
    ['different dimension', run('run-b', { dimension: 3 }), 'dimensões'],
    ['different system', run('run-b', { system: 'MEC' }), 'sistemas'],
    [
      'different geometry',
      run('run-b', {
        input_snapshot: {
          ...structuredCellFixture(),
          geometry: {
            ...structuredCellFixture().geometry,
            lengths_m: [
              {
                ...structuredCellFixture().geometry.lengths_m[0],
                value: 0.0004,
              },
              ...structuredCellFixture().geometry.lengths_m.slice(1),
            ],
          },
        },
      }),
      'geometria física',
    ],
  ])('refuses %s explicitly', (_label, b, expectedReason) => {
    const comparison = compareSpatialRunSummaries(run('run-a'), b);
    expect(comparison.eligible).toBe(false);
    if (comparison.eligible) throw new Error('Expected refusal');
    expect(comparison.reasons.join(' ')).toContain(expectedReason);
  });

  it('refuses a shared field with a different unit and reports both units', () => {
    const a = run('run-a');
    const base = run('run-b');
    const b = {
      ...base,
      result: {
        ...base.result!,
        fields: [{ ...base.result!.fields[0], unit: 'V' }],
      },
    } as unknown as StructuredCellRunView;

    const comparison = compareSpatialRunSummaries(a, b);
    expect(comparison.eligible).toBe(false);
    if (comparison.eligible) throw new Error('Expected refusal');
    expect(comparison.reasons).toContain(
      'Campo concentration_reduced tem unidades incompatíveis (mol/m3 e V).',
    );
  });

  it('refuses a shared field mapped to different domains', () => {
    const base = run('run-b');
    const b = {
      ...base,
      result: {
        ...base.result!,
        fields: [{ ...base.result!.fields[0], domain_tags: ['membrane'] }],
      },
    } as unknown as StructuredCellRunView;

    const comparison = compareSpatialRunSummaries(run('run-a'), b);
    expect(comparison.eligible).toBe(false);
    if (comparison.eligible) throw new Error('Expected refusal');
    expect(comparison.reasons).toContain(
      'Campo concentration_reduced tem tipo, associação ou domínios incompatíveis.',
    );
  });

  it('refuses non-completed runs and identical run IDs', () => {
    const runA = run('run-a');
    const unfinished = run('run-b', { status: 'failed' });
    const unfinishedComparison = compareSpatialRunSummaries(runA, unfinished);
    expect(unfinishedComparison.eligible).toBe(false);
    if (unfinishedComparison.eligible)
      throw new Error('Expected unfinished-run refusal');
    expect(unfinishedComparison.reasons.join(' ')).toContain(
      'não está concluída',
    );
    const same = compareSpatialRunSummaries(runA, run('run-a'));
    expect(same.eligible).toBe(false);
    if (same.eligible) throw new Error('Expected identical-run refusal');
    expect(same.reasons).toContain('Selecione duas execuções diferentes.');
  });
});
