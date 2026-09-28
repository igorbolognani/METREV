import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { link, lstat, mkdir, open, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  spatialMeshReferenceSchema,
  spatialModelInputV2Schema,
  spatialSidecarResponseSchema,
  type SpatialSidecarResponse,
  type SpatialModelInputV2,
} from '@metrev/domain-contracts';
import { z } from 'zod';

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const meshUriSchema = z
  .string()
  .regex(/^metrev-artifact:\/\/sha256\/[a-f0-9]{64}$/);

const manifestContentSchema = z
  .object({
    manifest_version: z.literal('spatial-mesh-artifact-v1'),
    artifact_uri: meshUriSchema,
    sha256: digestSchema,
    bytes: z.number().int().positive(),
    format: z.literal('msh4'),
    owner_sha256: digestSchema,
    request_sha256: digestSchema,
    mesh_reference: spatialMeshReferenceSchema,
    created_at: z.string().datetime(),
  })
  .strict();

const manifestSchema = manifestContentSchema
  .extend({ manifest_sha256: digestSchema })
  .strict();

type ManifestContent = z.infer<typeof manifestContentSchema>;
export type SpatialMeshArtifactManifest = z.infer<typeof manifestSchema>;

export class SpatialArtifactStoreError extends Error {
  constructor(
    readonly code:
      | 'invalid_input'
      | 'not_found'
      | 'access_denied'
      | 'integrity_failure'
      | 'size_limit',
    message: string,
  ) {
    super(message);
    this.name = 'SpatialArtifactStoreError';
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function ownerDigest(ownerId: string): string {
  const normalized = ownerId.trim();
  if (!normalized || normalized.length > 256)
    throw new SpatialArtifactStoreError(
      'invalid_input',
      'An authenticated owner ID is required',
    );
  return sha256(`metrev-owner-v1:${normalized}`);
}

function parseUri(uri: string): string {
  const match = /^metrev-artifact:\/\/sha256\/([a-f0-9]{64})$/.exec(uri);
  if (!match)
    throw new SpatialArtifactStoreError(
      'invalid_input',
      'Unsupported or malformed spatial artifact URI',
    );
  return match[1];
}

function manifestHash(content: ManifestContent): string {
  return sha256(canonicalJson(content));
}

function manifestContentOf(
  manifest: SpatialMeshArtifactManifest,
): ManifestContent {
  const { manifest_sha256: _manifestSha256, ...content } = manifest;
  return content;
}

export interface LocalSpatialArtifactStoreOptions {
  /** Private application data directory; never expose this path over HTTP. */
  rootDirectory: string;
  /** Upper bound on one mesh file; defaults to 256 MiB. */
  maxMeshBytes?: number;
}

export interface StoreMeshInput {
  meshFilePath: string;
  ownerId: string;
  modelInput: SpatialModelInputV2;
  sidecarResponse: SpatialSidecarResponse;
}

export interface StoredSpatialMesh {
  uri: string;
  sha256: string;
  bytes: number;
  manifest: SpatialMeshArtifactManifest;
  meshReference: ReturnType<typeof spatialMeshReferenceSchema.parse>;
}

/**
 * Development filesystem adapter for content-addressed mesh files.
 * PostgreSQL stores references and run metadata; this adapter stores mesh bytes.
 */
export class LocalSpatialArtifactStore {
  private readonly rootDirectory: string;
  private readonly maxMeshBytes: number;

  constructor(options: LocalSpatialArtifactStoreOptions) {
    if (!options.rootDirectory.trim())
      throw new SpatialArtifactStoreError(
        'invalid_input',
        'A private artifact root directory must be configured',
      );
    this.rootDirectory = resolve(options.rootDirectory);
    this.maxMeshBytes = options.maxMeshBytes ?? 256 * 1024 * 1024;
    if (!Number.isSafeInteger(this.maxMeshBytes) || this.maxMeshBytes <= 0)
      throw new SpatialArtifactStoreError(
        'invalid_input',
        'maxMeshBytes must be a positive safe integer',
      );
  }

  async storeMesh(input: StoreMeshInput): Promise<StoredSpatialMesh> {
    const model = spatialModelInputV2Schema.parse(input.modelInput);
    const sidecarResponse = spatialSidecarResponseSchema.parse(
      input.sidecarResponse,
    );
    const meshArtifact =
      sidecarResponse.status === 'ok' &&
      sidecarResponse.operation === 'planar_mesh'
        ? sidecarResponse.artifacts.find(
            (artifact) =>
              artifact.refinement_factor === model.mesh.refinement_factor,
          )
        : undefined;
    if (
      sidecarResponse.status !== 'ok' ||
      sidecarResponse.operation !== 'planar_mesh' ||
      sidecarResponse.request_id !== model.mesh.request.request_id ||
      sidecarResponse.input_sha256 !== model.mesh.input_sha256 ||
      sidecarResponse.geometry_version !==
        model.mesh.request.mesh.geometry_version ||
      sidecarResponse.metadata.sidecar_version !== model.mesh.sidecar_version ||
      sidecarResponse.metadata.gmsh_version !== model.mesh.gmsh_version ||
      !meshArtifact ||
      meshArtifact.sha256 !== model.mesh.sha256 ||
      meshArtifact.format !== model.mesh.format ||
      !sidecarResponse.metadata.gmsh_version ||
      canonicalJson(sidecarResponse.physical_groups) !==
        canonicalJson(model.mesh.physical_groups) ||
      canonicalJson(sidecarResponse.component_map) !==
        canonicalJson(model.mesh.component_map) ||
      canonicalJson(sidecarResponse.interfaces) !==
        canonicalJson(model.mesh.interfaces)
    )
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Spatial input does not match a successful sidecar mesh manifest',
      );
    const ownerSha = ownerDigest(input.ownerId);
    const expectedMeshSha = model.mesh.sha256;
    const uri = `metrev-artifact://sha256/${expectedMeshSha}`;
    const meshReference = spatialMeshReferenceSchema.parse({
      ...model.mesh,
      uri,
    });
    const objectDirectory = join(
      this.rootDirectory,
      'objects',
      expectedMeshSha.slice(0, 2),
    );
    const ownerDirectory = join(
      this.rootDirectory,
      'owners',
      ownerSha.slice(0, 2),
      ownerSha,
      model.mesh.input_sha256,
    );
    await mkdir(this.rootDirectory, { recursive: true, mode: 0o700 });
    await this.assertSafeDirectory(this.rootDirectory);
    await this.ensurePrivateDirectory('objects', expectedMeshSha.slice(0, 2));
    await this.ensurePrivateDirectory(
      'owners',
      ownerSha.slice(0, 2),
      ownerSha,
      model.mesh.input_sha256,
    );

    const objectPath = join(objectDirectory, `${expectedMeshSha}.msh`);
    const actual = await this.persistVerifiedFile(
      input.meshFilePath,
      objectPath,
      expectedMeshSha,
      meshArtifact.bytes,
    );
    const manifestContent: ManifestContent = manifestContentSchema.parse({
      manifest_version: 'spatial-mesh-artifact-v1',
      artifact_uri: uri,
      sha256: expectedMeshSha,
      bytes: actual.bytes,
      format: 'msh4',
      owner_sha256: ownerSha,
      request_sha256: model.mesh.input_sha256,
      mesh_reference: meshReference,
      created_at: new Date().toISOString(),
    });
    const manifest = manifestSchema.parse({
      ...manifestContent,
      manifest_sha256: manifestHash(manifestContent),
    });
    const manifestPath = join(ownerDirectory, `${expectedMeshSha}.json`);
    const persistedManifest = await this.persistImmutableJson(
      manifestPath,
      manifest,
    );
    return {
      uri,
      sha256: expectedMeshSha,
      bytes: actual.bytes,
      manifest: persistedManifest,
      meshReference,
    };
  }

  async readMesh(input: {
    uri: string;
    ownerId: string;
    requestSha256: string;
  }): Promise<{ bytes: Buffer; manifest: SpatialMeshArtifactManifest }> {
    const artifactSha = parseUri(input.uri);
    const requestSha = digestSchema.parse(input.requestSha256);
    const ownerSha = ownerDigest(input.ownerId);
    const manifestPath = join(
      this.rootDirectory,
      'owners',
      ownerSha.slice(0, 2),
      ownerSha,
      requestSha,
      `${artifactSha}.json`,
    );
    const manifest = await this.readManifest(manifestPath);
    if (
      manifest.owner_sha256 !== ownerSha ||
      manifest.artifact_uri !== input.uri ||
      manifest.request_sha256 !== requestSha
    )
      throw new SpatialArtifactStoreError(
        'access_denied',
        'Spatial artifact is not authorized for this owner and request',
      );
    const objectPath = join(
      this.rootDirectory,
      'objects',
      artifactSha.slice(0, 2),
      `${artifactSha}.msh`,
    );
    const bytes = await this.readRegularFile(
      objectPath,
      this.maxMeshBytes,
      'Spatial mesh content is unavailable',
    );
    if (
      bytes.byteLength !== manifest.bytes ||
      sha256(bytes) !== manifest.sha256
    )
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Spatial mesh content hash or length does not match its manifest',
      );
    return { bytes, manifest };
  }

