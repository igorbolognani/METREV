import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { link, lstat, mkdir, open, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';

import {
  spatialFieldManifestSchema,
  spatialFieldArtifactSchema,
  type SpatialSimulationResult,
} from '@metrev/domain-contracts';

import { SpatialArtifactStoreError } from './index';
import {
  FilesystemSpatialArtifactProvider,
  type ArtifactRecoveryReport,
} from './object-provider';
import { z } from 'zod';

const digestPattern = /^[a-f0-9]{64}$/;
const identifierPattern = /^[a-zA-Z0-9_-]{1,160}$/;
const fieldIdSchema = z.string().trim().min(1).max(160);

type Field = SpatialSimulationResult['fields'][number];
const fieldManifestSchema = z
  .object({
    version: z.literal('spatial-field-artifact-v1'),
    owner_sha256: z.string().regex(digestPattern),
    run_id: z.string().regex(identifierPattern),
    field_id: fieldIdSchema,
    artifact: spatialFieldArtifactSchema,
    manifest_sha256: z.string().regex(digestPattern),
  })
  .strict();
type FieldManifest = z.infer<typeof fieldManifestSchema>;

function digest(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function identity(value: string, label: string): string {
  if (!identifierPattern.test(value))
    throw new SpatialArtifactStoreError('invalid_input', `Invalid ${label}`);
  return value;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

/** Development-only local field provider. The product deploy needs durable object storage. */
export class LocalSpatialFieldArtifactStore {
  private readonly root: string;
  private readonly maxFieldBytes: number;
  private readonly objects: FilesystemSpatialArtifactProvider;
  private initialRecovery?: Promise<ArtifactRecoveryReport>;

  constructor(options: {
    rootDirectory: string;
    maxFieldBytes?: number;
    chunkBytes?: number;
    stagingTtlMs?: number;
  }) {
    if (!options.rootDirectory.trim())
      throw new SpatialArtifactStoreError(
        'invalid_input',
        'A private artifact root is required',
      );
    this.root = resolve(options.rootDirectory);
    this.maxFieldBytes = options.maxFieldBytes ?? 256 * 1024 * 1024;
    if (!Number.isSafeInteger(this.maxFieldBytes) || this.maxFieldBytes <= 0)
      throw new SpatialArtifactStoreError(
        'invalid_input',
        'Invalid field size limit',
      );
    this.objects = new FilesystemSpatialArtifactProvider({
      rootDirectory: this.root,
      maxObjectBytes: this.maxFieldBytes,
      ...(options.chunkBytes === undefined
        ? {}
        : { chunkBytes: options.chunkBytes }),
      ...(options.stagingTtlMs === undefined
        ? {}
        : { stagingTtlMs: options.stagingTtlMs }),
    });
  }

  private async directory(...segments: string[]): Promise<string> {
    let path = this.root;
    await mkdir(path, { recursive: true, mode: 0o700 });
    for (const segment of ['', ...segments]) {
      if (segment) {
        path = join(path, segment);
        await mkdir(path, { mode: 0o700 }).catch(
          (error: NodeJS.ErrnoException) => {
            if (error.code !== 'EEXIST') throw error;
          },
        );
      }
      const stat = await lstat(path);
      if (!stat.isDirectory() || stat.isSymbolicLink() || stat.mode & 0o077)
        throw new SpatialArtifactStoreError(
          'integrity_failure',
          'Artifact directories must be private',
        );
    }
    return path;
  }

  private owner(ownerId: string): string {
    if (!ownerId.trim() || ownerId.length > 256)
      throw new SpatialArtifactStoreError(
        'invalid_input',
        'Owner ID is required',
      );
    return digest(`metrev-owner-v1:${ownerId.trim()}`);
  }

  private async bytes(
    path: string,
    limit = this.maxFieldBytes,
  ): Promise<Buffer> {
    const file = await open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    ).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT')
        throw new SpatialArtifactStoreError(
          'not_found',
          'Field artifact not found',
        );
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Field artifact is not a regular file',
      );
    });
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size < 1 || stat.size > limit)
        throw new SpatialArtifactStoreError(
          'integrity_failure',
          'Invalid field artifact size or type',
        );
      return await file.readFile();
    } finally {
      await file.close();
    }
  }

  private manifestPath(
    ownerSha: string,
    runId: string,
    fieldId: string,
  ): string {
    return join(
      this.root,
      'field-owners',
      ownerSha.slice(0, 2),
      ownerSha,
      runId,
      `${digest(`metrev-field-id-v1:${fieldId}`)}.json`,
    );
  }

  async storeField(input: {
    sourceFilePath: string;
    ownerId: string;
    runId: string;
    field: Field;
    signal?: AbortSignal;
  }): Promise<FieldManifest> {
    const field = spatialFieldManifestSchema.parse(input.field);
    return this.storeArtifact({
      sourceFilePath: input.sourceFilePath,
      ownerId: input.ownerId,
      runId: input.runId,
      fieldId: field.field_id,
      artifact: field.artifact,
      signal: input.signal,
    });
  }

  /** Mesh and diagnostic objects share the same immutable owner/run-bound storage. */
  async storeArtifact(input: {
    sourceFilePath: string;
    ownerId: string;
    runId: string;
    fieldId: string;
    artifact: z.infer<typeof spatialFieldArtifactSchema>;
    signal?: AbortSignal;
  }): Promise<FieldManifest> {
    await this.recoverOnFirstUse();
    const ownerSha = this.owner(input.ownerId);
    const runId = identity(input.runId, 'run ID');
    const field = {
      artifact: spatialFieldArtifactSchema.parse(input.artifact),
    };
    const fieldId = fieldIdSchema.parse(input.fieldId);
    if (field.artifact.bytes > this.maxFieldBytes)
      throw new SpatialArtifactStoreError(
        'size_limit',
        'Field exceeds configured size limit',
      );
    await this.directory('field-owners', ownerSha.slice(0, 2), ownerSha, runId);
    const manifestPath = this.manifestPath(ownerSha, runId, fieldId);
    const content = {
      version: 'spatial-field-artifact-v1' as const,
      owner_sha256: ownerSha,
      run_id: runId,
      field_id: fieldId,
      artifact: field.artifact,
    };
    const manifest = {
      ...content,
      manifest_sha256: digest(canonical(content)),
    };
    await this.objects.writeVerifiedFile({
      sourceFilePath: input.sourceFilePath,
      objectKey: this.objectKey(field.artifact.sha256),
      expectedSha256: field.artifact.sha256,
      expectedBytes: field.artifact.bytes,
      signal: input.signal,
    });
    await this.immutable(manifestPath, Buffer.from(`${canonical(manifest)}\n`));
    const stored = await this.loadManifest(manifestPath);
    if (canonical(stored) !== canonical(manifest))
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Field identity already has a different immutable manifest',
      );
    return stored;
  }

  /** Matches the API SpatialFieldArtifactReader shape; the API independently verifies streamed bytes. */
  async readField(input: {
    ownerId: string;
    runId: string;
    fieldId: string;
    uri: string;
    datasetPath: string;
    signal?: AbortSignal;
  }): Promise<Readable> {
    input.signal?.throwIfAborted();
    await this.recoverOnFirstUse();
    const ownerSha = this.owner(input.ownerId);
    const runId = identity(input.runId, 'run ID');
    const fieldId = fieldIdSchema.parse(input.fieldId);
    const manifest = await this.loadManifest(
      this.manifestPath(ownerSha, runId, fieldId),
    );
    if (
      manifest.owner_sha256 !== ownerSha ||
      manifest.run_id !== runId ||
      manifest.field_id !== fieldId ||
      manifest.artifact.uri !== input.uri ||
      manifest.artifact.dataset_path !== input.datasetPath
    )
      throw new SpatialArtifactStoreError(
        'access_denied',
        'Field is not authorized for this run',
      );
    const artifact = manifest.artifact;
    return this.objects.readVerified({
      objectKey: this.objectKey(artifact.sha256),
      expectedSha256: artifact.sha256,
      expectedBytes: artifact.bytes,
      signal: input.signal,
    });
  }

  /** Removes abandoned partial writes without touching published objects. */
  async recoverIncompleteWrites(options?: {
    olderThanMs?: number;
    maxEntries?: number;
    nowMs?: number;
  }): Promise<ArtifactRecoveryReport> {
    return this.objects.recoverIncompleteWrites(options);
  }

  private objectKey(sha256: string): string {
    return `field-objects/${sha256.slice(0, 2)}/${sha256}.bin`;
  }

  private recoverOnFirstUse(): Promise<ArtifactRecoveryReport> {
    this.initialRecovery ??= this.objects.recoverIncompleteWrites();
    return this.initialRecovery;
  }

  private async loadManifest(path: string): Promise<FieldManifest> {
    let manifest: FieldManifest;
    try {
      manifest = fieldManifestSchema.parse(
        JSON.parse((await this.bytes(path, 2 * 1024 * 1024)).toString()),
      );
      const { manifest_sha256, ...content } = manifest;
      if (manifest_sha256 !== digest(canonical(content)))
        throw Error('Manifest checksum mismatch');
    } catch {
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Invalid field manifest',
      );
    }
    return manifest;
  }

  private async immutable(path: string, bytes: Buffer): Promise<void> {
    const temporary = `${path}.${randomUUID()}.tmp`;
    const file = await open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(bytes);
      await file.sync();
      await file.close();
      try {
        await link(temporary, path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const existing = await this.bytes(
          path,
          Math.max(this.maxFieldBytes, 2 * 1024 * 1024),
        );
        if (!existing.equals(bytes))
          throw new SpatialArtifactStoreError(
            'integrity_failure',
            'Immutable field artifact differs from existing content',
          );
      }
    } finally {
      await file.close().catch(() => undefined);
      await rm(temporary, { force: true });
    }
  }
}
