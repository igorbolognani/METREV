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
});
