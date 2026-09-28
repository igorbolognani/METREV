import { createHash } from 'node:crypto';
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LocalSpatialArtifactStore,
  SpatialArtifactStoreError,
} from '@metrev/spatial-artifact-store';

import { copy, validSpatialInput } from '../fixtures/spatial-input-v2';

const digest = (value: Buffer) =>
  createHash('sha256').update(value).digest('hex');

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'metrev-artifact-store-'));
  const modelInput = validSpatialInput();
  const bytes = Buffer.from(
    '$MeshFormat\n4.1 0 8\n$EndMeshFormat\nfixture-mesh-bytes',
  );
  const meshSha = digest(bytes);
  modelInput.mesh.sha256 = meshSha;
  const meshFilePath = join(root, 'mesh.msh');
  await writeFile(meshFilePath, bytes);
  const request = modelInput.mesh.request;
  const response = {
    protocol_version: 'spatial-sidecar-v1',
    request_id: request.request_id,
    status: 'ok',
    operation: 'planar_mesh',
    metadata: {
      sidecar_version: '0.1.0',
      protocol_version: 'spatial-sidecar-v1',
      python_version: '3.12',
      gmsh_version: '4.15.2',
      dolfinx_version: null,
      petsc_version: null,
    },
    geometry_version: 'planar-layers-v1',
    input_sha256: modelInput.mesh.input_sha256,
    physical_groups: copy(modelInput.mesh.physical_groups),
    component_map: copy(modelInput.mesh.component_map),
    interfaces: copy(modelInput.mesh.interfaces),
    artifacts: [
      {
        refinement_factor: modelInput.mesh.refinement_factor,
        format: 'msh4',
        path: 'mesh-1.msh',
        sha256: meshSha,
        bytes: bytes.byteLength,
        node_count: 3,
        cell_count: 1,
        min_quality: 0.5,
      },
    ],
  } as const;
  const store = new LocalSpatialArtifactStore({
    rootDirectory: join(root, 'private-store'),
  });
  return { root, store, modelInput, response, meshFilePath, bytes, meshSha };
}

