import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadDotEnv } from 'dotenv';

import { PrismaClient } from '../generated/prisma/client';

let prismaClient: PrismaClient | undefined;

function findWorkspaceRoot(startDir: string): string {
  let currentDir = startDir;
  let reachedFilesystemRoot = false;

  while (!reachedFilesystemRoot) {
    if (existsSync(resolve(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      reachedFilesystemRoot = true;
      continue;
    }

    currentDir = parentDir;
  }

  return startDir;
}

const moduleDir =
  typeof import.meta.dirname === 'string'
    ? import.meta.dirname
    : dirname(fileURLToPath(import.meta.url));
const workspaceRoot =
  findWorkspaceRoot(process.cwd()) || resolve(moduleDir, '../..');
const rootEnvPath = resolve(workspaceRoot, '.env');
const fallbackEnvPath = resolve(workspaceRoot, '.env.example');

if (existsSync(rootEnvPath)) {
  loadDotEnv({ path: rootEnvPath });
} else if (existsSync(fallbackEnvPath)) {
  loadDotEnv({ path: fallbackEnvPath });
}

export function getPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Prisma access.');
  }

  if (!prismaClient) {
    const adapter = new PrismaPg({ connectionString });
    prismaClient = new PrismaClient({ adapter });
  }

  return prismaClient;
}

export async function disconnectPrismaClient(): Promise<void> {
  if (!prismaClient) {
    return;
  }

  await prismaClient.$disconnect();
  prismaClient = undefined;
}
