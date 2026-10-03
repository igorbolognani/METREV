import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { z } from 'zod';

const boundedInteger = (fallback: number, min: number, max: number) =>
  z.preprocess(
    (value) =>
      value === undefined
        ? fallback
        : typeof value === 'string' && /^\d+$/.test(value)
          ? Number(value)
          : value,
    z.number().int().min(min).max(max),
  );
const policySchema = z
  .object({
    maxArtifactBytes: boundedInteger(256 * 1024 * 1024, 1, 1024 * 1024 * 1024),
    timeoutMs: boundedInteger(120_000, 10, 300_000),
    maxConcurrentDownloads: boundedInteger(2, 1, 16),
  })
  .strict();
export type SpatialArtifactDownloadPolicy = z.infer<typeof policySchema>;

export function spatialArtifactDownloadPolicyFromEnvironment(
  environment: NodeJS.ProcessEnv,
) {
  return policySchema.parse({
    maxArtifactBytes: environment.METREV_SPATIAL_API_MAX_ARTIFACT_BYTES,
    timeoutMs: environment.METREV_SPATIAL_API_ARTIFACT_TIMEOUT_MS,
    maxConcurrentDownloads:
      environment.METREV_SPATIAL_API_MAX_ARTIFACT_DOWNLOADS,
  });
}

export class SpatialArtifactDownloadError extends Error {
  constructor(
    readonly code:
      | 'artifact_integrity_failure'
      | 'artifact_size_limit'
      | 'artifact_read_timeout'
      | 'artifact_download_busy'
      | 'artifact_read_cancelled',
  ) {
    super(code);
    this.name = 'SpatialArtifactDownloadError';
  }
}

/** Bounds staging disk, provider wait and concurrent downloads across one API process. */
export class SpatialArtifactDownloadController {
  readonly policy: SpatialArtifactDownloadPolicy;
  private active = 0;
  constructor(policy: Partial<SpatialArtifactDownloadPolicy> = {}) {
    this.policy = policySchema.parse(policy);
  }
  acquire(bytes: number): () => void {
    if (!Number.isSafeInteger(bytes) || bytes < 1)
      throw new SpatialArtifactDownloadError('artifact_integrity_failure');
    if (bytes > this.policy.maxArtifactBytes)
      throw new SpatialArtifactDownloadError('artifact_size_limit');
    if (this.active >= this.policy.maxConcurrentDownloads)
      throw new SpatialArtifactDownloadError('artifact_download_busy');
    this.active++;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.active--;
      }
    };
  }
}

export interface VerifiedSpatialArtifactRead {
  controller: SpatialArtifactDownloadController;
  sha256: string;
  bytes: number;
  source: (signal: AbortSignal) => Promise<Readable>;
  signal?: AbortSignal;
}

/** No artifact bytes reach the client before their full hash/length is verified. */
export async function stageVerifiedSpatialArtifact(
  input: VerifiedSpatialArtifactRead,
): Promise<{
  path: string;
  cleanup(): Promise<void>;
}> {
  const release = input.controller.acquire(input.bytes);
  const abort = new AbortController();
  const cancel = () =>
    abort.abort(new SpatialArtifactDownloadError('artifact_read_cancelled'));
  input.signal?.addEventListener('abort', cancel, { once: true });
  if (input.signal?.aborted) cancel();
  const timeout = setTimeout(
    () =>
      abort.abort(new SpatialArtifactDownloadError('artifact_read_timeout')),
    input.controller.policy.timeoutMs,
  );
  let directory: string | undefined;
  let source: Readable | undefined;
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    try {
      if (directory) await rm(directory, { recursive: true, force: true });
    } finally {
      release();
    }
  };
  try {
    abort.signal.throwIfAborted();
    // Providers can fail to honor cancellation; late-resolving streams are
    // destroyed and the control plane still returns within its deadline.
    const pending = input.source(abort.signal).then((stream) => {
      if (abort.signal.aborted) {
        stream.destroy();
        throw abort.signal.reason;
      }
      source = stream;
      return stream;
    });
    const cancelled = new Promise<never>((_resolve, reject) => {
      const onAbort = () => reject(abort.signal.reason);
      if (abort.signal.aborted) onAbort();
      else abort.signal.addEventListener('abort', onAbort, { once: true });
    });
    await Promise.race([pending, cancelled]);
    abort.signal.throwIfAborted();
    directory = await mkdtemp(join(tmpdir(), 'metrev-spatial-field-'));
    const path = join(directory, 'field.bin');
    const hash = createHash('sha256');
    let count = 0;
    const verifier = new Transform({
      transform(part: Buffer | Uint8Array, _encoding, callback) {
        const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
        count += chunk.byteLength;
        if (count > input.bytes)
          return callback(
            new SpatialArtifactDownloadError('artifact_integrity_failure'),
          );
        hash.update(chunk);
        callback(null, chunk);
      },
      flush(callback) {
        if (count !== input.bytes || hash.digest('hex') !== input.sha256)
          return callback(
            new SpatialArtifactDownloadError('artifact_integrity_failure'),
          );
        callback();
      },
    });
    await pipeline(
      source!,
      verifier,
      createWriteStream(path, { flags: 'wx', mode: 0o600 }),
      { signal: abort.signal },
    );
    return { path, cleanup };
  } catch (error) {
    source?.destroy();
    await cleanup();
    if (abort.signal.aborted) throw abort.signal.reason;
    throw error;
  } finally {
    clearTimeout(timeout);
    input.signal?.removeEventListener('abort', cancel);
  }
}

/** Only small reduction/view payloads may enter memory; large fields stay streamed. */
export async function readVerifiedSpatialArtifactBuffer(
  input: VerifiedSpatialArtifactRead & { maxBytes: number },
): Promise<Buffer> {
  if (
    !Number.isSafeInteger(input.maxBytes) ||
    input.maxBytes < 1 ||
    input.bytes > input.maxBytes
  )
    throw new SpatialArtifactDownloadError('artifact_size_limit');
  const staged = await stageVerifiedSpatialArtifact(input);
  try {
    return await readFile(staged.path);
  } finally {
    await staged.cleanup();
  }
}