  private async persistVerifiedFile(
    sourcePath: string,
    destinationPath: string,
    expectedSha: string,
    expectedBytes: number,
  ): Promise<{ bytes: number }> {
    const source = await open(
      sourcePath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    ).catch(() => {
      throw new SpatialArtifactStoreError(
        'invalid_input',
        'Mesh source must be a regular file and cannot be a symbolic link',
      );
    });
    const temporaryPath = `${destinationPath}.${randomUUID()}.tmp`;
    let destination;
    let byteCount = 0;
    const hash = createHash('sha256');
    try {
      const stat = await source.stat();
      if (!stat.isFile() || stat.size <= 0)
        throw new SpatialArtifactStoreError(
          'invalid_input',
          'Mesh must be a non-empty regular file',
        );
      if (stat.size > this.maxMeshBytes)
        throw new SpatialArtifactStoreError(
          'size_limit',
          `Mesh must be a non-empty regular file no larger than ${this.maxMeshBytes} bytes`,
        );
      if (stat.size !== expectedBytes)
        throw new SpatialArtifactStoreError(
          'integrity_failure',
          'Mesh length does not match the sidecar manifest',
        );
      destination = await open(temporaryPath, 'wx', 0o600);
      const stream = source.createReadStream({ autoClose: false });
      for await (const part of stream) {
        const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
        byteCount += chunk.byteLength;
        if (byteCount > this.maxMeshBytes)
          throw new SpatialArtifactStoreError(
            'size_limit',
            `Mesh exceeds ${this.maxMeshBytes} bytes`,
          );
        hash.update(chunk);
        let offset = 0;
        while (offset < chunk.length) {
          const written = await destination.write(
            chunk,
            offset,
            chunk.length - offset,
          );
          offset += written.bytesWritten;
        }
      }
      const actualSha = hash.digest('hex');
      if (byteCount !== stat.size || actualSha !== expectedSha)
        throw new SpatialArtifactStoreError(
          'integrity_failure',
          'Mesh bytes do not match the sidecar manifest hash and size',
        );
      await destination.sync();
      await destination.close();
      destination = undefined;
      try {
        await link(temporaryPath, destinationPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const existing = await this.hashExistingObject(destinationPath);
        if (existing.sha256 !== expectedSha || existing.bytes !== byteCount)
          throw new SpatialArtifactStoreError(
            'integrity_failure',
            'Existing content-addressed mesh does not match its key',
          );
      }
      return { bytes: byteCount };
    } finally {
      await destination?.close().catch(() => undefined);
      await source.close().catch(() => undefined);
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  }

  private async hashExistingObject(
    filePath: string,
  ): Promise<{ sha256: string; bytes: number }> {
    const existing = await open(
      filePath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    ).catch(() => {
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Existing mesh object is not a regular file',
      );
    });
    try {
      const stat = await existing.stat();
      if (!stat.isFile() || stat.size <= 0 || stat.size > this.maxMeshBytes)
        throw new SpatialArtifactStoreError(
          'integrity_failure',
          'Existing mesh object has an invalid type or size',
        );
      const hash = createHash('sha256');
      let bytes = 0;
      for await (const part of existing.createReadStream({
        autoClose: false,
      })) {
        const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
        bytes += chunk.byteLength;
        if (bytes > this.maxMeshBytes)
          throw new SpatialArtifactStoreError(
            'integrity_failure',
            'Existing mesh object exceeds the configured size limit',
          );
        hash.update(chunk);
      }
      return { sha256: hash.digest('hex'), bytes };
    } finally {
      await existing.close().catch(() => undefined);
    }
  }

  private async persistImmutableJson(
    destinationPath: string,
    value: SpatialMeshArtifactManifest,
  ): Promise<SpatialMeshArtifactManifest> {
    const temporaryPath = `${destinationPath}.${randomUUID()}.tmp`;
    const file = await open(temporaryPath, 'wx', 0o600);
    try {
      await file.writeFile(`${canonicalJson(value)}\n`, 'utf8');
      await file.sync();
      await file.close();
      try {
        await link(temporaryPath, destinationPath);
        return value;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const existing = await this.readManifest(destinationPath);
        if (
          existing.owner_sha256 !== value.owner_sha256 ||
          existing.request_sha256 !== value.request_sha256 ||
          existing.artifact_uri !== value.artifact_uri ||
          existing.sha256 !== value.sha256 ||
          canonicalJson(existing.mesh_reference) !==
            canonicalJson(value.mesh_reference)
        )
          throw new SpatialArtifactStoreError(
            'integrity_failure',
            'An immutable mesh manifest already exists with different content',
          );
        return existing;
      }
    } finally {
      await file.close().catch(() => undefined);
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  }

  private async readManifest(
    manifestPath: string,
  ): Promise<SpatialMeshArtifactManifest> {
    const bytes = await this.readRegularFile(
      manifestPath,
      2 * 1024 * 1024,
      'Spatial artifact is not available to this owner',
    );
    let parsed: unknown;
    try {
      parsed = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Spatial artifact manifest is malformed',
      );
    }
    let manifest: SpatialMeshArtifactManifest;
    try {
      manifest = manifestSchema.parse(parsed);
    } catch {
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Spatial artifact manifest has an invalid shape',
      );
    }
    if (
      manifestHash(manifestContentOf(manifest)) !== manifest.manifest_sha256 ||
      manifest.mesh_reference.sha256 !== manifest.sha256 ||
      manifest.mesh_reference.uri !== manifest.artifact_uri ||
      manifest.mesh_reference.format !== manifest.format ||
      manifest.mesh_reference.input_sha256 !== manifest.request_sha256
    )
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Spatial artifact manifest hash or mesh reference does not match',
      );
    return manifest;
  }

  private async readRegularFile(
    filePath: string,
    maxBytes: number,
    missingMessage: string,
  ): Promise<Buffer> {
    const file = await open(
      filePath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    ).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new SpatialArtifactStoreError('not_found', missingMessage);
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Artifact storage entry must be a regular file and cannot be a symbolic link',
      );
    });
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size <= 0 || stat.size > maxBytes)
        throw new SpatialArtifactStoreError(
          'integrity_failure',
          'Artifact storage file has an invalid type or size',
        );
      return await file.readFile();
    } finally {
      await file.close().catch(() => undefined);
    }
  }

  private async assertSafeDirectory(directoryPath: string): Promise<void> {
    const stat = await lstat(directoryPath);
    if (
      stat.isSymbolicLink() ||
      !stat.isDirectory() ||
      (stat.mode & 0o077) !== 0
    )
      throw new SpatialArtifactStoreError(
        'integrity_failure',
        'Artifact storage path must be a private directory without symbolic links',
      );
  }

  private async ensurePrivateDirectory(...segments: string[]): Promise<void> {
    let directoryPath = this.rootDirectory;
    for (const segment of segments) {
      directoryPath = join(directoryPath, segment);
      try {
        await mkdir(directoryPath, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
      await this.assertSafeDirectory(directoryPath);
    }
  }
}
