import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { SessionActor } from '@metrev/auth';
import {
  MemoryEvaluationRepository,
  MemorySpatialSimulationRunRepository,
} from '@metrev/database';
import {
  spatialModelInputV2Schema,
  spatialModelInputV2Sha256,
  spatialSidecarResponseSchema,
} from '@metrev/domain-contracts';
import {
  LocalSpatialArtifactStore,
  LocalSpatialFieldArtifactStore,
} from '@metrev/spatial-artifact-store';
import type { SpatialSidecarRequest } from '@metrev/domain-contracts';
import type { SidecarProcessOptions } from '@metrev/spatial-sidecar-client';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../apps/api-server/src/app';
import { StokesDevelopmentExecutor } from '../../packages/spatial-worker/src/stokes-development-executor';
import type { StokesSidecarRunner } from '../../packages/spatial-worker/src/stokes-development-executor';
import { runSpatialSimulationWorkerCycle } from '../../packages/spatial-worker/src/worker';
import {
  darcyTransportInput,
  digestRequest,
  stokesChannelInput,
} from '../fixtures/spatial-input-v2';

const ownerId = 'stokes-development-owner';

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function modelInput(meshBytes: Buffer) {
  const candidate = stokesChannelInput();
  candidate.mesh.sha256 = sha256(meshBytes);
  candidate.mesh.input_sha256 = digestRequest(candidate.mesh.request);
  return spatialModelInputV2Schema.parse(candidate);
}

function responseFor(input: ReturnType<typeof modelInput>, requestId: string) {
  const hdf5 = Buffer.from('synthetic Stokes HDF5 payload');
  const xdmf = Buffer.from('synthetic Stokes XDMF payload');
  const mesh = Buffer.from('synthetic Stokes msh4 payload');
  const fields = [
    ['pressure', 'p', 'Pa', 0, 10, 5, 5, 'Pa*m2'],
    ['velocity_x', 'ux', 'm/s', 0, 2, 1, 1, 'm3/s'],
    ['velocity_y', 'uy', 'm/s', -1, 1, 0, 0, 'm3/s'],
  ] as const;
  const fieldDatasets = fields.map(([fieldName, variableId, unit]) => ({
    variable_id: variableId,
    field_name: fieldName,
    dataset_path: `/Function/${fieldName}/0`,
    unit,
    domain_tag: 'liquid',
  }));
  const fieldSummaries = fields.map(
    ([
      fieldName,
      variableId,
      unit,
      minimum,
      maximum,
      mean,
      integral,
      integralUnit,
    ]) => ({
      field_name: fieldName,
      variable_id: variableId,
      unit,
      domain_tag: 'liquid',
      association: 'mesh_nodes',
      sample_count: 4,
      minimum,
      maximum,
      mean,
      integral,
      integration_measure: 'domain_area',
      integral_unit: integralUnit,
    }),
  );
  const response = spatialSidecarResponseSchema.parse({
    protocol_version: 'spatial-sidecar-v1',
    request_id: requestId,
    status: 'ok',
    operation: 'planar_stokes',
    metadata: {
      sidecar_version: '0.2.0',
      protocol_version: 'spatial-sidecar-v1',
      python_version: '3.12.0',
      gmsh_version: input.mesh.gmsh_version,
      dolfinx_version: '0.10.0',
      petsc_version: '3.23.0',
    },
    model_input_contract_version: input.contract_version,
    model_input_sha256: spatialModelInputV2Sha256(input),
    field_representation: 'lagrange_p1_interpolation',
    mesh: {
      refinement_factor: input.mesh.refinement_factor,
      format: 'msh4',
      path: 'mesh-1.msh',
      sha256: input.mesh.sha256,
      bytes: mesh.byteLength,
      node_count: 4,
      cell_count: 2,
      min_quality: 0.5,
    },
    field_datasets: fieldDatasets,
    physical_groups: input.mesh.physical_groups,
    diagnostics: {
      inlet_flow_m2_s_per_depth: 1e-7,
      outlet_flow_m2_s_per_depth: 1e-7,
      relative_flow_balance: 0,
      mean_inlet_pressure_pa: 10,
      mean_outlet_pressure_pa: 0,
      pressure_drop_pa: 10,
      divergence_l2_per_s: 0,
      linear_iterations: 1,
      linear_converged_reason: 4,
    },
    solution_artifacts: [
      {
        path: 'stokes-solution.xdmf',
        format: 'xdmf',
        sha256: sha256(xdmf),
        bytes: xdmf.byteLength,
      },
      {
        path: 'stokes-solution.h5',
        format: 'hdf5',
        sha256: sha256(hdf5),
        bytes: hdf5.byteLength,
      },
    ],
    field_summaries: fieldSummaries,
    solver_diagnostics: [
      {
        solver_id: 'stokes_saddle_point',
        method: 'petsc_preonly_lu',
        status: 'converged',
        iterations: 1,
        converged_reason: 4,
      },
    ],
  });
  return { response, mesh, hdf5, xdmf };
}

