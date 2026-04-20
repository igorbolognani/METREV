import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadDotEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const rootEnvPath = resolve(workspaceRoot, '.env');
const fallbackEnvPath = resolve(workspaceRoot, '.env.example');

if (existsSync(rootEnvPath)) {
  loadDotEnv({ path: rootEnvPath });
} else if (existsSync(fallbackEnvPath)) {
  loadDotEnv({ path: fallbackEnvPath });
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      'postgresql://metrev:metrev@localhost:5432/metrev?schema=public',
  },
});
