import * as React from 'react';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';
import { describe, expect, it } from 'vitest';

import type { SimulationSensitivityAnalysis } from '@metrev/domain-contracts';

import { SimulationSensitivityDetails } from '../../apps/web-ui/src/components/evaluation/simulation-sensitivity-details';

describe('simulation sensitivity details', () => {
  it('labels scenario values as one-at-a-time modeled outputs with source provenance', () => {
    const analysis: SimulationSensitivityAnalysis = {
      method: 'one_at_a_time_reported_uncertainty_v1',
      status: 'completed',
      interpretation:
        'Each eligible input is changed separately. No prediction interval is inferred.',
      evaluated_parameter_count: 1,
      skipped_parameters: [],
      effects: [
        {
          parameter_path: 'mechanistic_model.operation.influent_cod_kg_m3',
          source_kind: 'measured',
          source_ref: 'lab-sample:WW-001',
          unit: 'kgCOD/m3',
          nominal_value: 0.85,
          reported_uncertainty: 0.01,
          status: 'completed',
          lower_input_scenario: {
            status: 'completed',
            input_value: 0.84,
            missing_inputs: [],
          },
          upper_input_scenario: {
            status: 'completed',
            input_value: 0.86,
            missing_inputs: [],
          },
          metrics: [
            {
              key: 'cod_removal_pct',
              label: 'COD removal',
              unit: '%',
              nominal_value: 72,
              lower_input_value: 71.5,
              upper_input_value: 72.4,
              lower_change_from_nominal: -0.5,
              upper_change_from_nominal: 0.4,
            },
          ],
        },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(SimulationSensitivityDetails, { analysis }),
    );

    expect(html).toContain('One-at-a-time sensitivity');
    expect(html).toContain('lab-sample:WW-001');
    expect(html).toContain('Input − uncertainty');
    expect(html).toContain('Input + uncertainty');
    expect(html).toContain('COD removal');
    expect(html).toContain('71.5 %');
    expect(html).toContain('72.4 %');
    expect(html).toContain('data-layout-scroll="true"');
  });
});
