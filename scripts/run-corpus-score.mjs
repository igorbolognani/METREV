#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCorpusScore,
  exitCodeFor,
  writeCliReport,
} from './lib/research-diagnostics.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const report = buildCorpusScore(repoRoot);
writeCliReport(report, { json: process.argv.includes('--json') });
process.exitCode = exitCodeFor(report);
