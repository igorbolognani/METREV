import { expect, test } from '@playwright/test';

import rawFixture from '../fixtures/raw-case-input.json';
import type {
  EvaluationComparisonResponse,
  EvaluationResponse,
  RawCaseInput,
} from '@metrev/domain-contracts';
import {
  analystEmail,
  analystPassword,
  playwrightApiBaseUrl,
} from './support/local-runtime';

type ScenarioId =
  | 'mfc-wastewater'
  | 'mec-wastewater'
  | 'biosensor-standalone'
  | 'biosensor-mfc'
  | 'biosensor-mec';

interface VerticalSliceScenario {
  id: ScenarioId;
  presetLabel: string;
  reportLabels: string[];
  comparisonKey: string;
  changedValue: 'mfc-load' | 'mec-voltage' | 'sensor-concentration';
}

const scenarios: VerticalSliceScenario[] = [
  {
    id: 'mfc-wastewater',
    presetLabel: 'MFC wastewater model inputs',
    reportLabels: ['COD removal', 'Gross MFC power'],
    comparisonKey: 'gross_power_w',
    changedValue: 'mfc-load',
  },
  {
    id: 'mec-wastewater',
    presetLabel: 'MEC wastewater model inputs',
    reportLabels: [
      'Gross MEC hydrogen produced',
      'MEC hydrogen captured',
      'MEC cell electrical input energy',
    ],
    comparisonKey: 'mec_cell_electrical_input_w',
    changedValue: 'mec-voltage',
  },
  {
    id: 'biosensor-standalone',
    presetLabel: 'Standalone wastewater biosensor',
    reportLabels: ['bod biosensor signal', 'bod detection status'],
    comparisonKey: 'biosensor_signal_current_a',
    changedValue: 'sensor-concentration',
  },
  {
    id: 'biosensor-mfc',
    presetLabel: 'MFC-integrated wastewater biosensor',
    reportLabels: ['Gross MFC power', 'bod biosensor signal'],
    comparisonKey: 'biosensor_signal_current_a',
    changedValue: 'sensor-concentration',
  },
  {
    id: 'biosensor-mec',
    presetLabel: 'MEC-integrated wastewater biosensor',
    reportLabels: [
      'Gross MEC hydrogen produced',
      'MEC hydrogen captured',
      'bod biosensor signal',
    ],
    comparisonKey: 'biosensor_signal_current_a',
    changedValue: 'sensor-concentration',
  },
];

function configureMec(raw: RawCaseInput) {
  const model = raw.mechanistic_model;
  if (!model?.electrochemistry) {
    throw new Error('The test fixture must include a mechanistic model.');
  }

  model.system_type = 'MEC';
  delete model.electrochemistry.external_load_ohm;
  model.electrochemistry.cathode_reaction = 'hydrogen_evolution';
  model.electrochemistry.applied_voltage_v = {
    value: 1.2,
    unit: 'V',
    source_kind: 'test_fixture',
    source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
  };
  model.electrochemistry.hydrogen_faraday_efficiency = {
    value: 0.7,
    unit: '1',
    source_kind: 'test_fixture',
    source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
  };
  model.electrochemistry.hydrogen_capture_fraction = {
    value: 0.8,
    unit: '1',
    source_kind: 'test_fixture',
    source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
  };
}

function buildScenarioInput(
  scenario: VerticalSliceScenario,
  caseId: string,
): RawCaseInput {
  const raw = structuredClone(rawFixture) as RawCaseInput;
  raw.case_id = caseId;

  if (scenario.id === 'mfc-wastewater') {
    raw.technology_family = 'microbial_fuel_cell';
    raw.primary_objective = 'wastewater_treatment';
    delete raw.stack_blocks?.sensors_and_analytics?.biosensor;
  } else if (scenario.id === 'mec-wastewater') {
    raw.technology_family = 'microbial_electrolysis_cell';
    raw.primary_objective = 'wastewater_treatment';
    configureMec(raw);
    delete raw.stack_blocks?.sensors_and_analytics?.biosensor;
  } else if (scenario.id === 'biosensor-standalone') {
    raw.technology_family = 'electrochemical_biosensor';
    raw.primary_objective = 'biosensing';
    raw.architecture_family = 'standalone electrochemical biosensor';
    delete raw.mechanistic_model;
    const sensor = raw.stack_blocks?.sensors_and_analytics?.biosensor;
    if (!sensor) throw new Error('The test fixture must include a biosensor.');
    sensor.deployment_mode = 'standalone';
    sensor.power_source = 'external';
  } else if (scenario.id === 'biosensor-mfc') {
    raw.technology_family = 'microbial_fuel_cell';
    raw.primary_objective = 'wastewater_treatment';
  } else {
    raw.technology_family = 'microbial_electrolysis_cell';
    raw.primary_objective = 'wastewater_treatment';
    configureMec(raw);
    const sensor = raw.stack_blocks?.sensors_and_analytics?.biosensor;
    if (!sensor) throw new Error('The test fixture must include a biosensor.');
    sensor.deployment_mode = 'mec_integrated';
    sensor.power_source = 'mec_power_bus';
    sensor.power_available_w = {
      value: 2,
      unit: 'W',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
    };
  }

  return raw;
}

