import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { link, lstat, mkdir, open, readdir, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

import { SpatialArtifactStoreError } from './index';

const digestPattern = /^[a-f0-9]{64}$/;
const keySegmentPattern = /^[a-zA-Z0-9._-]{1,180}$/;

export interface VerifiedArtifactWrite {
  objectKey: string;
  expectedSha256: string;
  expectedBytes: number;
  source: AsyncIterable<Uint8Array>;
  signal?: AbortSignal;
}

export interface VerifiedArtifactRead {
  objectKey: string;
  expectedSha256: string;
  expectedBytes: number;
  signal?: AbortSignal;
}

export interface ArtifactRecoveryReport {
  inspected: number;
  removed: number;
  retained: number;
}

/**
 * Provider boundary for durable immutable spatial objects. Implementations must
 * verify bytes before publication and must never expose a partially written key.
 */
export interface DurableSpatialArtifactProvider {
  writeVerified(input: VerifiedArtifactWrite): Promise<void>;
  readVerified(input: VerifiedArtifactRead): Promise<Readable>;
  recoverIncompleteWrites(options?: {
    olderThanMs?: number;
    maxEntries?: number;
    nowMs?: number;
  }): Promise<ArtifactRecoveryReport>;
}

export interface FilesystemArtifactProviderOptions {
  rootDirectory: string;
  maxObjectBytes?: number;
  chunkBytes?: number;
  stagingTtlMs?: number;
}

/**
 * Durable filesystem implementation for mounted persistent volumes. A cloud
 * adapter can implement the same interface without changing worker contracts.
 */
export class FilesystemSpatialArtifactProvider implements DurableSpatialArtifactProvider {
  private readonly root: string;
  private readonly maxObjectBytes: number;
  private readonly chunkBytes: number;
  private readonly stagingTtlMs: number;

  constructor(options: FilesystemArtifactProviderOptions) {
    if (!options.rootDirectory.trim())
      throw new SpatialArtifactStoreError(
        'invalid_input',
        'A private artifact provider root is required',
      );
    this.root = resolve(options.rootDirectory);
    this.maxObjectBytes = options.maxObjectBytes ?? 256 * 1024 * 1024;
    this.chunkBytes = options.chunkBytes ?? 64 * 1024;
    this.stagingTtlMs = options.stagingTtlMs ?? 24 * 60 * 60 * 1000;
    for (const [label, value, minimum, maximum] of [
      ['maxObjectBytes', this.maxObjectBytes, 1, Number.MAX_SAFE_INTEGER],
      ['chunkBytes', this.chunkBytes, 4 * 1024, 4 * 1024 * 1024],
      ['stagingTtlMs', this.stagingTtlMs, 1_000, 30 * 24 * 60 * 60 * 1000],
    ] as const)
      if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
        throw new SpatialArtifactStoreError(
          'invalid_input',
          `Invalid ${label}`,
        );
  }

  async writeVerified(input: VerifiedArtifactWrite): Promise<void> {
    this.validateExpected(input);
    input.signal?.throwIfAborted();
    const destination = await this.destination(input.objectKey);
    const staging = await this.privateDirectory('.staging');
    const temporary = join(staging, `${randomUUID()}.partial`);
    const output = await open(
      temporary,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    const hash = createHash('sha256');
    let written = 0;
    try {
      for await (const value of input.source) {
        input.signal?.throwIfAborted();
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
        if (!chunk.byteLength) continue;
        written += chunk.byteLength;
        if (written > input.expectedBytes || written > this.maxObjectBytes)
          throw new SpatialArtifactStoreError(
            'size_limit',
            'Artifact stream exceeds its declared or configured size',
          );
        hash.update(chunk);
        let offset = 0;
        while (offset < chunk.byteLength) {
          const result = await output.write(
            chunk,
            offset,
            Math.min(this.chunkBytes, chunk.byteLength - offset),
          );
          if (!result.bytesWritten)
            throw new SpatialArtifactStoreError(
              'integrity_failure',
              'Artifact write made no progress',
            );
          offset += result.bytesWritten;
        }
      }
      if (
        written !== input.expectedBytes ||
        hash.digest('hex') !== input.expectedSha256
      )
        throw new SpatialArtifactStoreError(
          'integrity_failure',
          'Artifact stream differs from its declared reference',
        );
      await output.sync();
      await output.close();
      try {
        await link(temporary, destination);
        await this.syncDirectory(resolve(destination, '..'));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        await this.verifyExisting(destination, input);
      }
    } finally {
      await output.close().catch(() => undefined);
      await rm(temporary, { force: true }).catch(() => undefined);
    }
  }

  async writeVerifiedFile(
    input: Omit<VerifiedArtifactWrite, 'source'> & {
      sourceFilePath: string;
    },
  ): Promise<void> {
    const source = await open(
      input.sourceFilePath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    ).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT')
        throw new SpatialArtifactStoreError(
          'not_found',
          'Artifact source was not found',
        );
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Artifact source must be a regular file',
      );
    });
    try {
      const stat = await source.stat();
      if (!stat.isFile() || stat.size !== input.expectedBytes)
        throw new SpatialArtifactStoreError(
          'integrity_failure',
          'Artifact source size differs from its declared reference',
        );
      await this.writeVerified({
        ...input,
        source: source.createReadStream({
          autoClose: false,
          highWaterMark: this.chunkBytes,
        }),
      });
    } finally {
      await source.close().catch(() => undefined);
    }
  }

  async readVerified(input: VerifiedArtifactRead): Promise<Readable> {
    this.validateExpected(input);
    input.signal?.throwIfAborted();
    const destination = await this.destination(input.objectKey, false);
    const file = await open(
      destination,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    ).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT')
        throw new SpatialArtifactStoreError(
          'not_found',
          'Artifact object was not found',
        );
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Artifact object must be a regular file',
      );
    });
    try {
      await this.verifyHandle(file, input);
      input.signal?.throwIfAborted();
      return file.createReadStream({
        autoClose: true,
        highWaterMark: this.chunkBytes,
        signal: input.signal,
      });
    } catch (error) {
      await file.close().catch(() => undefined);
      throw error;
    }
  }

  async recoverIncompleteWrites(
    options: {
      olderThanMs?: number;
      maxEntries?: number;
      nowMs?: number;
    } = {},
  ): Promise<ArtifactRecoveryReport> {
    const olderThanMs = options.olderThanMs ?? this.stagingTtlMs;
    const maxEntries = options.maxEntries ?? 1_000;
    const nowMs = options.nowMs ?? Date.now();
    if (
      !Number.isSafeInteger(olderThanMs) ||
      olderThanMs < 0 ||
      !Number.isSafeInteger(maxEntries) ||
      maxEntries < 1 ||
      maxEntries > 10_000 ||
      !Number.isFinite(nowMs)
    )
      throw new SpatialArtifactStoreError(
        'invalid_input',
        'Invalid artifact recovery limits',
      );
    const staging = await this.privateDirectory('.staging');
    const entries = (await readdir(staging, { withFileTypes: true })).slice(
      0,
      maxEntries,
    );
    const report: ArtifactRecoveryReport = {
      inspected: entries.length,
      removed: 0,
      retained: 0,
    };
    for (const entry of entries) {
      const path = join(staging, entry.name);
      const stat = await lstat(path);
      const stale =
        entry.name.endsWith('.partial') && nowMs - stat.mtimeMs >= olderThanMs;
      if (stale && (stat.isFile() || stat.isSymbolicLink())) {
        await rm(path, { force: true });
        report.removed += 1;
      } else report.retained += 1;
    }
    return report;
  }

  private validateExpected(input: {
    objectKey: string;
    expectedSha256: string;
    expectedBytes: number;
  }): void {
    this.keySegments(input.objectKey);
    if (!digestPattern.test(input.expectedSha256))
      throw new SpatialArtifactStoreError('invalid_input', 'Invalid SHA-256');
    if (
      !Number.isSafeInteger(input.expectedBytes) ||
      input.expectedBytes < 1 ||
      input.expectedBytes > this.maxObjectBytes
    )
      throw new SpatialArtifactStoreError(
        'size_limit',
        'Invalid or oversized artifact byte count',
      );
  }

  private keySegments(key: string): string[] {
    const segments = key.split('/');
    if (
      !segments.length ||
      segments.length > 12 ||
      segments.some(
        (segment) =>
          !keySegmentPattern.test(segment) ||
          segment === '.' ||
          segment === '..',
      )
    )
      throw new SpatialArtifactStoreError(
        'invalid_input',
        'Invalid artifact object key',
      );
    return segments;
  }

  private async destination(key: string, create = true): Promise<string> {
    const segments = this.keySegments(key);
    const file = segments.pop()!;
    const directory = create
      ? await this.privateDirectory(...segments)
      : await this.checkedDirectory(...segments);
    const destination = resolve(directory, file);
    if (!destination.startsWith(`${this.root}${sep}`))
      throw new SpatialArtifactStoreError(
        'invalid_input',
        'Artifact key escapes the provider root',
      );
    return destination;
  }

  private async privateDirectory(...segments: string[]): Promise<string> {
    let path = this.root;
    await mkdir(path, { recursive: true, mode: 0o700 });
    await this.assertPrivateDirectory(path);
    for (const segment of segments) {
      path = join(path, segment);
      await mkdir(path, { mode: 0o700 }).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code !== 'EEXIST') throw error;
        },
      );
      await this.assertPrivateDirectory(path);
    }
    return path;
  }

  private async checkedDirectory(...segments: string[]): Promise<string> {
    let path = this.root;
    await this.assertPrivateDirectory(path).catch(() => {
      throw new SpatialArtifactStoreError(
        'not_found',
        'Artifact object not found',
      );
    });
    for (const segment of segments) {
      path = join(path, segment);
      await this.assertPrivateDirectory(path).catch(() => {
        throw new SpatialArtifactStoreError(
          'not_found',
          'Artifact object not found',
        );
      });
    }
    return path;
  }

  private async assertPrivateDirectory(path: string): Promise<void> {
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.mode & 0o077)
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Artifact provider directories must be private',
      );
  }

  private async verifyExisting(
    path: string,
    input: Pick<
      VerifiedArtifactWrite,
      'expectedBytes' | 'expectedSha256' | 'signal'
    >,
  ): Promise<void> {
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      await this.verifyHandle(file, input);
    } finally {
      await file.close().catch(() => undefined);
    }
  }

  private async verifyHandle(
    file: Awaited<ReturnType<typeof open>>,
    input: Pick<
      VerifiedArtifactRead,
      'expectedBytes' | 'expectedSha256' | 'signal'
    >,
  ): Promise<void> {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size !== input.expectedBytes)
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Stored artifact size differs from its manifest',
      );
    const hash = createHash('sha256');
    const buffer = Buffer.allocUnsafe(this.chunkBytes);
    let position = 0;
    while (position < input.expectedBytes) {
      input.signal?.throwIfAborted();
      const { bytesRead } = await file.read(
        buffer,
        0,
        Math.min(buffer.length, input.expectedBytes - position),
        position,
      );
      if (!bytesRead)
        throw new SpatialArtifactStoreError(
          'integrity_failure',
          'Stored artifact was truncated during verification',
        );
      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    if (hash.digest('hex') !== input.expectedSha256)
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Stored artifact failed digest verification',
      );
  }

  private async syncDirectory(path: string): Promise<void> {
    const directory = await open(path, constants.O_RDONLY);
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  }
}