describe('development Stokes worker adapter', () => {
  it('runs a durable worker claim through owner-scoped field serving', async () => {
    const root = await mkdtemp(join(tmpdir(), 'metrev-stokes-worker-'));
    const meshBytes = Buffer.from('synthetic Stokes msh4 payload');
    const input = modelInput(meshBytes);
    const payloads = responseFor(input, '00000000-0000-4000-8000-000000000001');
    const meshStore = new LocalSpatialArtifactStore({
      rootDirectory: join(root, 'meshes'),
    });
    const fieldStore = new LocalSpatialFieldArtifactStore({
      rootDirectory: join(root, 'fields'),
    });
    let artifactDirectory = '';
    const sidecarRunner: StokesSidecarRunner = async (
      request: SpatialSidecarRequest,
      options: SidecarProcessOptions,
    ) => {
      expect(request.operation).toBe('planar_stokes');
      await mkdir(options.artifactRoot, { recursive: true });
      artifactDirectory = await mkdtemp(join(options.artifactRoot, 'run-'));
      await Promise.all([
        writeFile(join(artifactDirectory, 'mesh-1.msh'), payloads.mesh),
        writeFile(join(artifactDirectory, 'stokes-solution.h5'), payloads.hdf5),
        writeFile(
          join(artifactDirectory, 'stokes-solution.xdmf'),
          payloads.xdmf,
        ),
      ]);
      return {
        response: responseFor(input, request.request_id).response,
        artifactDirectory,
      };
    };
    const executor = new StokesDevelopmentExecutor({
      pythonExecutable: 'python3',
      moduleDirectory: root,
      artifactRoot: join(root, 'sidecar-output'),
      timeoutMs: 15_000,
      meshArtifactStore: meshStore,
      fieldArtifactStore: fieldStore,
      sidecarRunner,
    });
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet({
      owner_id: ownerId,
      evaluation_id: null,
      idempotency_key: 'stokes-development-worker-test',
      model_id: input.model_id,
      system: input.system,
      dimension: input.dimension,
      input_contract_version: input.contract_version,
      input_sha256: spatialModelInputV2Sha256(input),
      solver_version: executor.solverVersion,
      runtime_version: executor.runtimeVersion,
      mesh_request_sha256: input.mesh.input_sha256,
      input_snapshot: input,
    });

    try {
      const cycle = await runSpatialSimulationWorkerCycle({
        repository,
        executor,
        workerId: 'stokes-development-test-worker',
      });
      expect(cycle).toMatchObject({ claimed: 1, completed: 1, failed: 0 });
      const completed = await repository.getOwnedRun(run.id, ownerId);
      expect(completed).toMatchObject({
        status: 'completed',
        result: {
          contract_version: 'spatial-simulation-result-v2',
          fields: [
            { variable_id: 'p', association: 'mesh_nodes' },
            { variable_id: 'ux', association: 'mesh_nodes' },
            { variable_id: 'uy', association: 'mesh_nodes' },
          ],
          convergence: [
            { status: 'not_applicable', iterations: 0, history: [] },
          ],
          linear_solver_diagnostics: [
            {
              solver_id: 'stokes_saddle_point',
              status: 'converged',
              termination_code: 4,
            },
          ],
          conservation_residuals: [
            { balance_id: 'stokes_flow_balance', passed: true },
          ],
        },
      });

      const pressure = completed?.result?.fields.find(
        (field) => field.variable_id === 'p',
      );
      if (!pressure || pressure.value_type !== 'scalar')
        throw new Error('Expected the persisted Stokes pressure field');
      const app = await buildApp({
        repository: new MemoryEvaluationRepository(),
        spatialSimulationRunRepository: repository,
        spatialFieldArtifactReader: fieldStore,
        rateLimit: false,
        sessionResolver: async (): Promise<SessionActor> => ({
          userId: ownerId,
          email: 'stokes-owner@example.invalid',
          role: 'ANALYST',
          sessionId: 'stokes-development-session',
          sessionToken: 'stokes-development-token',
        }),
      });
      try {
        const path = `/api/spatial-simulations/${run.id}/fields/${pressure.field_id}`;
        const response = await app.inject({ method: 'GET', url: path });
        expect(response.statusCode).toBe(200);
        expect(response.rawPayload).toEqual(payloads.hdf5);
        expect(sha256(response.rawPayload)).toBe(pressure.artifact.sha256);
      } finally {
        await app.close();
      }
      const otherOwnerApp = await buildApp({
        repository: new MemoryEvaluationRepository(),
        spatialSimulationRunRepository: repository,
        spatialFieldArtifactReader: fieldStore,
        rateLimit: false,
        sessionResolver: async () => ({
          userId: 'another-stokes-owner',
          email: 'another-owner@example.invalid',
          role: 'ANALYST' as const,
          sessionId: 'other-stokes-session',
          sessionToken: 'other-stokes-token',
        }),
      });
      try {
        const path = `/api/spatial-simulations/${run.id}/fields/${pressure.field_id}`;
        expect(
          (await otherOwnerApp.inject({ method: 'GET', url: path })).statusCode,
        ).toBe(404);
      } finally {
        await otherOwnerApp.close();
      }
      await expect(
        readFile(join(artifactDirectory, 'mesh-1.msh')),
      ).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects physics and output declarations outside the restricted Stokes scope', () => {
    const executor = new StokesDevelopmentExecutor({
      pythonExecutable: 'python3',
      moduleDirectory: '/tmp',
      artifactRoot: '/tmp/artifacts',
      timeoutMs: 15_000,
      meshArtifactStore: new LocalSpatialArtifactStore({
        rootDirectory: '/tmp/stokes-meshes',
      }),
      fieldArtifactStore: new LocalSpatialFieldArtifactStore({
        rootDirectory: '/tmp/stokes-fields',
      }),
    });
    const stokes = stokesChannelInput();
    expect(executor.supports(spatialModelInputV2Schema.parse(stokes))).toBe(
      true,
    );
    const darcy = darcyTransportInput();
    expect(executor.supports(spatialModelInputV2Schema.parse(darcy))).toBe(
      false,
    );
    expect(
      executor.supports(
        spatialModelInputV2Schema.parse({
          ...stokes,
          species: [
            {
              id: 'substrate',
              valence: {
                value: 0,
                unit: '1',
                source_kind: 'test_fixture',
                source_ref: 'test-fixture://stokes',
              },
              molecular_diffusivity: {
                kind: 'constant',
                value: {
                  value: 1e-9,
                  unit: 'm2/s',
                  source_kind: 'test_fixture',
                  source_ref: 'test-fixture://stokes',
                },
              },
            },
          ],
        }),
      ),
    ).toBe(false);
  });
});
