import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

function readRepoFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

function readPackageJson() {
  return JSON.parse(readRepoFile('package.json')) as {
    scripts?: Record<string, string>;
  };
}

describe('METREV bootstrap and automation', () => {
  it('keeps one concise active setup and instruction surface', () => {
    for (const relativePath of [
      'README.md',
      'AGENTS.md',
      '.github/copilot-instructions.md',
      '.github/dependabot.yml',
      '.github/workflows/ci.yml',
      '.github/workflows/codeql.yml',
    ]) {
      expect(
        existsSync(resolve(repoRoot, relativePath)),
        `${relativePath} should exist`,
      ).toBe(true);
    }

    expect(existsSync(resolve(repoRoot, 'specs'))).toBe(false);
    expect(existsSync(resolve(repoRoot, 'WORKFLOW.md'))).toBe(false);
    expect(existsSync(resolve(repoRoot, 'docs'))).toBe(false);
  });

  it('states the scientific scope, input contract, limits, and corpus status', () => {
    const readme = readRepoFile('README.md');
    const agentRules = readRepoFile('AGENTS.md');

    for (const term of [
      'MFC',
      'MEC',
      'wastewater treatment',
      'electrochemical biosensors',
      'lumped, isothermal 0D',
      'value, unit, source kind',
      'modeled outputs',
      'uncertainty',
      '20 queries',
      '480 before duplicates',
      'ten source records and ten claims, all pending human review',
    ]) {
      expect(readme).toContain(term);
    }

    expect(agentRules).toContain('Never invent');
    expect(agentRules).toContain('source_ref');
    expect(agentRules).toContain('return `insufficient_data`');
    expect(agentRules).toContain('Dry-run/planning commands must stay offline');
    expect(agentRules).not.toContain('specs/NNN');
  });

  it('keeps focused validation and formatting commands aligned with the bootstrap', () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts?.['test:workflow-assets']).toBe(
      'vitest run tests/runtime/workflow-assets.test.ts',
    );
    expect(packageJson.scripts?.['lint:workflow-semantics']).toBe(
      'node scripts/run-workflow-semantic-lint.mjs',
    );
    expect(packageJson.scripts?.['test:e2e:install']).toBe(
      'playwright install --with-deps chromium',
    );
    expect(packageJson.scripts?.['test:e2e:smoke']).toBe(
      'PLAYWRIGHT_SKIP_BOOTSTRAP=1 playwright test tests/e2e/local-view-smoke.spec.ts',
    );
    expect(packageJson.scripts?.['validate:local:smoke']).toBe(
      'node scripts/run-local-validation.mjs --smoke-only',
    );
    expect(packageJson.scripts?.['validate:db']).toBe(
      'pnpm run db:migrate:deploy && pnpm run db:seed && pnpm run test:db',
    );
    expect(packageJson.scripts?.['db:bootstrap:focused:dry-run']).toContain(
      '--planOnly',
    );
    expect(
      packageJson.scripts?.['research:queue:focused-literature:dry-run'],
    ).toContain('--dryRun');
    expect(
      packageJson.scripts?.['export:repository:functional'],
    ).toBeUndefined();
    expect(packageJson.scripts?.['format:workflow-assets']).not.toContain(
      'specs/',
    );
  });

  it('keeps CI and security checks rooted in maintained GitHub assets', () => {
    const ciWorkflow = readRepoFile('.github/workflows/ci.yml');
    const codeqlWorkflow = readRepoFile('.github/workflows/codeql.yml');
    const dependabotConfig = readRepoFile('.github/dependabot.yml');

    expect(ciWorkflow).toContain('pnpm run lint:workflow-semantics');
    expect(ciWorkflow).toContain('pnpm run format:workflow-assets');
    expect(ciWorkflow).toContain('pnpm run validate:fast');
    expect(ciWorkflow).toContain('pnpm run validate:db');
    expect(ciWorkflow).toContain('pnpm run validate:local:smoke');
    expect(ciWorkflow).toContain('pnpm run validate:advanced');
    expect(codeqlWorkflow).toMatch(/github\/codeql-action\/init@v\d+/);
    expect(codeqlWorkflow).toMatch(/github\/codeql-action\/analyze@v\d+/);
    expect(dependabotConfig).toContain("package-ecosystem: 'github-actions'");
    expect(dependabotConfig).toContain("package-ecosystem: 'npm'");
    expect(dependabotConfig).toContain("package-ecosystem: 'pip'");
  });

  it('keeps local smoke setup explicit and workflow lint reproducible', () => {
    const localValidationScript = readRepoFile(
      'scripts/run-local-validation.mjs',
    );
    const globalSetup = readRepoFile('tests/e2e/global.setup.ts');
    const smokeSpec = readRepoFile('tests/e2e/local-view-smoke.spec.ts');
    const semanticLintScript = readRepoFile(
      'scripts/run-workflow-semantic-lint.mjs',
    );

    expect(localValidationScript).toContain(
      "process.argv.includes('--smoke-only')",
    );
    expect(localValidationScript).toContain('METREV_SKIP_LOCAL_SMOKE');
    expect(localValidationScript).toContain(
      "execPnpm(['run', 'test:e2e:smoke']",
    );
    expect(globalSetup).toContain('PLAYWRIGHT_SKIP_BOOTSTRAP');
    expect(smokeSpec).toContain("page.goto('/')");
    expect(smokeSpec).toContain("page.goto('/login')");
    expect(semanticLintScript).toContain('rhysd/actionlint:1.7.12');
    expect(semanticLintScript).toContain("'docker'");
  });
});
