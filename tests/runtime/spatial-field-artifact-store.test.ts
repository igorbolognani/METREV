import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { LocalSpatialFieldArtifactStore } from '@metrev/spatial-artifact-store';

import { validSpatialSimulationResult } from '../fixtures/spatial-simulation-result';
import { createSpatialSimulationRunInput } from '../fixtures/spatial-simulation-run';

const hash = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');

describe('local spatial field artifacts', () => {
  it('binds immutable field bytes to owner, run, field and dataset path and detects tampering', async () => {
    const root = await mkdtemp(join(tmpdir(), 'metrev-field-store-'));
    const bytes = Buffer.from('synthetic field bytes');
    const sha256 = hash(bytes);
    const sourceFilePath = join(root, 'source.vtu');
    const store = new LocalSpatialFieldArtifactStore({
      rootDirectory: join(root, 'private'),
    });
    const runId = 'run-123';
    const ownerId = 'owner-123';
    const run = {
      ...createSpatialSimulationRunInput({
        ownerId,
        idempotencyKey: 'field-test',
      }),
      id: runId,
      status: 'completed',
    } as never;
    const field = validSpatialSimulationResult(run).fields[0];
    field.artifact = {
      ...field.artifact,
      sha256,
      uri: `metrev-artifact://sha256/${sha256}`,
      bytes: bytes.length,
    };
    const lookup = {
      ownerId,
      runId,
      fieldId: field.field_id,
      uri: field.artifact.uri,
      datasetPath: field.artifact.dataset_path,
    };
    try {
      await writeFile(sourceFilePath, bytes);
      const manifest = await store.storeField({
        ownerId,
        runId,
        field,
        sourceFilePath,
      });
      expect(manifest.artifact.sha256).toBe(sha256);
      await store.storeField({ ownerId, runId, field, sourceFilePath });
      const stream = await store.readField(lookup);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      expect(Buffer.concat(chunks)).toEqual(bytes);
      for (const mismatch of [
        { ownerId: 'other-owner' },
        { runId: 'other-run' },
        { fieldId: 'other-field' },
        { datasetPath: '/other' },
        { uri: `metrev-artifact://sha256/${'f'.repeat(64)}` },
      ])
        await expect(
          store.readField({ ...lookup, ...mismatch }),
        ).rejects.toBeDefined();

      const objectPath = join(
        root,
        'private',
        'field-objects',
        sha256.slice(0, 2),
        `${sha256}.bin`,
      );
      const altered = Buffer.from(await readFile(objectPath));
      altered[0] ^= 1;
      await writeFile(objectPath, altered);
      await expect(store.readField(lookup)).rejects.toMatchObject({
        code: 'integrity_failure',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects wrong bytes, oversized fields and symlink sources without publishing a manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'metrev-field-store-'));
    const bytes = Buffer.from('field bytes');
    const sourceFilePath = join(root, 'field.vtu');
    const link = join(root, 'field-link.vtu');
    const ownerId = 'owner-123';
    const runId = 'run-456';
    const run = {
      ...createSpatialSimulationRunInput({
        ownerId,
        idempotencyKey: 'field-test-2',
      }),
      id: runId,
    } as never;
    const field = validSpatialSimulationResult(run).fields[0];
    field.artifact = {
      ...field.artifact,
      sha256: hash(bytes),
      uri: `metrev-artifact://sha256/${hash(bytes)}`,
      bytes: bytes.length,
    };
    try {
      await writeFile(sourceFilePath, bytes);
      await symlink(sourceFilePath, link);
      const store = new LocalSpatialFieldArtifactStore({
        rootDirectory: join(root, 'private'),
      });
      await expect(
        store.storeField({ ownerId, runId, field, sourceFilePath: link }),
      ).rejects.toMatchObject({ code: 'integrity_failure' });
      await writeFile(sourceFilePath, Buffer.from('different'));
      await expect(
        store.storeField({ ownerId, runId, field, sourceFilePath }),
      ).rejects.toMatchObject({ code: 'integrity_failure' });
      const limited = new LocalSpatialFieldArtifactStore({
        rootDirectory: join(root, 'private'),
        maxFieldBytes: bytes.length - 1,
      });
      await expect(
        limited.storeField({ ownerId, runId, field, sourceFilePath }),
      ).rejects.toMatchObject({ code: 'size_limit' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
