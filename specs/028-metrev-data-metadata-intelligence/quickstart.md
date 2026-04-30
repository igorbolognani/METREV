# Quickstart — METREV Data Metadata Intelligence

## Goals

- verify that METREV no longer ships the old external-program-labeled flow
- verify that local-source ingestion and research extraction still expose metadata quality, veracity, and readiness signals

## Preconditions

- repository dependencies are installed
- local validation tools such as `pdftotext` are available if temporary PDF extraction is being rerun

## Setup

1. Inspect the `028` feature pack and the updated domain and contract owner files.
2. Confirm the old `022` feature pack and old seed artifacts are absent.
3. If local PDFs are available, run temporary extraction outside source control only.

## Happy path

1. Import one or more local PDFs through the existing local-source flow.
2. Create or inspect a research review that includes the new metadata/data readiness slice.
3. Build an evidence pack and confirm metadata quality, veracity, missing fields, and evidence traces remain visible.

## Failure path

1. Reintroduce an old external-program token or article-default filename in an active source file.
2. Re-run the focused regression test.
3. Confirm the regression fails before the label can silently re-enter the repository.

## Edge case

1. Import a context-heavy metadata reference PDF with weak performance metrics.
2. Build the evidence pack and decision-ingestion preview.
3. Confirm the source can inform metadata/data readiness while still carrying a generic context-not-performance penalty.

## Verification commands and checks

- `pnpm exec vitest run tests/runtime/source-artifacts.test.ts`
- `pnpm exec vitest run tests/runtime/research-intelligence.test.ts`
- `pnpm exec vitest run tests/runtime/research-runtime-extractor.test.ts`
- `pnpm exec vitest run tests/runtime/domain-contracts.test.ts`
- `pnpm exec vitest run tests/runtime/research-api.test.ts`
- `pnpm exec vitest run tests/runtime/metrev-data-metadata-cleanup.test.ts`
- `pnpm run test:python`
- `pnpm run lint`
- `pnpm run build`
- `pnpm run validate:fast`

## Validation Log

- `pnpm exec vitest run tests/runtime/source-artifacts.test.ts tests/runtime/research-intelligence.test.ts tests/runtime/research-runtime-extractor.test.ts tests/runtime/domain-contracts.test.ts tests/runtime/metrev-data-metadata-cleanup.test.ts` passed.
- `pnpm exec vitest run tests/runtime/research-api.test.ts` passed after ensuring data/metadata readiness results always carry evidence traces.
- `pnpm run test:python` passed with 11 contract checks.
- `pnpm run lint` passed across 13 packages.
- `pnpm run build` passed across 13 packages.
- `pnpm run validate:fast` passed with 45 Vitest files, 149 tests, 11 Python contract checks, and the full build matrix.
