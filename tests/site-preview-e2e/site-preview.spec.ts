import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

const scenarios = [
  { id: 'mfc_wastewater', mode: 'MFC', hasSensor: false },
  { id: 'mec_wastewater', mode: 'MEC', hasSensor: false },
  { id: 'biosensor_standalone', mode: 'Biosensor', hasSensor: true },
  { id: 'mfc_integrated_biosensor', mode: 'MFC', hasSensor: true },
  { id: 'mec_integrated_biosensor', mode: 'MEC', hasSensor: true },
] as const;

test('runs all five solver modes and navigates modeled SVG sections in Chromium', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: 'MFC · MEC · wastewater · electrochemical biosensors',
    }),
  ).toBeVisible();

  const scenario = page.getByLabel('Scenario');
  const explorer = page.locator('.simulation-svg-explorer');
  const svg = explorer.locator('svg.simulation-svg-explorer__canvas');
  const sections = explorer.getByRole('navigation', {
    name: 'Simulation diagram sections',
  });
  const modes = explorer.getByRole('group', { name: 'Diagram mode' });

  for (const item of scenarios) {
    await scenario.selectOption(item.id);
    await page.getByRole('button', { name: 'Run solver' }).click();
    await expect(
      page.getByText('Solver completed · outputs below are modeled.'),
    ).toBeVisible();
    await expect(
      explorer.getByRole('heading', { name: 'Cell and process explorer' }),
    ).toBeVisible();
    await expect(
      modes.getByRole('button', { name: item.mode, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');

    await sections.getByRole('button', { name: 'Process and outputs' }).click();
    if (item.mode === 'MFC') {
      await expect(svg).toContainText('Gross electrical output');
      await expect(svg).toContainText('Net MFC power after auxiliary demand');
    } else if (item.mode === 'MEC') {
      await expect(svg).toContainText('Gross MEC hydrogen production rate');
      await expect(svg).toContainText('Captured MEC hydrogen rate');
      await expect(svg).toContainText(
        'Modeled gross MEC hydrogen not captured rate',
      );
      await expect(svg).toContainText('MEC cell electrical input');
    } else {
      await sections.getByRole('button', { name: 'Biosensor' }).click();
      await expect(svg).toContainText(/biosensor signal/i);
    }

    if (item.hasSensor) {
      await sections.getByRole('button', { name: 'Biosensor' }).click();
      await expect(svg).toContainText(/biosensor signal/i);
    }

    await sections.getByRole('button', { name: 'Losses and balances' }).click();
    await expect(svg).toContainText('Modeled terms');
    await expect(svg).toContainText('Not quantified as physical losses');
    await expect(svg).toContainText('Gas crossover, dissolution and leakage');
    await expect(
      explorer.locator('.simulation-svg-explorer__footnote'),
    ).toContainText('not measured loss mechanisms');

    await sections.getByRole('button', { name: 'Model limits' }).click();
    await expect(svg).toContainText('Lumped, isothermal and 0D reactor states');
    await expect(svg).toContainText('No independent parameter calibration');
    await expect(svg).toContainText(
      'It does not establish predictive accuracy.',
    );

    await sections.getByRole('button', { name: 'Process and outputs' }).click();
    const anode = svg.locator(
      'g[role="button"][aria-label^="Anode component"]',
    );
    await expect(anode).toHaveAttribute('tabindex', '0');
    await anode.focus();
    await anode.press('Enter');
    await expect(svg).toContainText('The anode balance couples');

    if (item.mode === 'MEC') {
      const hydrogen = svg.locator(
        'g[role="button"][aria-label^="Hydrogen product handling"]',
      );
      await expect(hydrogen).toHaveAttribute('tabindex', '0');
      await hydrogen.focus();
      await hydrogen.press('Enter');
      await expect(svg).toContainText('MEC gross Faradaic H₂');
    }

    if (item.hasSensor && item.id !== 'biosensor_standalone') {
      await svg
        .locator('g[role="button"][aria-label^="Integrated biosensor"]')
        .click();
      await expect(svg).toContainText(
        'supplied static amperometric calibration',
      );
    }

    if (item.id === 'mfc_wastewater') {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download JSON report' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(
        'metrev-mfc_wastewater-test-fixture-report.json',
      );
      const filePath = await download.path();
      expect(filePath).toBeTruthy();
      const report = JSON.parse(await readFile(filePath!, 'utf8')) as {
        report_type: string;
        scientific_status: string;
        simulation: {
          derived_observations: Array<{ source_kind: string }>;
        };
      };
      expect(report.report_type).toBe('site-preview-test-fixture-run');
      expect(report.scientific_status).toBe('not independently validated');
      expect(report.simulation.derived_observations.length).toBeGreaterThan(0);
      expect(
        report.simulation.derived_observations.every(
          (observation) => observation.source_kind === 'modeled',
        ),
      ).toBe(true);
    }
  }
});

test('saves and restores an MEC run in browser storage after reload', async ({
  page,
}) => {
  await page.goto('/');
  const scenario = page.getByLabel('Scenario');
  await scenario.selectOption('mec_wastewater');
  await page.getByRole('button', { name: 'Run solver' }).click();
  await expect(page.getByText('MEC wastewater cell')).toBeVisible();
  await page.getByRole('button', { name: 'Save in this browser' }).click();
  await expect(
    page.getByText(
      'Saved in this browser. Reload the page to restore and rerun it.',
    ),
  ).toBeVisible();

  await page.reload();
  await expect(scenario).toHaveValue('mec_wastewater');
  await expect(page.getByText('MEC wastewater cell')).toBeVisible();
  await expect(
    page.getByText('Solver completed · outputs below are modeled.'),
  ).toBeVisible();
});

test('returns insufficient_data for missing, incompatible, and out-of-range inputs', async ({
  page,
}) => {
  await page.goto('/');
  const scenario = page.getByLabel('Scenario');
  const run = page.getByRole('button', { name: 'Run solver' });

  await scenario.selectOption('mfc_wastewater');
  await page
    .locator('.site-preview-form label')
    .filter({ hasText: 'Influent COD' })
    .locator('input')
    .fill('');
  await run.click();
  await expect(page.getByText('insufficient_data')).toBeVisible();
  await expect(page.getByText('Influent COD is required.')).toBeVisible();

  await scenario.selectOption('mec_wastewater');
  await page.getByLabel('COD unit').selectOption('mgBOD/L');
  await run.click();
  await expect(page.getByText('insufficient_data')).toBeVisible();
  await expect(
    page.getByText(/COD cannot be supplied in a BOD unit/),
  ).toBeVisible();

  await scenario.selectOption('mfc_wastewater');
  await page.getByLabel('Influent pH').fill('15');
  await run.click();
  await expect(page.getByText('insufficient_data')).toBeVisible();
  await expect(page.getByText(/pH must be between 0 and 14/)).toBeVisible();

  await scenario.selectOption('mfc_integrated_biosensor');
  await page.getByLabel(/Biosensor concentration/).fill('101');
  await run.click();
  await expect(page.getByText('insufficient_data')).toBeVisible();
  await expect(page.getByText(/calibration interval/)).toBeVisible();
});
