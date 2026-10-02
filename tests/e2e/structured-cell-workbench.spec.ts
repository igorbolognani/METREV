import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { structuredCellFixture } from '../fixtures/structured-cell';
import { analystEmail, analystPassword } from './support/local-runtime';
import rawCaseFixture from '../fixtures/raw-case-input.json';

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

test('saved case composition, exact fidelity refusal and durable run history', async ({
  page,
}) => {
  await signIn(page);
  // Plain intake data keeps Playwright independent of the server's ESM loaders.
  const rawInput = {
    ...rawCaseFixture,
    case_id: `browser-case-cell-${crypto.randomUUID()}`,
    mechanistic_model: undefined,
    stack_blocks: {
      ...rawCaseFixture.stack_blocks,
      reactor_architecture: {
        architecture_type: 'planar',
        membrane_presence: 'present',
      },
    },
  };
  const request = {
    input: structuredCellFixture(),
    component_domains: [
      { domain_tag: 'anode', stack_block: 'anode_biofilm_support' },
      { domain_tag: 'membrane', stack_block: 'membrane_or_separator' },
      { domain_tag: 'cathode', stack_block: 'cathode_catalyst_support' },
    ],
  };
  const evaluationResponse = await page.request.post(
    api + '/api/cases/evaluate',
    { data: rawInput },
  );
  expect(evaluationResponse.status()).toBe(201);
  const evaluation = await evaluationResponse.json();
  await page.goto(`/modeling/spatial?evaluation=${evaluation.evaluation_id}`);
  await page
    .getByRole('textbox', { name: 'Cell input JSON' })
    .fill(JSON.stringify(request.input));
  for (const mapping of request.component_domains!)
    await page
      .getByLabel(`Case component for ${mapping.domain_tag}`, { exact: true })
      .selectOption(mapping.stack_block);
  await page
    .getByLabel('Additional required physics')
    .fill('fixed_membrane_charge');
  await page
    .getByRole('button', { name: 'Check case composition', exact: true })
    .click();
  await expect(
    page.getByText(
      'Composition status: not_implemented. Decision eligible: false.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Queue case run', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Additional required physics').fill('');
  await page
    .getByRole('button', { name: 'Check case composition', exact: true })
    .click();
  await expect(
    page.getByText('Composition status: ready. Decision eligible: false.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('12 cells · 49 algebraic states · sparse Newton coupling', {
      exact: true,
    }),
  ).toBeVisible();
  const queued = page.waitForResponse(
    (r) =>
      r.url() ===
        api +
          `/api/evaluations/${evaluation.evaluation_id}/spatial-simulations` &&
      r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Queue case run', exact: true })
    .click();
  const created = await queued;
  expect(created.status()).toBe(202);
  const id = (await created.json()).run.id;
  await expect(
    page.getByText('2D · completed · 100%', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'concentration_reduced numerical cell field',
    }),
  ).toBeVisible();
  const report = await page.request.get(
    `${api}/api/spatial-simulations/${id}/report`,
  );
  expect(report.status()).toBe(200);
  expect(await report.json()).toMatchObject({
    case_context: {
      evaluation_id: evaluation.evaluation_id,
      case_id: rawInput.case_id,
      component_domains: request.component_domains,
    },
    equation_graph: { algebraic_state_count: 49 },
    decision_eligible: false,
  });
  await page.reload();
  await page
    .getByRole('button', { name: 'Reload case runs', exact: true })
    .click();
  await page
    .getByRole('button', { name: `2D · completed · ${id}`, exact: true })
    .click();
  await expect(
    page.getByText('2D · completed · 100%', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'concentration_reduced numerical cell field',
    }),
  ).toBeVisible();
});

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

test('compares saved completed-run summaries only for matching geometry and units', async ({
  page,
}) => {
  await signIn(page);
  const runA = await enqueue(page, 2);
  await expect(
    page.getByText('2D · completed · 100%', { exact: true }),
  ).toBeVisible();
  const runB = await enqueue(page, 2);
  await expect(
    page.getByText('2D · completed · 100%', { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByText(/does not interpolate or remap meshes/i),
  ).toBeVisible();
  await page.getByLabel('Second saved run ID', { exact: true }).fill(runA);
  await page
    .getByRole('button', { name: 'Compare summaries', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(`A: ${runB}`);
  await expect(page.getByRole('status')).toContainText(`B: ${runA}`);
  await expect(page.getByRole('status')).toContainText(
    'Decision eligible: false.',
  );
  await expect(page.getByRole('table').last()).toContainText(
    'concentration_reduced',
  );
  await expect(page.getByRole('table').last()).toContainText('Δ (B − A)');
});
