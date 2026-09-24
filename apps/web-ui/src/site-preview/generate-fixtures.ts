import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  normalizeCaseInput,
  rawCaseInputSchema,
  type RawCaseInput,
} from '@metrev/domain-contracts';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../',
);
const fixturePath = resolve(
  repositoryRoot,
  'tests/fixtures/raw-case-input.json',
);
const outputPath = process.argv[2];
if (!outputPath) throw new Error('Pass the output path for site fixtures.');

const rawFixture = JSON.parse(
  readFileSync(fixturePath, 'utf8'),
) as RawCaseInput;
const scenarios = {
  mfc_wastewater: makeScenario('SITE-MFC-WW', (raw) => {
    delete raw.stack_blocks!.sensors_and_analytics!.biosensor;
  }),
  mec_wastewater: makeScenario('SITE-MEC-WW', (raw) =>
    setMecConfiguration(raw, false),
  ),
  biosensor_standalone: makeScenario('SITE-BIOSENSOR', (raw) => {
    raw.technology_family = 'electrochemical_biosensor';
    const sensor = raw.stack_blocks!.sensors_and_analytics!.biosensor as Record<
      string,
      unknown
    >;
    sensor.deployment_mode = 'standalone';
    sensor.power_source = 'external';
  }),
  mfc_integrated_biosensor: makeScenario('SITE-MFC-SENSOR', () => {}),
  mec_integrated_biosensor: makeScenario('SITE-MEC-SENSOR', (raw) => {
    setMecConfiguration(raw, true);
    const sensor = raw.stack_blocks!.sensors_and_analytics!.biosensor as Record<
      string,
      unknown
    >;
    sensor.deployment_mode = 'mec_integrated';
    sensor.power_source = 'mec_power_bus';
    sensor.power_available_w = testParameter(2, 'W');
  }),
};

writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      schema_version: 1,
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://site-preview-scenarios',
      note: 'Generated from the checked-in raw case test fixture. Not a literature record, measurement, or validated scenario.',
      scenarios,
    },
    null,
    2,
  )}\n`,
);
console.log(
  JSON.stringify({
    output_path: outputPath,
    scenarios: Object.keys(scenarios),
  }),
);

function makeScenario(caseId: string, modify: (raw: RawCaseInput) => void) {
  const raw = structuredClone(rawFixture);
  raw.case_id = caseId;
  raw.evidence_refs = [];
  modify(raw);
  return normalizeCaseInput(rawCaseInputSchema.parse(raw));
}

function setMecConfiguration(raw: RawCaseInput, keepSensor: boolean) {
  raw.technology_family = 'microbial_electrolysis_cell';
  const model = raw.mechanistic_model as Record<string, unknown>;
  model.system_type = 'MEC';
  const electrochemistry = model.electrochemistry as Record<string, unknown>;
  delete electrochemistry.external_load_ohm;
  electrochemistry.cathode_reaction = 'hydrogen_evolution';
  electrochemistry.applied_voltage_v = testParameter(1.2, 'V');
  electrochemistry.hydrogen_faraday_efficiency = testParameter(0.7, '1');
  electrochemistry.hydrogen_capture_fraction = testParameter(0.8, '1');
  if (!keepSensor) {
    delete raw.stack_blocks!.sensors_and_analytics!.biosensor;
  }
}

function testParameter(value: number, unit: string) {
  return {
    value,
    unit,
    source_kind: 'test_fixture' as const,
    source_ref: 'test-fixture://site-preview-scenarios',
  };
}