function makeComparisonInput(
  scenario: VerticalSliceScenario,
  raw: RawCaseInput,
): RawCaseInput {
  const changed = structuredClone(raw);

  if (scenario.changedValue === 'mfc-load') {
    changed.mechanistic_model!.electrochemistry!.external_load_ohm!.value = 120;
  } else if (scenario.changedValue === 'mec-voltage') {
    changed.mechanistic_model!.electrochemistry!.applied_voltage_v!.value = 1.35;
  } else {
    changed.stack_blocks!.sensors_and_analytics!.biosensor!.concentration.value = 50;
  }

  return changed;
}

async function signInAsAnalyst(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(analystEmail);
  await page.getByLabel('Password').fill(analystPassword);
  await Promise.all([
    page.waitForURL(/\/home(?:\?.*)?$/, { timeout: 15_000 }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
}

async function choosePreset(
  page: import('@playwright/test').Page,
  presetLabel: string,
) {
  await page.getByRole('button', { name: /Preset library/ }).click();
  const preset = page
    .locator('article')
    .filter({ hasText: presetLabel })
    .first();
  await preset.getByRole('button', { name: 'Load preset' }).first().click();
}

async function fillRequiredContext(
  page: import('@playwright/test').Page,
  caseId: string,
) {
  await page.getByLabel('Case identifier').fill(caseId);
  await page.getByLabel('Current TRL').fill('pilot');
  await page.getByLabel('Decision horizon').fill('test fixture, 12 months');
  await page
    .getByLabel('Deployment context')
    .fill('Test fixture only; no measured site data.');

  await page.getByRole('button', { name: /Operating Envelope/ }).click();
  const painPoints = page.getByLabel('Current pain points');
  await painPoints.fill('test fixture modeling validation');
  await painPoints.press('Enter');
  await page.getByLabel('Influent type').fill('Test fixture wastewater.');
  await page
    .getByLabel('Substrate profile')
    .fill('Test fixture only; no measured composition supplied.');
}

async function readEvaluation(
  page: import('@playwright/test').Page,
  evaluationId: string,
) {
  const result = await page.evaluate(
    async ({ apiBaseUrl, id }) => {
      const response = await fetch(`${apiBaseUrl}/api/evaluations/${id}`, {
        credentials: 'include',
      });
      return { status: response.status, body: await response.json() };
    },
    { apiBaseUrl: playwrightApiBaseUrl, id: evaluationId },
  );

  expect(result.status).toBe(200);
  return result.body as EvaluationResponse;
}

async function createEvaluation(
  page: import('@playwright/test').Page,
  raw: RawCaseInput,
  idempotencyKey: string,
) {
  const result = await page.evaluate(
    async ({ apiBaseUrl, idempotencyKey, payload }) => {
      const response = await fetch(`${apiBaseUrl}/api/cases/evaluate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      return { status: response.status, body: await response.json() };
    },
    { apiBaseUrl: playwrightApiBaseUrl, idempotencyKey, payload: raw },
  );

  expect(result.status, JSON.stringify(result.body)).toBe(201);
  return result.body as EvaluationResponse;
}

async function readComparison(
  page: import('@playwright/test').Page,
  currentId: string,
  baselineId: string,
) {
  const result = await page.evaluate(
    async ({ apiBaseUrl, currentId, baselineId }) => {
      const response = await fetch(
        `${apiBaseUrl}/api/workspace/evaluations/${currentId}/compare/${baselineId}`,
        { credentials: 'include' },
      );
      return { status: response.status, body: await response.json() };
    },
    { apiBaseUrl: playwrightApiBaseUrl, currentId, baselineId },
  );

  expect(result.status).toBe(200);
  return result.body as EvaluationComparisonResponse;
}

test('runs the five focused model modes through persistence, report reload, and comparison', async ({
  page,
}) => {
  await signInAsAnalyst(page);

  for (const scenario of scenarios) {
    const caseId = `PW-VSLICE-${scenario.id}-${Date.now()}`;
    const raw = buildScenarioInput(scenario, caseId);
    const modelJson = raw.mechanistic_model
      ? JSON.stringify(raw.mechanistic_model)
      : '';
    const biosensor =
      raw.stack_blocks?.sensors_and_analytics?.biosensor ?? undefined;

    await page.evaluate(() => window.sessionStorage.clear());
    await page.goto('/cases/new');
    await choosePreset(page, scenario.presetLabel);
    await fillRequiredContext(page, caseId);
    await page.getByRole('button', { name: /Review & Submit/ }).click();
    await page.getByLabel('Coupled MFC/MEC model input').fill(modelJson);
    await page
      .getByLabel('Electrochemical biosensor configuration')
      .fill(biosensor ? JSON.stringify(biosensor) : '');
    await page
      .getByRole('button', { name: 'Run deterministic evaluation' })
      .click();
    await page.waitForURL(/\/evaluations\/[^/]+$/, { timeout: 120_000 });

    const evaluationId = page.url().match(/\/evaluations\/([^/]+)$/)?.[1];
    expect(evaluationId).toBeTruthy();
    await expect(page.getByTestId('evaluation-workspace')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('evaluation-workspace')).toBeVisible();

    const persisted = await readEvaluation(page, evaluationId!);
    expect(persisted.simulation_enrichment?.status).toBe('completed');
    expect(persisted.audit_record.raw_input_snapshot.case_id).toBe(caseId);
    const observations =
      persisted.simulation_enrichment?.derived_observations ?? [];
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.every((entry) => entry.source_kind === 'modeled')).toBe(
      true,
    );

    if (scenario.id === 'mec-wastewater') {
      const output = (key: string) =>
        observations.find((entry) => entry.key === key)?.value;
      expect(output('mec_cell_electrical_input_w')).toBeGreaterThan(0);
      expect(output('hydrogen_gross_production_mol')).toBeGreaterThan(0);
      expect(output('hydrogen_captured_production_mol')).toBeGreaterThan(0);
      expect(output('hydrogen_captured_production_mol')).toBeLessThan(
        output('hydrogen_gross_production_mol') as number,
      );
      expect(output('gross_power_w')).toBeUndefined();
    }

    await page.getByRole('tab', { name: /^Modeling/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Modeled outputs' }),
    ).toBeVisible();

    const reportResult = await page.evaluate(
      async ({ apiBaseUrl, id }) => {
        const response = await fetch(
          `${apiBaseUrl}/api/workspace/evaluations/${id}/report`,
          { credentials: 'include' },
        );
        return { status: response.status, body: await response.json() };
      },
      { apiBaseUrl: playwrightApiBaseUrl, id: evaluationId! },
    );
    expect(reportResult.status).toBe(200);
    expect(reportResult.body.sections.modeling.status).toBe('completed');
    expect(
      reportResult.body.sections.modeling.derived_observations.every(
        (entry: { source_kind: string }) => entry.source_kind === 'modeled',
      ),
    ).toBe(true);
    const savedReport =
      reportResult.body.evaluation_lineage.workspace_snapshots.find(
        (snapshot: { snapshot_type: string }) =>
          snapshot.snapshot_type === 'report',
      );
    expect(savedReport?.payload.modeling.status).toBe('completed');

    await page.goto(`/evaluations/${evaluationId}/report`);
    await expect(page.locator('.report-page')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Modeled outputs' }),
    ).toBeVisible();
    for (const label of scenario.reportLabels) {
      await expect(page.locator('.report-page')).toContainText(label);
    }

    const baseline = await createEvaluation(
      page,
      makeComparisonInput(scenario, raw),
      `${caseId}-comparison-baseline`,
    );
    const comparison = await readComparison(
      page,
      evaluationId!,
      baseline.evaluation_id,
    );
    const comparedMetric = comparison.metric_deltas.find(
      (metric) => metric.key === scenario.comparisonKey,
    );
    expect(comparedMetric).toBeDefined();
    expect(comparedMetric?.current_value).not.toBe(
      comparedMetric?.baseline_value,
    );

    await page.goto(
      `/evaluations/${evaluationId}/compare/${baseline.evaluation_id}`,
    );
    await expect(
      page.getByRole('heading', { name: new RegExp(`${caseId} comparison`) }),
    ).toBeVisible();
  }
});
