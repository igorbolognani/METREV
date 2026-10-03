import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  SpatialArtifactDownloadController,
  readVerifiedSpatialArtifactBuffer,
  spatialArtifactDownloadPolicyFromEnvironment,
  stageVerifiedSpatialArtifact,
} from '../../apps/api-server/src/services/spatial-artifact-download';

const bytes = Buffer.from('verified artifact fixture');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const fixture = (controller: SpatialArtifactDownloadController) => ({
  controller,
  bytes: bytes.length,
  sha256,
  source: async () => Readable.from([bytes]),
});

describe('bounded spatial artifact access', () => {
  it('rejects invalid operational settings before acquiring a provider', () => {
    expect(spatialArtifactDownloadPolicyFromEnvironment({})).toEqual({
      maxArtifactBytes: 268435456,
      timeoutMs: 120000,
      maxConcurrentDownloads: 2,
    });
    for (const value of ['0', '17', '1.5', ' 2', 'junk'])
      expect(() =>
        spatialArtifactDownloadPolicyFromEnvironment({
          METREV_SPATIAL_API_MAX_ARTIFACT_DOWNLOADS: value,
        }),
      ).toThrow();
  });

  it('bounds disk leases across staging and delivery, cleans up and permits the next read', async () => {
    const controller = new SpatialArtifactDownloadController({
      maxConcurrentDownloads: 1,
    });
    const staged = await stageVerifiedSpatialArtifact(fixture(controller));
    expect(await readFile(staged.path)).toEqual(bytes);
    const source = vi.fn(async () => Readable.from([bytes]));
    await expect(
      stageVerifiedSpatialArtifact({ ...fixture(controller), source }),
    ).rejects.toMatchObject({ code: 'artifact_download_busy' });
    expect(source).not.toHaveBeenCalled();
    await staged.cleanup();
    await staged.cleanup();
    await expect(access(staged.path)).rejects.toThrow();
    expect(
      await readVerifiedSpatialArtifactBuffer({
        ...fixture(controller),
        maxBytes: 1024,
      }),
    ).toEqual(bytes);
  });

  it('enforces manifest and in-memory ceilings before reading the provider', async () => {
    const controller = new SpatialArtifactDownloadController({
      maxArtifactBytes: bytes.length - 1,
    });
    const source = vi.fn(async () => Readable.from([bytes]));
    await expect(
      stageVerifiedSpatialArtifact({ ...fixture(controller), source }),
    ).rejects.toMatchObject({ code: 'artifact_size_limit' });
    await expect(
      readVerifiedSpatialArtifactBuffer({
        ...fixture(new SpatialArtifactDownloadController()),
        source,
        maxBytes: bytes.length - 1,
      }),
    ).rejects.toMatchObject({ code: 'artifact_size_limit' });
    expect(source).not.toHaveBeenCalled();
  });

  it('bounds providers that never resolve and destroys late streams', async () => {
    const controller = new SpatialArtifactDownloadController({
      timeoutMs: 15,
      maxConcurrentDownloads: 1,
    });
    let resolveProvider!: (stream: Readable) => void;
    await expect(
      stageVerifiedSpatialArtifact({
        ...fixture(controller),
        source: () =>
          new Promise<Readable>((resolve) => {
            resolveProvider = resolve;
          }),
      }),
    ).rejects.toMatchObject({ code: 'artifact_read_timeout' });
    const late = Readable.from([bytes]);
    resolveProvider(late);
    await Promise.resolve();
    expect(late.destroyed).toBe(true);
    const release = controller.acquire(bytes.length);
    release();
  });

  it('terminates stalled streams and rejects truncated, expanded and altered bytes', async () => {
    const controller = new SpatialArtifactDownloadController({ timeoutMs: 15 });
    const stalled = new Readable({ read() {} });
    await expect(
      stageVerifiedSpatialArtifact({
        ...fixture(controller),
        source: async () => stalled,
      }),
    ).rejects.toMatchObject({ code: 'artifact_read_timeout' });
    expect(stalled.destroyed).toBe(true);
    const integrityController = new SpatialArtifactDownloadController();
    for (const altered of [
      bytes.subarray(0, bytes.length - 1),
      Buffer.concat([bytes, bytes]),
      Buffer.alloc(bytes.length),
    ])
      await expect(
        stageVerifiedSpatialArtifact({
          ...fixture(integrityController),
          source: async () => Readable.from([altered]),
        }),
      ).rejects.toMatchObject({ code: 'artifact_integrity_failure' });
  });
});
