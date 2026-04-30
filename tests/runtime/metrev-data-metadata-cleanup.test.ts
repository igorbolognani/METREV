import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const scannedRoots = [
  '.github',
  'AGENTS.md',
  'WORKFLOW.md',
  'README.md',
  'apps',
  'bioelectro-copilot-contracts/contracts',
  'bioelectrochem_agent_kit/domain',
  'docs',
  'package.json',
  'packages',
  'scripts',
  'specs',
  'tests',
];
const ignoredPathSegments = new Set([
  '.git',
  '.next',
  '.turbo',
  '.venv',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);
const ignoredFileNames = new Set(['pnpm-lock.yaml']);
const textFilePattern =
  /\.(css|csv|html|js|json|jsx|md|mdx|mjs|prisma|py|ts|tsx|txt|yml|yaml)$/i;

const retiredProgramToken = ['tram', 'pol', 'ine'].join('');
const retiredArticleTokens = [
  ['978178906', '3400'].join(''),
  ['978178906', '1154', '_0031'].join(''),
  ['El valor de los meta', 'datos'].join(''),
  ['recuperaci', ' n de recursos del agua'].join(''),
];
const retiredSeedTokens = [
  ['ingest:', retiredProgramToken, '-seed'].join(''),
  [retiredProgramToken, '-evidence-map-manifest'].join(''),
];
const forbiddenTokens = [
  retiredProgramToken,
  ...retiredArticleTokens,
  ...retiredSeedTokens,
].map((token) => token.toLowerCase());

function shouldSkipPath(path: string): boolean {
  const relativePath = relative(repoRoot, path);
  const parts = relativePath.split('/');

  return (
    parts.some((part) => ignoredPathSegments.has(part)) ||
    ignoredFileNames.has(parts.at(-1) ?? '')
  );
}

function collectFiles(path: string): string[] {
  if (!existsSync(path) || shouldSkipPath(path)) {
    return [];
  }

  const stat = statSync(path);
  if (stat.isDirectory()) {
    return readdirSync(path).flatMap((entry) =>
      collectFiles(join(path, entry)),
    );
  }

  if (!stat.isFile()) {
    return [];
  }

  return textFilePattern.test(path) ? [path] : [];
}

describe('METREV data metadata cleanup', () => {
  it('keeps retired external labels and article defaults out of active source files', () => {
    const files = scannedRoots.flatMap((rootPath) =>
      collectFiles(join(repoRoot, rootPath)),
    );
    const offenders = files.flatMap((filePath) => {
      const content = readFileSync(filePath, 'utf8').toLowerCase();
      const matchedTokens = forbiddenTokens.filter((token) =>
        content.includes(token),
      );

      if (matchedTokens.length === 0) {
        return [];
      }

      return [
        `${relative(repoRoot, filePath)} -> ${matchedTokens
          .map((token) => `${token.slice(0, 4)}...`)
          .join(', ')}`,
      ];
    });

    expect(offenders).toEqual([]);
  });
});
