#!/usr/bin/env node
/**
 * Spec 037 / Phase 8 — pdf-inspect CLI scaffold.
 *
 * Inspects a local PDF/HTML file and emits a JSON describing the document
 * intelligence signal that would be produced. v1 routes through the
 * `@metrev/document-intelligence` scaffold (paragraph-only); pdfjs-dist /
 * unpdf integration lands in Phase 5 / T5.2.
 *
 * Exit codes: 0=PASS, 1=FAIL, 2=WARN (no file).
 *
 * Usage:
 *   pnpm run pdf:inspect -- --file=./path/to/doc.pdf
 *   pnpm run pdf:inspect -- --dry-run --json
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const argSet = new Set(args);
const dryRun = argSet.has('--dry-run');
const asJson = argSet.has('--json');
const fileArg = args
  .find((a) => a.startsWith('--file='))
  ?.split('=')
  .slice(1)
  .join('=');

if (dryRun) {
  const summary = {
    tool: 'pdf-inspect',
    version: 'pdf-inspect-v1',
    mode: 'dry-run',
    status: 'scaffold',
    generated_at: new Date().toISOString(),
    notes:
      'Dry-run scaffold. Real PDF parsing lands when ADR 0006 selects pdfjs-dist / unpdf.',
  };
  console.log(asJson ? JSON.stringify(summary) : `[pdf:inspect] scaffold ok`);
  process.exit(0);
}

if (!fileArg) {
  console.error('[pdf:inspect] WARN missing --file=<path>');
  process.exit(2);
}

const filePath = resolve(process.cwd(), fileArg);
if (!existsSync(filePath)) {
  console.error(`[pdf:inspect] WARN file not found: ${filePath}`);
  process.exit(2);
}

try {
  const buffer = readFileSync(filePath);
  const { runDocumentIntelligence } =
    await import('../packages/document-intelligence/src/index.ts');
  const result = runDocumentIntelligence(
    {
      sourceDocumentId: filePath,
      mediaType: filePath.endsWith('.html')
        ? 'text/html'
        : filePath.endsWith('.xml')
          ? 'application/xml'
          : filePath.endsWith('.pdf')
            ? 'application/pdf'
            : 'text/plain',
      rawText: buffer.toString('utf-8'),
    },
    { env: { ...process.env, METREV_DOCINTEL_ENABLED: '1' } },
  );
  const out = {
    tool: 'pdf-inspect',
    version: 'pdf-inspect-v1',
    mode: 'live',
    file: filePath,
    bytes: buffer.length,
    document_intelligence: result,
  };
  console.log(
    asJson
      ? JSON.stringify(out)
      : `[pdf:inspect] ${result.status} blocks=${result.blocks.length}`,
  );
  process.exit(0);
} catch (err) {
  console.error('[pdf:inspect] FAIL:', err.message);
  process.exit(1);
}
