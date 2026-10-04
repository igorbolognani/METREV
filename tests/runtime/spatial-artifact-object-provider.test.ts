import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import {
  FilesystemSpatialArtifactProvider,
  spatialArtifactStoreConfigFromEnvironment,
} from '@metrev/spatial-artifact-store';

const sha256 = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');

describe('durable filesystem spatial artifact provider', () => {
  it('publishes concurrent chunked writes atomically and returns a bounded verified stream', async () => {
    const root = await mkdtemp(join(tmpdir(), 'metrev-object-provider-'));
    const bytes = Buffer.alloc(3 * 64 * 1024 + 17, 23);
    const digest = sha256(bytes);
    const provider = new FilesystemSpatialArtifactProvider({
      rootDirectory: root,
      maxObjectBytes: bytes.length,
      chunkBytes: 16 * 1024,
    });
    const input = {
      objectKey: `objects/${digest.slice(0, 2)}/${digest}.bin`,
      expectedSha256: digest,
      expectedBytes: bytes.length,
    };
    const source = () =>
      Readable.from([bytes.subarray(0, 100_000), bytes.subarray(100_000)]);
    try {
      await Promise.all([
        provider.writeVerified({ ...input, source: source() }),
        provider.writeVerified({ ...input, source: source() }),
      ]);
      const stream = await provider.readVerified(input);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      expect(Buffer.concat(chunks)).toEqual(bytes);
      expect(chunks.length).toBeGreaterThan(2);
      expect(chunks.every((chunk) => chunk.length <= 16 * 1024)).toBe(true);
      expect(await readdir(join(root, '.staging'))).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects truncation, overflow, digest mismatch and unsafe keys without publishing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'metrev-object-provider-'));
    const bytes = Buffer.from('bounded object bytes');
    const provider = new FilesystemSpatialArtifactProvider({
      rootDirectory: root,
      maxObjectBytes: bytes.length,
    });
    const declared = {
      objectKey: 'objects/fixture.bin',
      expectedSha256: sha256(bytes),
      expectedBytes: bytes.length,
    };
    try {
      await expect(
        provider.writeVerified({
          ...declared,
          source: Readable.from([bytes.subarray(0, bytes.length - 1)]),
        }),
      ).rejects.toMatchObject({ code: 'integrity_failure' });
      await expect(
        provider.writeVerified({
          ...declared,
          source: Readable.from([bytes, Buffer.from('x')]),
        }),
      ).rejects.toMatchObject({ code: 'size_limit' });
      await expect(
        provider.writeVerified({
          ...declared,
          expectedSha256: 'f'.repeat(64),
          source: Readable.from([bytes]),
        }),
      ).rejects.toMatchObject({ code: 'integrity_failure' });
      await expect(
        provider.writeVerified({
          ...declared,
          objectKey: '../escape.bin',
          source: Readable.from([bytes]),
        }),
      ).rejects.toMatchObject({ code: 'invalid_input' });
      expect(await readdir(join(root, '.staging'))).toEqual([]);
      await expect(provider.readVerified(declared)).rejects.toMatchObject({
        code: 'not_found',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('cleans stale partial writes within a bounded recovery scan and retains fresh entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'metrev-object-provider-'));
    const staging = join(root, '.staging');
    const provider = new FilesystemSpatialArtifactProvider({
      rootDirectory: root,
      stagingTtlMs: 1_000,
    });
    try {
      await provider.recoverIncompleteWrites();
      const stale = join(staging, 'stale.partial');
      const fresh = join(staging, 'fresh.partial');
      const unrelated = join(staging, 'retain.txt');
      await Promise.all([
        writeFile(stale, 'stale', { mode: 0o600 }),
        writeFile(fresh, 'fresh', { mode: 0o600 }),
        writeFile(unrelated, 'unrelated', { mode: 0o600 }),
      ]);
      await utimes(stale, new Date(1_000), new Date(1_000));
      const report = await provider.recoverIncompleteWrites({
        olderThanMs: 1_000,
        nowMs: 2_001,
        maxEntries: 3,
      });
      expect(report).toEqual({ inspected: 3, removed: 1, retained: 2 });
      expect((await readdir(staging)).sort()).toEqual([
        'fresh.partial',
        'retain.txt',
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('parses bounded provider settings without opening storage', () => {
    expect(spatialArtifactStoreConfigFromEnvironment({})).toEqual({
      maxObjectBytes: 268435456,
      chunkBytes: 65536,
      stagingTtlMs: 86400000,
    });
    expect(
      spatialArtifactStoreConfigFromEnvironment({
        METREV_SPATIAL_ARTIFACT_MAX_BYTES: '1048576',
        METREV_SPATIAL_ARTIFACT_CHUNK_BYTES: '8192',
        METREV_SPATIAL_ARTIFACT_STAGING_TTL_MS: '60000',
      }),
    ).toEqual({
      maxObjectBytes: 1048576,
      chunkBytes: 8192,
      stagingTtlMs: 60000,
    });
    expect(() =>
      spatialArtifactStoreConfigFromEnvironment({
        METREV_SPATIAL_ARTIFACT_CHUNK_BYTES: 'unbounded',
      }),
    ).toThrow();
  });
});
