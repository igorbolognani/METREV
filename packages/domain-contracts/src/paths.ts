import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDir, '..');
const repoRoot = resolve(packageRoot, '../..');

export const contractsRootPath = resolve(
  repoRoot,
  'bioelectro-copilot-contracts/contracts',
);
export const domainRootPath = resolve(
  repoRoot,
  'bioelectrochem_agent_kit/domain',
);
export const stackBriefPath = resolve(repoRoot, 'stack.md');