describe('local spatial artifact store', () => {
  it('stores mesh bytes by content hash and reloads them only for the owning user and request', async () => {
    const fixture = await setup();
    try {
      const stored = await fixture.store.storeMesh({
        meshFilePath: fixture.meshFilePath,
        ownerId: 'user-123',
        modelInput: fixture.modelInput,
        sidecarResponse: fixture.response,
      });
      expect(stored.uri).toBe(`metrev-artifact://sha256/${fixture.meshSha}`);
      expect(stored.manifest.bytes).toBe(fixture.bytes.byteLength);
      expect(stored.manifest.manifest_sha256).toMatch(/^[a-f0-9]{64}$/);
      const repeated = await fixture.store.storeMesh({
        meshFilePath: fixture.meshFilePath,
        ownerId: 'user-123',
        modelInput: fixture.modelInput,
        sidecarResponse: fixture.response,
      });
      expect(repeated.manifest).toEqual(stored.manifest);
      const loaded = await fixture.store.readMesh({
        uri: stored.uri,
        ownerId: 'user-123',
        requestSha256: fixture.modelInput.mesh.input_sha256,
      });
      expect(loaded.bytes).toEqual(fixture.bytes);
      expect(loaded.manifest.mesh_reference.request.mesh).toEqual(
        fixture.modelInput.geometry,
      );
      await expect(
        fixture.store.readMesh({
          uri: stored.uri,
          ownerId: 'other-user',
          requestSha256: fixture.modelInput.mesh.input_sha256,
        }),
      ).rejects.toMatchObject({ code: 'not_found' });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('rejects bytes or metadata that differ from the sidecar manifest', async () => {
    const fixture = await setup();
    try {
      await expect(
        fixture.store.storeMesh({
          meshFilePath: fixture.meshFilePath,
          ownerId: 'user-123',
          modelInput: fixture.modelInput,
          sidecarResponse: {
            ...fixture.response,
            input_sha256: 'f'.repeat(64),
          },
        }),
      ).rejects.toMatchObject({ code: 'integrity_failure' });
      await writeFile(fixture.meshFilePath, Buffer.from('changed mesh bytes'));
      await expect(
        fixture.store.storeMesh({
          meshFilePath: fixture.meshFilePath,
          ownerId: 'user-123',
          modelInput: fixture.modelInput,
          sidecarResponse: fixture.response,
        }),
      ).rejects.toMatchObject({ code: 'integrity_failure' });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('rejects symbolic-link sources and detects modified stored bytes', async () => {
    const fixture = await setup();
    const linkPath = join(fixture.root, 'mesh-link.msh');
    try {
      await symlink(fixture.meshFilePath, linkPath);
      await expect(
        fixture.store.storeMesh({
          meshFilePath: linkPath,
          ownerId: 'user-123',
          modelInput: fixture.modelInput,
          sidecarResponse: fixture.response,
        }),
      ).rejects.toBeInstanceOf(SpatialArtifactStoreError);
      const stored = await fixture.store.storeMesh({
        meshFilePath: fixture.meshFilePath,
        ownerId: 'user-123',
        modelInput: fixture.modelInput,
        sidecarResponse: fixture.response,
      });
      const objectPath = join(
        fixture.root,
        'private-store',
        'objects',
        fixture.meshSha.slice(0, 2),
        `${fixture.meshSha}.msh`,
      );
      const original = await readFile(objectPath);
      const changed = Buffer.from(original);
      changed[changed.length - 1] ^= 1;
      await writeFile(objectPath, changed);
      await expect(
        fixture.store.readMesh({
          uri: stored.uri,
          ownerId: 'user-123',
          requestSha256: fixture.modelInput.mesh.input_sha256,
        }),
      ).rejects.toMatchObject({ code: 'integrity_failure' });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('enforces the configured size limit and rejects a modified manifest', async () => {
    const fixture = await setup();
    try {
      const limitedStore = new LocalSpatialArtifactStore({
        rootDirectory: join(fixture.root, 'size-limited-store'),
        maxMeshBytes: fixture.bytes.byteLength - 1,
      });
      await expect(
        limitedStore.storeMesh({
          meshFilePath: fixture.meshFilePath,
          ownerId: 'user-123',
          modelInput: fixture.modelInput,
          sidecarResponse: fixture.response,
        }),
      ).rejects.toMatchObject({ code: 'size_limit' });

      const stored = await fixture.store.storeMesh({
        meshFilePath: fixture.meshFilePath,
        ownerId: 'user-123',
        modelInput: fixture.modelInput,
        sidecarResponse: fixture.response,
      });
      const ownerSha = createHash('sha256')
        .update('metrev-owner-v1:user-123')
        .digest('hex');
      const manifestPath = join(
        fixture.root,
        'private-store',
        'owners',
        ownerSha.slice(0, 2),
        ownerSha,
        fixture.modelInput.mesh.input_sha256,
        `${fixture.meshSha}.json`,
      );
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      manifest.manifest_sha256 = '0'.repeat(64);
      await writeFile(manifestPath, JSON.stringify(manifest));
      await expect(
        fixture.store.readMesh({
          uri: stored.uri,
          ownerId: 'user-123',
          requestSha256: fixture.modelInput.mesh.input_sha256,
        }),
      ).rejects.toMatchObject({ code: 'integrity_failure' });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('rejects an artifact root with permissions that expose its contents', async () => {
    const fixture = await setup();
    try {
      await fixture.store.storeMesh({
        meshFilePath: fixture.meshFilePath,
        ownerId: 'user-123',
        modelInput: fixture.modelInput,
        sidecarResponse: fixture.response,
      });
      await chmod(join(fixture.root, 'private-store'), 0o755);
      const publicStore = new LocalSpatialArtifactStore({
        rootDirectory: join(fixture.root, 'private-store'),
      });
      await expect(
        publicStore.storeMesh({
          meshFilePath: fixture.meshFilePath,
          ownerId: 'user-123',
          modelInput: fixture.modelInput,
          sidecarResponse: fixture.response,
        }),
      ).rejects.toMatchObject({ code: 'integrity_failure' });
    } finally {
      await chmod(join(fixture.root, 'private-store'), 0o700).catch(
        () => undefined,
      );
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});
