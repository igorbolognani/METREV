#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as nodeHttp from 'node:http';

import {
  buildDoctorReport,
  exitCodeFor,
  writeCliReport,
} from './lib/research-diagnostics.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = {
  full: process.argv.includes('--full'),
  databaseReadonly: process.argv.includes('--database-readonly'),
  json: process.argv.includes('--json'),
  probeProviders: process.argv.includes('--probe-providers'),
};
const environmentProxyConfigured = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'http_proxy',
  'https_proxy',
].some((name) => process.env[name]?.trim());
if (
  options.probeProviders &&
  environmentProxyConfigured &&
  typeof nodeHttp.setGlobalProxyFromEnv === 'function'
) {
  nodeHttp.setGlobalProxyFromEnv();
}
const report = await buildDoctorReport(repoRoot, options);
writeCliReport(report, options);
process.exitCode = exitCodeFor(report);
