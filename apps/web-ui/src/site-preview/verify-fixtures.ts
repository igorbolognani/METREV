import { readFileSync } from 'node:fs';

import { evaluateSimulationEnrichment } from '../../../../packages/electrochem-models/src/index';
import type { NormalizedCaseInput } from '@metrev/domain-contracts';

const fixturePath = process.argv[2];
if (!fixturePath) throw new Error('Pass the generated scenario fixture path.');

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
  scenarios: Record<string, NormalizedCaseInput>;
};
const outcomes = Object.entries(fixture.scenarios).map(
  ([scenario, normalizedCase]) => {
    const result = evaluateSimulationEnrichment({ normalizedCase });
    if (result.status !== 'completed') {
      throw new Error(
        `${scenario} did not produce complete solver output: ${JSON.stringify(result.failure_detail)}`,
      );
    }
    if (
      !result.derived_observations.every(
        (observation) => observation.source_kind === 'modeled',
      )
    ) {
      throw new Error(`${scenario} includes a non-modeled output.`);
    }
    const observations = new Map(
      result.derived_observations.map((observation) => [
        observation.key,
        observation.value,
      ]),
    );
    const value = (key: string) => observations.get(key);
    if (scenario.startsWith('mec_')) {
      const grossHydrogen = value('hydrogen_gross_production_mol');
      const capturedHydrogen = value('hydrogen_captured_production_mol');
      const uncapturedHydrogen = value('hydrogen_uncaptured_production_mol');
      if (
        typeof grossHydrogen !== 'number' ||
        typeof capturedHydrogen !== 'number' ||
        typeof uncapturedHydrogen !== 'number' ||
        Math.abs(grossHydrogen - capturedHydrogen - uncapturedHydrogen) >
          1e-12 ||
        typeof value('mec_cell_electrical_input_w') !== 'number'
      ) {
        throw new Error(
          `${scenario} must keep MEC energy input and gross/captured/uncaptured H₂ outputs separate.`,
        );
      }
    }
    if (
      scenario.startsWith('mfc_') &&
      typeof value('gross_power_w') !== 'number'
    ) {
      throw new Error(`${scenario} did not produce MFC electrical output.`);
    }
    if (
      scenario.includes('biosensor') &&
      typeof value('biosensor_signal_current_a') !== 'number'
    ) {
      throw new Error(`${scenario} did not produce a biosensor signal.`);
    }
    return {
      scenario,
      output_count: result.derived_observations.length,
      series_count: result.series.length,
      source_kind: 'modeled',
    };
  },
);

console.log(JSON.stringify({ scenarios_verified: outcomes }, null, 2));
