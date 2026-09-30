import { fileURLToPath } from 'node:url';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  planarMeshSchema,
  spatialModelInputV2Sha256,
  spatialSidecarResponseSchema,
  spatialSidecarRequestSchema,
} from '@metrev/domain-contracts';
import {
  composeModules,
  resolvePhysicsComposition,
} from '@metrev/electrochem-models';
import {
  runSpatialSidecar,
  planarStokesRequestFromInput,
  SidecarTransportError,
} from '@metrev/spatial-sidecar-client';
import { stokesChannelInput } from '../fixtures/spatial-input-v2';

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

  it('binds the restricted Stokes operation to an admitted input and mesh artifact', async () => {
    const input = stokesChannelInput();
    const request = planarStokesRequestFromInput(input, fixture.request_id);
    expect(spatialSidecarRequestSchema.parse(request)).toMatchObject({
      operation: 'planar_stokes',
      model_input_contract_version: 'spatial-input-v2',
      model_input_sha256: spatialModelInputV2Sha256(input),
      mesh_sha256: input.mesh.sha256,
      setup: input.stokes_development,
      viscosity: input.material_fields[0].field.value,
    });
    expect(() =>
      planarStokesRequestFromInput({ ...input, stokes_development: undefined }),
    ).toThrow(/does not declare the Stokes development regime/);

    const artifactRoot = await mkdtemp(join(tmpdir(), 'metrev-stokes-test-'));
    const options = {
      pythonExecutable: 'python3',
      moduleDirectory,
      artifactRoot,
      timeoutMs: 20_000,
    };
    try {
      const mesh = await runSpatialSidecar(input.mesh.request, options);
      if (mesh.response.status === 'error') {
        expect(mesh.response.code).toBe('dependency_unavailable');
        return;
      }
      const selectedMesh = mesh.response.artifacts.find(
        (artifact) =>
          artifact.refinement_factor === input.mesh.refinement_factor,
      );
      expect(selectedMesh).toBeDefined();
      input.mesh.sha256 = selectedMesh!.sha256;
      const boundRequest = planarStokesRequestFromInput(input);
      const result = await runSpatialSidecar(boundRequest, options);
      if (result.response.status === 'error') {
        expect(result.response.code).toBe('dependency_unavailable');
        return;
      }
      expect(result.response.operation).toBe('planar_stokes');
      expect(
        result.response.field_datasets.map((field) => field.variable_id),
      ).toEqual(['p', 'ux', 'uy']);
      expect(result.artifactDirectory).toBeTruthy();
    } finally {
      await rm(artifactRoot, { recursive: true, force: true });
    }
  });

  it('requires paired XDMF/HDF5 manifests and declared Stokes dataset bindings', () => {
    const response = {
      protocol_version: 'spatial-sidecar-v1',
      request_id: fixture.request_id,
      status: 'ok',
      operation: 'planar_stokes',
      metadata: {
        sidecar_version: '0.1.0',
        protocol_version: 'spatial-sidecar-v1',
        python_version: '3.12.0',
        gmsh_version: '4.15.2',
        dolfinx_version: '0.10.0',
        petsc_version: '3.22.0',
      },
      model_input_sha256: 'a'.repeat(64),
      model_input_contract_version: 'spatial-input-v2',
      mesh: {
        refinement_factor: 1,
        format: 'msh4',
        path: 'mesh-1.msh',
        sha256: 'b'.repeat(64),
        bytes: 256,
        node_count: 25,
        cell_count: 32,
        min_quality: 0.5,
      },
      physical_groups: {
        'region:liquid': 1,
        'boundary:west': 101,
        'boundary:east': 102,
        'boundary:inlet': 103,
        'boundary:outlet': 104,
      },
      diagnostics: {
        inlet_flow_m2_s_per_depth: 1e-8,
        outlet_flow_m2_s_per_depth: 1e-8,
        relative_flow_balance: 1e-12,
        mean_inlet_pressure_pa: 1,
        mean_outlet_pressure_pa: 0,
        pressure_drop_pa: 1,
        divergence_l2_per_s: 1e-12,
        linear_iterations: 1,
        linear_converged_reason: 2,
      },
      solution_artifacts: [
        {
          path: 'stokes-solution.xdmf',
          format: 'xdmf',
          sha256: 'c'.repeat(64),
          bytes: 512,
        },
        {
          path: 'stokes-solution.h5',
          format: 'hdf5',
          sha256: 'd'.repeat(64),
          bytes: 1024,
        },
      ],
      field_datasets: [
        {
          variable_id: 'p',
          field_name: 'pressure',
          dataset_path: '/Function/pressure/0',
          unit: 'Pa',
          domain_tag: 'liquid',
        },
        {
          variable_id: 'ux',
          field_name: 'velocity_x',
          dataset_path: '/Function/velocity_x/0',
          unit: 'm/s',
          domain_tag: 'liquid',
        },
        {
          variable_id: 'uy',
          field_name: 'velocity_y',
          dataset_path: '/Function/velocity_y/0',
          unit: 'm/s',
          domain_tag: 'liquid',
        },
      ],
    } as const;
    expect(spatialSidecarResponseSchema.safeParse(response).success).toBe(true);
    expect(
      spatialSidecarResponseSchema.safeParse({
        ...response,
        solution_artifacts: [
          response.solution_artifacts[0],
          { ...response.solution_artifacts[1], format: 'xdmf' },
        ],
      }).success,
    ).toBe(false);
    expect(
      spatialSidecarResponseSchema.safeParse({
        ...response,
        field_datasets: [
          response.field_datasets[0],
          {
            ...response.field_datasets[1],
            dataset_path: '/Function/velocity_y/0',
          },
          response.field_datasets[2],
        ],
      }).success,
    ).toBe(false);
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
