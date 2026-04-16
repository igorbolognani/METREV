import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotEnv } from 'dotenv';

export function loadWorkspaceEnv(importMetaUrl) {
  const scriptDir = dirname(fileURLToPath(importMetaUrl));
  const packageDir = resolve(scriptDir, '..');
  const workspaceRoot = resolve(packageDir, '../..');
  const rootEnvPath = resolve(workspaceRoot, '.env');
  const fallbackEnvPath = resolve(workspaceRoot, '.env.example');

  if (existsSync(rootEnvPath)) {
    loadDotEnv({ path: rootEnvPath });
    return;
  }

  if (existsSync(fallbackEnvPath)) {
    loadDotEnv({ path: fallbackEnvPath });
  }
}
