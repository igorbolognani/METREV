# Quickstart - TRAMPOLINe-Aligned Metadata And Evidence Intelligence

## Import Curated TRAMPOLINe Map

```bash
pnpm --filter @metrev/database ingest:trampoline-seed
```

Use `--dryRun` to inspect the curated seed without writing to the database.

## Import Local PDFs

```bash
pnpm --filter @metrev/database ingest:local-pdf -- --files="/home/igor/Downloads/9781789063400.pdf,/home/igor/Downloads/9781789061154_0031.pdf"
```

The command stores source-document metadata, source artifact details, page text chunks, and short extracted claim candidates in the local database. It does not write raw PDFs or extracted full text into repository seed files.

## UI Flow

1. Start the local workspace.
2. Open `/research/reviews`.
3. Paste local PDF paths into the Local PDF import panel.
4. Import files, then create a review from the imported source records.
5. Run extraction and build an evidence pack.
6. Inspect `/evidence/explorer` for metadata quality and veracity signals.

## Validation Log

- `pnpm --filter @metrev/database prisma:generate` passed.
- `pnpm run test:fast` passed with localhost-binding permission for listener tests.
- `pnpm run test:advanced` passed with localhost-binding permission for worker health tests.
- `pnpm run lint` passed.
- `pnpm run build` passed.
- `pnpm --filter @metrev/database ingest:trampoline-seed -- --dryRun` passed and reported 8 entries, 16 claims, and 0 supplier documents.
- `pnpm run test:db` reached the configured Postgres endpoint with network permission, but failed because `SourceArtifactRecord` is not yet migrated in that database. Apply `20260430123000_add_source_artifact_records` before rerunning DB tests.
