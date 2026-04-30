import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@metrev/domain-contracts/browser': fileURLToPath(
        new URL('./packages/domain-contracts/src/browser.ts', import.meta.url),
      ),
      '@metrev/domain-contracts': fileURLToPath(
        new URL('./packages/domain-contracts/src/index.ts', import.meta.url),
      ),
      '@metrev/electrochem-models': fileURLToPath(
        new URL('./packages/electrochem-models/src/index.ts', import.meta.url),
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
      '@': fileURLToPath(new URL('./apps/web-ui/src', import.meta.url)),
      react: fileURLToPath(
        new URL('./apps/web-ui/node_modules/react/index.js', import.meta.url),
      ),
      'react/jsx-runtime': fileURLToPath(
        new URL(
          './apps/web-ui/node_modules/react/jsx-runtime.js',
          import.meta.url,
        ),
      ),
      'react/jsx-dev-runtime': fileURLToPath(
        new URL(
          './apps/web-ui/node_modules/react/jsx-dev-runtime.js',
          import.meta.url,
        ),
      ),
      'react-dom': fileURLToPath(
        new URL(
          './apps/web-ui/node_modules/react-dom/index.js',
          import.meta.url,
        ),
      ),
      'react-dom/server': fileURLToPath(
        new URL(
          './apps/web-ui/node_modules/react-dom/server.node.js',
          import.meta.url,
        ),
      ),
      '@tanstack/react-query': fileURLToPath(
        new URL(
          './apps/web-ui/node_modules/@tanstack/react-query/build/modern/index.js',
          import.meta.url,
        ),
      ),
      'server-only': fileURLToPath(
        new URL('./tests/fixtures/server-only-stub.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['tests/runtime/**/*.test.ts', 'tests/web-ui/**/*.test.{ts,tsx}'],
    environment: 'node',
    coverage: {
      reporter: ['text', 'html'],
      include: [
        'packages/**/*.ts',
        'apps/api-server/src/**/*.ts',
        'apps/web-ui/src/**/*.{ts,tsx}',
      ],
    },
  },
});
