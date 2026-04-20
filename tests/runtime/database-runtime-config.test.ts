import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { assertRuntimeDatabaseConfiguration } from '@metrev/database';

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorageMode = process.env.METREV_STORAGE_MODE;

describe('runtime database configuration', () => {
  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalStorageMode === undefined) {
      delete process.env.METREV_STORAGE_MODE;
    } else {
      process.env.METREV_STORAGE_MODE = originalStorageMode;
    }
  });

  it('accepts postgres-backed runtime configuration', () => {
    process.env.DATABASE_URL =
      'postgresql://metrev:metrev@localhost:5432/metrev?schema=public';
    delete process.env.METREV_STORAGE_MODE;

    expect(() => assertRuntimeDatabaseConfiguration()).not.toThrow();
  });

  it('rejects missing database URLs for runtime startup', () => {
    delete process.env.DATABASE_URL;
    delete process.env.METREV_STORAGE_MODE;

    expect(() => assertRuntimeDatabaseConfiguration()).toThrow(
      /DATABASE_URL is required/i,
    );
  });

  it('rejects in-memory runtime mode outside test injection paths', () => {
    process.env.DATABASE_URL =
      'postgresql://metrev:metrev@localhost:5432/metrev?schema=public';
    process.env.METREV_STORAGE_MODE = 'memory';

    expect(() => assertRuntimeDatabaseConfiguration()).toThrow(
      /requires PostgreSQL-backed persistence/i,
    );
  });

  it('keeps the validated Prisma 7 datasource posture in the checked-in files', () => {
    const repoRoot = resolve(__dirname, '../..');
    const schema = readFileSync(
      resolve(repoRoot, 'packages/database/prisma/schema.prisma'),
      'utf8',
    );
    const prismaConfig = readFileSync(
      resolve(repoRoot, 'packages/database/prisma.config.ts'),
      'utf8',
    );
    const migrateWrapper = readFileSync(
      resolve(
        repoRoot,
        'packages/database/scripts/run-prisma-with-direct-url.mjs',
      ),
      'utf8',
    );

    expect(schema).toMatch(/datasource db \{\s*provider = "postgresql"\s*\}/);
    expect(schema).not.toMatch(/url\s*=\s*env\("DATABASE_URL"\)/);
    expect(prismaConfig).toMatch(/datasource:\s*\{/);
    expect(prismaConfig).toMatch(/DIRECT_URL \?\?/);
    expect(migrateWrapper).toMatch(
      /DIRECT_URL\?\.trim\(\) \|\| process\.env\.DATABASE_URL\?\.trim\(\)/,
    );
  });
});
