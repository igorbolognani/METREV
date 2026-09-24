import rawFixture from '../fixtures/raw-case-input.json';

import { describe, expect, it } from 'vitest';

import {
  normalizeCaseInput,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import { prepareSiteScenarioRun } from '../../apps/web-ui/src/site-preview/scenario-runner';

function wastewaterFixture() {
  const raw = rawCaseInputSchema.parse(structuredClone(rawFixture));
  delete raw.stack_blocks!.sensors_and_analytics!.biosensor;
  raw.evidence_refs = [];
  return normalizeCaseInput(raw);
}

function biosensorFixture() {
  const raw = rawCaseInputSchema.parse(structuredClone(rawFixture));
  raw.technology_family = 'electrochemical_biosensor';
  raw.stack_blocks!.sensors_and_analytics!.biosensor!.deployment_mode =
    'standalone';
  raw.stack_blocks!.sensors_and_analytics!.biosensor!.power_source = 'external';
  raw.evidence_refs = [];
  return normalizeCaseInput(raw);
}

describe('Sites simulation input preparation', () => {
  it('converts COD units and records edited values as assumptions', () => {
    const prepared = prepareSiteScenarioRun({
      scenarioId: 'mfc_wastewater',
      normalizedCase: wastewaterFixture(),
      codValue: '800',
      codUnit: 'mgCOD/L',
      phValue: '7.5',
      biosensorConcentration: '',
    });

    expect(prepared.status).toBe('ready');
    if (prepared.status !== 'ready') return;
    expect(
      prepared.normalizedCase.mechanistic_model?.operation.influent_cod_kg_m3
        .value,
    ).toBeCloseTo(0.8, 12);
    expect(
      prepared.normalizedCase.mechanistic_model?.operation.influent_cod_kg_m3
        .source_kind,
    ).toBe('assumption');
    expect(
      prepared.normalizedCase.mechanistic_model?.operation.influent_ph.value,
    ).toBe(7.5);
    expect(prepared.enteredAssumptions).toHaveLength(2);
  });

  it('blocks absent inputs and COD/BOD unit substitution with insufficient data', () => {
    const missing = prepareSiteScenarioRun({
      scenarioId: 'mfc_wastewater',
      normalizedCase: wastewaterFixture(),
      codValue: '',
      codUnit: 'kgCOD/m3',
      phValue: '7',
      biosensorConcentration: '',
    });
    const incompatible = prepareSiteScenarioRun({
      scenarioId: 'mfc_wastewater',
      normalizedCase: wastewaterFixture(),
      codValue: '500',
      codUnit: 'mgBOD/L',
      phValue: '7',
      biosensorConcentration: '',
    });

    expect(missing.status).toBe('insufficient_data');
    expect(incompatible.status).toBe('insufficient_data');
    if (incompatible.status === 'insufficient_data') {
      expect(incompatible.missingInputs[0]).toContain('BOD unit');
    }
  });

  it('rejects pH and biosensor concentration outside supplied constraints', () => {
    const invalidPh = prepareSiteScenarioRun({
      scenarioId: 'mfc_wastewater',
      normalizedCase: wastewaterFixture(),
      codValue: '0.8',
      codUnit: 'kgCOD/m3',
      phValue: '14.1',
      biosensorConcentration: '',
    });
    const outOfCalibration = prepareSiteScenarioRun({
      scenarioId: 'biosensor_standalone',
      normalizedCase: biosensorFixture(),
      codValue: '',
      codUnit: 'kgCOD/m3',
      phValue: '',
      biosensorConcentration: '101',
    });

    expect(invalidPh.status).toBe('insufficient_data');
    expect(outOfCalibration.status).toBe('insufficient_data');
  });
});
