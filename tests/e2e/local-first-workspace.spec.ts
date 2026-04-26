import { expect, test } from '@playwright/test';

import {
    analystEmail,
    analystPassword,
    playwrightApiBaseUrl,
    seededEvidenceSummary,
    seededEvidenceTitle,
} from './support/local-runtime';

async function signInAsAnalyst(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(analystEmail);
  await page.getByLabel('Password').fill(analystPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText(analystEmail)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

function extractEvaluationId(url: string): string {
  const match = url.match(/\/evaluations\/([^/]+)$/);
  if (!match) {
    throw new Error(`Could not extract evaluation id from ${url}`);
  }

  return match[1];
}

function buildApiEvaluationPayload(caseId: string) {
  return {
    case_id: caseId,
    technology_family: 'microbial_fuel_cell',
    architecture_family: 'single_chamber_air_cathode',
    primary_objective: 'wastewater_treatment',
    business_context: {
      deployment_context: 'playwright local validation flow',
      capex_constraint_level: 'medium',
      opex_sensitivity_level: 'high',
    },
    technology_context: {
      current_pain_points: ['weak monitoring', 'unstable startup'],
      current_trl: 'pilot',
    },
    feed_and_operation: {
      influent_type: 'high-strength industrial wastewater',
      temperature_c: 28,
      pH: 7.1,
    },
    stack_blocks: {
      anode_biofilm_support: {
        material_family: 'carbon felt',
      },
      cathode_catalyst_support: {
        material_family: 'carbon cloth',
      },
      balance_of_plant: {
        bop_summary: 'recirculation loop with manual dosing',
      },
    },
    evidence_refs: ['literature:pilot-baseline'],
  };
}

async function createEvaluationViaApi(
  page: import('@playwright/test').Page,
  input: {
    caseId: string;
    idempotencyKey: string;
  },
): Promise<{ evaluation_id: string }> {
  const payload = buildApiEvaluationPayload(input.caseId);

  const response = await page.evaluate(
    async ({ apiBaseUrl, idempotencyKey, payload }) => {
      const result = await fetch(`${apiBaseUrl}/api/cases/evaluate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      return {
        ok: result.ok,
        status: result.status,
        body: await result.text(),
      };
    },
    {
      apiBaseUrl: playwrightApiBaseUrl,
      idempotencyKey: input.idempotencyKey,
      payload,
    },
  );

  expect(
    response.ok,
    `Expected ${playwrightApiBaseUrl}/api/cases/evaluate to succeed, received ${response.status}: ${response.body}`,
  ).toBe(true);

  return JSON.parse(response.body) as { evaluation_id: string };
}

test.describe('local-first professional workspace', () => {
  test('covers review, intake, submitting, result, exports, report, history, and comparison', async ({
    page,
  }) => {
    const caseId = `PW-E2E-${Date.now()}`;

    await signInAsAnalyst(page);

    await page.getByRole('link', { name: 'Evidence Review' }).first().click();
    await expect(page).toHaveURL(/\/evidence\/review$/);

    await page.getByLabel('Search catalog').fill(seededEvidenceTitle);
    const seededQueueCard = page
      .getByRole('row')
      .filter({ hasText: seededEvidenceTitle })
      .first();
    await expect(seededQueueCard).toContainText(seededEvidenceSummary);
    await seededQueueCard
      .getByRole('link', { name: /Open (detail|review detail)/ })
      .click();

    await expect(page).toHaveURL(/\/evidence\/review\/.+/);
    await expect(
      page.getByRole('button', { name: 'Accept for intake' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Accept for intake' }).click();

    await page.getByRole('link', { name: 'Open stack cockpit' }).click();
    await expect(page).toHaveURL(/\/cases\/new$/);

    const wastewaterPreset = page
      .locator('article')
      .filter({ hasText: 'Autofill industrial wastewater stabilization case' })
      .first();
    await wastewaterPreset
      .getByRole('button', { name: 'Load preset' })
      .first()
      .click();

    await page.getByLabel('Case identifier').fill(caseId);
    await page.getByRole('button', { name: /Suppliers & Constraints/ }).click();

    await page
      .getByRole('button', { name: 'Include evidence' })
      .first()
      .click();
    await expect(page.getByText('1 selected')).toBeVisible();

    await page.getByRole('button', { name: /Review & Submit/ }).click();
    await page
      .getByLabel('Working assumptions')
      .fill('playwright assumption, runtime local validation');

    await page
      .getByRole('button', { name: 'Run deterministic evaluation' })
      .click();
    await page.waitForURL(/\/evaluations\/[^/]+$/, { timeout: 120_000 });

    const firstEvaluationId = extractEvaluationId(page.url());

    await expect(page.getByTestId('evaluation-workspace')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Export JSON' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Export CSV' })).toBeVisible();

    const jsonDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Export JSON' }).click();
    await expect((await jsonDownload).suggestedFilename()).toContain(caseId);

    const csvDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Export CSV' }).click();
    await expect((await csvDownload).suggestedFilename()).toMatch(/\.csv$/);

    await page
      .getByTestId('evaluation-workspace')
      .getByRole('link', { name: 'Report' })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/evaluations/${firstEvaluationId}/report$`),
    );
    await page.getByRole('button', { name: 'Ask this report' }).click();
    const reportDrawer = page.getByRole('complementary', {
      name: 'Ask this report',
    });
    await expect(reportDrawer).toBeVisible();
    await reportDrawer
      .getByLabel('Question about this report')
      .fill('Explain the report confidence posture and next checks.');
    await reportDrawer.getByRole('button', { name: 'Ask' }).click();
    await expect(
      reportDrawer.locator('.report-conversation-message--user'),
    ).toContainText('Explain the report confidence posture and next checks.');
    await expect(
      reportDrawer.locator('.report-conversation-message--assistant'),
    ).toBeVisible();
    await expect(
      reportDrawer.locator('.report-conversation-trace'),
    ).toBeVisible();

    await page.evaluate(() => {
      Object.defineProperty(window, '__playwrightPrintCalled', {
        configurable: true,
        writable: true,
        value: false,
      });

      window.print = () => {
        Object.defineProperty(window, '__playwrightPrintCalled', {
          configurable: true,
          writable: true,
          value: true,
        });
      };
    });
    await page.getByRole('button', { name: 'Print / Save as PDF' }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __playwrightPrintCalled?: boolean })
              .__playwrightPrintCalled ?? false,
        ),
      )
      .toBe(true);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.report-page')).toBeVisible();
    await expect(page.locator('.report-conversation-drawer')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });

    await page.goto('/cases/new');
    await expect(page).toHaveURL(/\/cases\/new$/);
    await page.getByRole('button', { name: /Review & Submit/ }).click();
    await page
      .getByLabel('Working assumptions')
      .fill('playwright assumption rerun, runtime local validation');
    await page
      .getByRole('button', { name: 'Run deterministic evaluation' })
      .click();
    await page.waitForURL(/\/evaluations\/[^/]+$/, { timeout: 120_000 });

    const secondEvaluationId = extractEvaluationId(page.url());
    expect(secondEvaluationId).not.toBe(firstEvaluationId);

    await page.getByRole('link', { name: /^Case history$/ }).click();
    await expect(page).toHaveURL(/\/cases\/[^/]+\/history$/);
    const historyCaseIdMatch = page.url().match(/\/cases\/([^/]+)\/history$/);
    if (!historyCaseIdMatch) {
      throw new Error(`Could not extract case id from ${page.url()}`);
    }
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: `${historyCaseIdMatch[1]} history`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('row')
        .filter({ hasText: /Latest run/ })
        .first(),
    ).toBeVisible();

    const compareCaseId = `PW-COMPARE-${Date.now()}`;
    const baselineEvaluation = await createEvaluationViaApi(page, {
      caseId: compareCaseId,
      idempotencyKey: `${compareCaseId}-baseline`,
    });
    const currentEvaluation = await createEvaluationViaApi(page, {
      caseId: compareCaseId,
      idempotencyKey: `${compareCaseId}-current`,
    });

    await page.goto(
      `/evaluations/${currentEvaluation.evaluation_id}/compare/${baselineEvaluation.evaluation_id}`,
    );
    await expect(page).toHaveURL(/\/compare\//);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: new RegExp(`^${compareCaseId} (run )?comparison$`),
      }),
    ).toBeVisible();
  });

  test('reuses the same evaluation for duplicate submissions with the same idempotency key', async ({
    page,
  }) => {
    const idempotencyKey = `pw-idempotency-${Date.now()}`;
    const caseId = `PW-IDEMP-${Date.now()}`;

    await signInAsAnalyst(page);

    const firstResult = await createEvaluationViaApi(page, {
      caseId,
      idempotencyKey,
    });
    const secondResult = await createEvaluationViaApi(page, {
      caseId,
      idempotencyKey,
    });

    expect(secondResult.evaluation_id).toBe(firstResult.evaluation_id);
  });
});
