import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDirectory = resolve(repositoryRoot, 'site-dist');
const entryPoint = resolve(
  repositoryRoot,
  'apps/web-ui/src/site-preview/main.tsx',
);
const htmlSource = resolve(
  repositoryRoot,
  'apps/web-ui/site-preview/index.html',
);
const fixtureGenerator = resolve(
  repositoryRoot,
  'apps/web-ui/src/site-preview/generate-fixtures.ts',
);
const fixtureVerifier = resolve(
  repositoryRoot,
  'apps/web-ui/src/site-preview/verify-fixtures.ts',
);
const require = createRequire(import.meta.url);
const { build } = require('esbuild');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(resolve(outputDirectory, 'assets'), { recursive: true });
await cp(htmlSource, resolve(outputDirectory, 'index.html'));
execFileSync(
  process.execPath,
  [
    '--import=tsx/esm',
    fixtureGenerator,
    resolve(outputDirectory, 'scenarios.json'),
  ],
  { cwd: resolve(repositoryRoot, 'packages/database'), stdio: 'inherit' },
);
execFileSync(
  process.execPath,
  [
    '--import=tsx/esm',
    fixtureVerifier,
    resolve(outputDirectory, 'scenarios.json'),
  ],
  { cwd: resolve(repositoryRoot, 'packages/database'), stdio: 'inherit' },
);

const result = await build({
  alias: {
    '@metrev/domain-contracts': resolve(
      repositoryRoot,
      'packages/domain-contracts/src/browser-runtime.ts',
    ),
    '@metrev/electrochem-models': resolve(
      repositoryRoot,
      'packages/electrochem-models/src/index.ts',
    ),
  },
  bundle: true,
  entryPoints: [entryPoint],
  entryNames: 'app',
  loader: { '.yml': 'text' },
  minify: true,
  metafile: true,
  outdir: resolve(outputDirectory, 'assets'),
  platform: 'browser',
  target: ['es2022'],
  write: true,
});

const jsPath = resolve(outputDirectory, 'assets/app.js');
const cssPath = resolve(outputDirectory, 'assets/app.css');
for (const filePath of [
  jsPath,
  cssPath,
  resolve(outputDirectory, 'scenarios.json'),
]) {
  const file = await stat(filePath);
  if (!file.isFile() || file.size === 0) {
    throw new Error(`Expected non-empty site bundle: ${filePath}`);
  }
}

execFileSync(process.execPath, ['--check', jsPath], { stdio: 'inherit' });
console.log(
  JSON.stringify(
    {
      output_directory: outputDirectory,
      javascript_bytes: (await stat(jsPath)).size,
      stylesheet_bytes: (await stat(cssPath)).size,
      bundle_outputs: Object.keys(result.metafile.outputs).length,
      scenario_data_bytes: (
        await stat(resolve(outputDirectory, 'scenarios.json'))
      ).size,
      topology_only: false,
    },
    null,
    2,
  ),
);
