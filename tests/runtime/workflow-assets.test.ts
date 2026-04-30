import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

const requiredRootAssets = [
  'AGENTS.md',
  '.github/copilot-instructions.md',
  '.github/workflows/ci.yml',
  'WORKFLOW.md',
  '.github/instructions/general.instructions.md',
  '.github/instructions/testing.instructions.md',
  '.github/prompts/clarify-feature.prompt.md',
  '.github/prompts/plan-feature.prompt.md',
  '.github/prompts/start-feature.prompt.md',
  '.github/prompts/ship-change.prompt.md',
  '.github/prompts/review-diff.prompt.md',
  '.github/prompts/generate-tests.prompt.md',
  '.github/agents/planner.agent.md',
  '.github/agents/reviewer.agent.md',
  '.github/agents/validation-sentinel.agent.md',
  '.github/agents/workflow-orchestrator.agent.md',
  '.github/skills/spec-workflow/SKILL.md',
  '.github/skills/enforce-provenance/SKILL.md',
  '.github/skills/use-context7/SKILL.md',
  'docs/internal-feature-workflow.md',
  'docs/repository-authority-map.md',
  'docs/runtime-tooling-setup.md',
];

const customAgentIds = [
  'planner',
  'reviewer',
  'validation-sentinel',
  'workflow-orchestrator',
] as const;

const allowedPromptAgents = new Set<string>(['agent', ...customAgentIds]);

function readRepoFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

function readPackageJson() {
  return JSON.parse(readRepoFile('package.json')) as {
    scripts?: Record<string, string>;
  };
}

function parseFrontMatter(relativePath: string) {
  const content = readRepoFile(relativePath);
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);

  expect(
    match,
    `${relativePath} should start with YAML front matter`,
  ).not.toBeNull();

  return match?.[1] ?? '';
}

function readFrontMatterValue(relativePath: string, key: string) {
  const frontMatter = parseFrontMatter(relativePath);
  const match = frontMatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) {
    return null;
  }

  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

describe('root workflow assets', () => {
  it('keeps the active workflow surface present in the repository root', () => {
    for (const relativePath of requiredRootAssets) {
      expect(
        existsSync(resolve(repoRoot, relativePath)),
        `${relativePath} should exist as an active root workflow asset`,
      ).toBe(true);
    }
  });

  it('documents execution, validation, failure, and learning rules in WORKFLOW.md', () => {
    const workflow = readRepoFile('WORKFLOW.md');

    expect(workflow).toContain('# METREV Workflow Contract');
    expect(workflow).toContain('## Default Execution Loop');
    expect(workflow).toContain('## Agent Clean-Code Rules');
    expect(workflow).toContain('explicit types');
    expect(workflow).toContain('grepable names');
    expect(workflow).toContain('structured logging');
    expect(workflow).toContain('provenance');
    expect(workflow).toContain('focused validation');
    expect(workflow).toContain('## Validation Gates');
    expect(workflow).toContain('## Failure Policy');
    expect(workflow).toContain('## Learning Capture');
  });

  it('keeps the active clean-code anchors in the path instructions and validation script', () => {
    const generalInstructions = readRepoFile(
      '.github/instructions/general.instructions.md',
    );
    const testingInstructions = readRepoFile(
      '.github/instructions/testing.instructions.md',
    );
    const packageJson = readPackageJson();

    expect(generalInstructions).toContain('grepable names');
    expect(generalInstructions).toContain('structured logging');
    expect(generalInstructions).toContain('external I/O boundaries');
    expect(generalInstructions).toContain('focused validation');
    expect(testingInstructions).toContain(
      'most focused regression or behavior check available',
    );
    expect(packageJson.scripts?.['test:workflow-assets']).toBe(
      'vitest run tests/runtime/workflow-assets.test.ts',
    );
    expect(packageJson.scripts?.['format:workflow-assets']).toBe(
      'prettier --check .github/workflows/ci.yml WORKFLOW.md docs/internal-feature-workflow.md docs/repository-authority-map.md docs/runtime-tooling-setup.md tests/runtime/workflow-assets.test.ts specs/024-agent-ci-governance-hardening/spec.md specs/024-agent-ci-governance-hardening/plan.md specs/024-agent-ci-governance-hardening/tasks.md specs/024-agent-ci-governance-hardening/quickstart.md package.json',
    );
    expect(packageJson.scripts?.['test:e2e:install']).toBe(
      'playwright install --with-deps chromium',
    );
  });

  it('keeps CI aligned with the promoted workflow gates and debugging outputs', () => {
    const ciWorkflow = readRepoFile('.github/workflows/ci.yml');

    expect(ciWorkflow).toContain('name: CI');
    expect(ciWorkflow).toContain('Run fast validation matrix');
    expect(ciWorkflow).toContain('pnpm run validate:fast');
    expect(ciWorkflow).toContain('Check workflow formatting');
    expect(ciWorkflow).toContain('pnpm run format:workflow-assets');
    expect(ciWorkflow).toContain('Run local validation matrix');
    expect(ciWorkflow).toContain('pnpm run validate:local');
    expect(ciWorkflow).toContain(
      'Run deterministic advanced validation matrix',
    );
    expect(ciWorkflow).toContain('pnpm run validate:advanced');
    expect(ciWorkflow).toContain('Upload Playwright report');
    expect(ciWorkflow).toContain('path: playwright-report/');
    expect(ciWorkflow).toContain('Upload test results');
    expect(ciWorkflow).toContain('path: test-results/');
  });

  it('uses validated file-stem identifiers for custom prompt agents', () => {
    const promptDir = resolve(repoRoot, '.github/prompts');
    const promptFiles = readdirSync(promptDir).filter((fileName) =>
      fileName.endsWith('.prompt.md'),
    );

    for (const fileName of promptFiles) {
      const relativePath = `.github/prompts/${fileName}`;
      const agentId = readFrontMatterValue(relativePath, 'agent');
      if (!agentId) {
        continue;
      }

      expect(
        allowedPromptAgents.has(agentId),
        `${relativePath} uses an unsupported agent identifier: ${agentId}`,
      ).toBe(true);

      if (agentId !== 'agent') {
        expect(agentId).toBe(agentId.toLowerCase());
        expect(
          existsSync(resolve(repoRoot, `.github/agents/${agentId}.agent.md`)),
          `${relativePath} should reference an existing root agent file`,
        ).toBe(true);
      }
    }
  });

  it('pins the staged and specialist prompts to the intended root agents', () => {
    expect(
      readFrontMatterValue(
        '.github/prompts/clarify-feature.prompt.md',
        'agent',
      ),
    ).toBe('planner');
    expect(
      readFrontMatterValue('.github/prompts/plan-feature.prompt.md', 'agent'),
    ).toBe('planner');
    expect(
      readFrontMatterValue('.github/prompts/ship-change.prompt.md', 'agent'),
    ).toBe('workflow-orchestrator');
    expect(
      readFrontMatterValue(
        '.github/prompts/critique-integration.prompt.md',
        'agent',
      ),
    ).toBe('reviewer');
    expect(
      readFrontMatterValue('.github/prompts/review-diff.prompt.md', 'agent'),
    ).toBe('reviewer');
    expect(
      readFrontMatterValue('.github/prompts/generate-tests.prompt.md', 'agent'),
    ).toBe('agent');
  });
});
