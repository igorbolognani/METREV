import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@metrev/domain-contracts': fileURLToPath(
        new URL('./packages/domain-contracts/src/index.ts', import.meta.url),
      ),
      '@metrev/rule-engine': fileURLToPath(
        new URL('./packages/rule-engine/src/index.ts', import.meta.url),
      ),
      '@metrev/audit': fileURLToPath(
        new URL('./packages/audit/src/index.ts', import.meta.url),
      ),
      '@metrev/telemetry': fileURLToPath(
        new URL('./packages/telemetry/src/index.ts', import.meta.url),
      ),
      '@metrev/llm-adapter': fileURLToPath(
        new URL('./packages/llm-adapter/src/index.ts', import.meta.url),
      ),
      '@metrev/research-intelligence': fileURLToPath(
        new URL(
          './packages/research-intelligence/src/index.ts',
          import.meta.url,
        ),
      ),
      '@metrev/auth': fileURLToPath(
        new URL('./packages/auth/src/index.ts', import.meta.url),
      ),
      '@metrev/database': fileURLToPath(
        new URL('./packages/database/src/index.ts', import.meta.url),
      ),
      '@metrev/utils': fileURLToPath(
        new URL('./packages/utils/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['tests/postgres/**/*.test.ts'],
    environment: 'node',
    coverage: {
      reporter: ['text', 'html'],
      include: ['packages/**/*.ts', 'apps/api-server/src/**/*.ts'],
    },
  },
});
