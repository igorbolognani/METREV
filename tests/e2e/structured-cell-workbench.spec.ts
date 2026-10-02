import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { structuredCellFixture } from '../fixtures/structured-cell';
import { analystEmail, analystPassword } from './support/local-runtime';

// Dedicated config starts real Next.js, authenticated Fastify, PostgreSQL and native worker.
const api = 'http://localhost:4024';
async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(analystEmail);
  await page.getByLabel('Password', { exact: true }).fill(analystPassword);
  await Promise.all([
    page.waitForURL(/\/home(?:\?.*)?$/),
    page.getByRole('button', { name: 'Sign in', exact: true }).click(),
  ]);
  await page.goto('/modeling/spatial');
}
async function enqueue(page: Page, dimension: 2 | 3, failed = false) {
  const input = structuredCellFixture(dimension);
  if (failed) input.numerics.max_evaluations = 1;
  await page
    .getByRole('textbox', { name: 'Cell input JSON' })
    .fill(JSON.stringify(input));
  const created = page.waitForResponse(
    (r) =>
      r.url() === api + '/api/spatial-simulations' &&
      r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Queue cell run', exact: true })
    .click();
  const response = await created;
  expect(response.status()).toBe(202);
  return (await response.json()).run.id as string;
}

test('2D and 3D fields, probes, reload, slices and report downloads', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await signIn(page);
  const id = await enqueue(page, 2);
  await expect(
    page.getByText('2D · completed · 100%', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'concentration_reduced numerical cell field',
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Probe cell 0', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('region anode');
  await page
    .getByLabel('Numerical field', { exact: false })
    .selectOption('liquid_potential');
  await expect(
    page.getByRole('img', { name: 'liquid_potential numerical cell field' }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel('Saved run ID', { exact: false }).fill(id);
  await page.getByRole('button', { name: 'Reload run', exact: true }).click();
  await expect(
    page.getByText('2D · completed · 100%', { exact: true }),
  ).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page
    .getByRole('button', {
      name: 'Download development report JSON',
      exact: true,
    })
    .click();
  const file = await downloaded;
  const report = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(report).toMatchObject({
    decision_eligible: false,
    independent_validation: false,
    run: { id, dimension: 2 },
  });
  expect(
    report.parameter_provenance.every(
      (p: { source_kind: string }) => p.source_kind === 'test_fixture',
    ),
  ).toBe(true);
  let releaseMesh!: () => void;
  const heldMesh = new Promise<void>((resolve) => {
    releaseMesh = resolve;
  });
  await page.route('**/api/spatial-simulations/*/mesh', async (route) => {
    await heldMesh;
    await route.continue();
  });
  await enqueue(page, 3);
  await expect(
    page.getByText('3D · completed · 100%', { exact: true }),
  ).toBeVisible();
  // The preceding 2D field must disappear while the new geometry is in flight.
  await expect(
    page.getByRole('img', {
      name: 'concentration_reduced numerical cell field',
    }),
  ).toHaveCount(0);
  releaseMesh();
  await expect(
    page.getByRole('img', {
      name: 'concentration_reduced numerical cell field',
    }),
  ).toBeVisible();
  await page.unroute('**/api/spatial-simulations/*/mesh');
  await page.getByLabel('Z slice', { exact: true }).focus();
  await page.getByLabel('Z slice', { exact: true }).press('ArrowRight');
  await expect(
    page.getByText('3D mesh · XY slice 2/2', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Probe cell 0', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Probe cell 1', exact: true })
    .press('Enter');
  await expect(page.getByRole('status')).toContainText('Cell 1');
  expect(errors).toEqual([]);
});

test('failed solve retains diagnostic fields and cannot become a completed result', async ({
  page,
}) => {
  await signIn(page);
  const id = await enqueue(page, 2, true);
  await expect(page.getByText(/2D · failed ·/)).toBeVisible();
  await expect(
    page.getByText(/Termination: maximum_evaluations/),
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'concentration_reduced numerical cell field',
    }),
  ).toBeVisible();
  const reportResponse = await page.request.get(
    `${api}/api/spatial-simulations/${id}/report`,
  );
  expect(reportResponse.ok()).toBe(true);
  expect(await reportResponse.json()).toMatchObject({
    result_role: 'failed_run_diagnostics',
    decision_eligible: false,
  });
  const markdown = page.waitForEvent('download');
  await page
    .getByRole('button', {
      name: 'Download development report Markdown',
      exact: true,
    })
    .click();
  expect(await readFile((await (await markdown).path())!, 'utf8')).toContain(
    'maximum_evaluations',
  );
});
