import { fileURLToPath } from 'node:url';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  planarMeshSchema,
  spatialSidecarRequestSchema,
} from '@metrev/domain-contracts';
import {
  composeModules,
  resolvePhysicsComposition,
} from '@metrev/electrochem-models';
import {
  runSpatialSidecar,
  SidecarTransportError,
} from '@metrev/spatial-sidecar-client';

const root = fileURLToPath(new URL('../../', import.meta.url));
const moduleDirectory = join(root, 'apps/spatial-sidecar');
const fixture = JSON.parse(
  await readFile(join(root, 'tests/fixtures/planar-mesh-request.json'), 'utf8'),
);

describe('isolated numerical sidecar boundary', () => {
  it('keeps geometry, provenance and topology explicit', () => {
    expect(spatialSidecarRequestSchema.parse(fixture).operation).toBe(
      'planar_mesh',
    );
    expect(
      planarMeshSchema.safeParse({
        ...fixture.mesh,
        height_m: { ...fixture.mesh.height_m, unit: 's' },
      }).success,
    ).toBe(false);
    expect(
      planarMeshSchema.safeParse({
        ...fixture.mesh,
        layers: [fixture.mesh.layers[0], fixture.mesh.layers[0]],
      }).success,
    ).toBe(false);
    expect(
      planarMeshSchema.safeParse({
        ...fixture.mesh,
        refinement_factors: [1, 1, 4],
      }).success,
    ).toBe(false);
    const plan = composeModules(['circuit', 'membrane_or_separator'], 1);
    expect(plan.findIndex((m) => m.id === 'anode')).toBeLessThan(
      plan.findIndex((m) => m.id === 'circuit'),
    );
    expect(
      resolvePhysicsComposition({
        modelId: 'biofilm-2d-electrode-research-v1',
        system: 'MFC',
      }).modulePlan.every((m) => !m.executableAtFidelity),
    ).toBe(true);
    const unsupported = resolvePhysicsComposition({
      modelId: 'coupled-cell-1d-restricted-v1',
      system: 'MEC',
      architecture: 'tubular',
    });
    expect(unsupported.missingModules).toContain(
      'configuration_specific_mapping',
    );
    expect(unsupported.modulePlan.every((m) => !m.executableAtFidelity)).toBe(
      true,
    );
  });

  it('exchanges typed health and structured dependency failures with Python', async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), 'metrev-sidecar-test-'));
    const options = {
      pythonExecutable: 'python3',
      moduleDirectory,
      artifactRoot,
      timeoutMs: 10_000,
    };
    try {
      const health = await runSpatialSidecar(
        {
          protocol_version: 'spatial-sidecar-v1',
          request_id: fixture.request_id,
          operation: 'health',
        },
        options,
      );
      expect(health.response.status).toBe('ok');
      expect(health.artifactDirectory).toBeNull();
      const mesh = await runSpatialSidecar(fixture, options);
      if (mesh.response.status === 'error') {
        expect(mesh.response.code).toBe('dependency_unavailable');
      } else {
        expect(
          mesh.response.artifacts.map((artifact) => artifact.refinement_factor),
        ).toEqual([1, 2, 4]);
        expect(
          mesh.response.physical_groups['interface:anode:biofilm'],
        ).toBeGreaterThan(0);
        expect(mesh.response.component_map.anode).toBe('case/anode');
      }
    } finally {
      await rm(artifactRoot, { recursive: true, force: true });
    }
  });

  it('cancels an already aborted invocation before spawning', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runSpatialSidecar(
        {
          protocol_version: 'spatial-sidecar-v1',
          request_id: fixture.request_id,
          operation: 'health',
        },
        {
          pythonExecutable: 'python3',
          moduleDirectory,
          artifactRoot: tmpdir(),
          timeoutMs: 5000,
          signal: controller.signal,
        },
      ),
    ).rejects.toMatchObject({
      code: 'cancelled',
    } satisfies Partial<SidecarTransportError>);
  });

  it('enforces deadlines and cancellation on a running child process', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'metrev-sidecar-kill-'));
    const slowExecutable = join(directory, 'slow-python');
    await writeFile(
      slowExecutable,
      '#!/usr/bin/env python3\nimport time\ntime.sleep(3)\n',
    );
    await chmod(slowExecutable, 0o700);
    const health = {
      protocol_version: 'spatial-sidecar-v1' as const,
      request_id: fixture.request_id,
      operation: 'health' as const,
    };
    const options = {
      pythonExecutable: slowExecutable,
      moduleDirectory,
      artifactRoot: directory,
      timeoutMs: 25,
    };
    try {
      await expect(runSpatialSidecar(health, options)).rejects.toMatchObject({
        code: 'timeout',
      });
      const controller = new AbortController();
      const pending = runSpatialSidecar(health, {
        ...options,
        timeoutMs: 5000,
        signal: controller.signal,
      });
      setTimeout(() => controller.abort(), 25);
      await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.skipIf(process.platform === 'win32')(
    'terminates descendants when a sidecar process is cancelled',
    async () => {
      const directory = await mkdtemp(join(tmpdir(), 'metrev-sidecar-tree-'));
      const launcher = join(directory, 'launch-descendant');
      const startedFile = join(directory, 'descendant-started');
      const escapedFile = join(directory, 'descendant-survived');
      const descendant = [
        'import pathlib, time',
        `pathlib.Path(${JSON.stringify(startedFile)}).write_text("started")`,
        'time.sleep(0.5)',
        `pathlib.Path(${JSON.stringify(escapedFile)}).write_text("survived")`,
      ].join('\n');
      await writeFile(
        launcher,
        [
          '#!/usr/bin/env python3',
          'import subprocess, sys, time',
          `subprocess.Popen([sys.executable, "-c", ${JSON.stringify(descendant)}])`,
          'time.sleep(10)',
        ].join('\n'),
      );
      await chmod(launcher, 0o700);
      const controller = new AbortController();
      const health = {
        protocol_version: 'spatial-sidecar-v1' as const,
        request_id: fixture.request_id,
        operation: 'health' as const,
      };
      try {
        const pending = runSpatialSidecar(health, {
          pythonExecutable: launcher,
          moduleDirectory,
          artifactRoot: directory,
          timeoutMs: 5000,
          signal: controller.signal,
        });
        const deadline = Date.now() + 2000;
        while (Date.now() < deadline) {
          try {
            await readFile(startedFile);
            break;
          } catch {
            await new Promise((resolveWait) => setTimeout(resolveWait, 10));
          }
        }
        await expect(readFile(startedFile)).resolves.toBeDefined();
        controller.abort();
        await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
        await new Promise((resolveWait) => setTimeout(resolveWait, 650));
        await expect(readFile(escapedFile)).rejects.toMatchObject({
          code: 'ENOENT',
        });
      } finally {
        controller.abort();
        await rm(directory, { recursive: true, force: true });
      }
    },
    5_000,
  );
});
