import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotEnv } from 'dotenv';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, '..');
const workspaceRoot = resolve(packageDir, '../..');
const rootEnvPath = resolve(workspaceRoot, '.env');
const fallbackEnvPath = resolve(workspaceRoot, '.env.example');

if (existsSync(rootEnvPath)) {
  loadDotEnv({ path: rootEnvPath });
} else if (existsSync(fallbackEnvPath)) {
  loadDotEnv({ path: fallbackEnvPath });
}

const directConnection =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!directConnection) {
  console.error(
    'DIRECT_URL or DATABASE_URL must be configured before running Prisma migrations.',
  );
  process.exit(1);
}

const prismaArgs = process.argv.slice(2);

if (prismaArgs.length === 0) {
  console.error('Expected Prisma CLI arguments, for example: migrate deploy');
  process.exit(1);
}

const child = spawn(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'prisma', ...prismaArgs],
  {
    cwd: packageDir,
    env: {
      ...process.env,
      DATABASE_URL: directConnection,
    },
    stdio: 'inherit',
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
