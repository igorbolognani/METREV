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
import { runSpatialSidecar } from '@metrev/spatial-sidecar-client';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../apps/api-server/src/app';
import {
  darcyTransportInput,
  digestRequest,
} from '../fixtures/spatial-input-v2';
import { DarcyDevelopmentExecutor } from '../../packages/spatial-worker/src/darcy-development-executor';
import type { SpatialSidecarRunner } from '../../packages/spatial-worker/src/darcy-development-executor';
import { runSpatialSimulationWorkerCycle } from '../../packages/spatial-worker/src/worker';

const ownerId = 'darcy-development-owner';

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function modelInput(meshBytes: Buffer) {
  const candidate = darcyTransportInput();
  candidate.mesh.sha256 = sha256(meshBytes);
  return spatialModelInputV2Schema.parse(candidate);
}

function responseFor(input: ReturnType<typeof modelInput>, requestId: string) {
  const modelHash = spatialModelInputV2Sha256(input);
  const hdf5 = Buffer.from('synthetic hdf5 payload');
  const xdmf = Buffer.from('synthetic xdmf payload');
  const mesh = Buffer.from('synthetic msh4 payload');
  const fields = [
    ['pressure', 'p', 'Pa', 0, 10, 5, 5, 'Pa*m2'],
    ['velocity_x', 'ux', 'm/s', 1e-5, 1e-5, 1e-5, 1e-5, 'm3/s'],
    ['velocity_y', 'uy', 'm/s', 0, 0, 0, 0, 'm3/s'],
    ['concentration', 'neutral_tracer_c', 'mol/m3', 1, 2, 1.5, 1.5, 'mol/m'],
  ] as const;
  const datasets = fields.map(([field_name, variable_id, unit]) => ({
    variable_id,
    field_name,
    dataset_path: `/Function/${field_name}/0`,
    unit,
    domain_tag: 'porous',
  }));
  const summaries = fields.map(
    ([
      field_name,
      variable_id,
      unit,
      minimum,
      maximum,
      mean,
      integral,
      integral_unit,
    ]) => ({
      field_name,
      variable_id,
      unit,
      domain_tag: 'porous',
      association: 'mesh_nodes',
      sample_count: 4,
      minimum,
      maximum,
      mean,
      integral,
      integration_measure: 'domain_area',
      integral_unit,
    }),
  );
  const response = spatialSidecarResponseSchema.parse({
    protocol_version: 'spatial-sidecar-v1',
    request_id: requestId,
    status: 'ok',
    operation: 'planar_darcy_transport',
    metadata: {
      sidecar_version: '0.2.0',
      protocol_version: 'spatial-sidecar-v1',
      python_version: '3.12.0',
      gmsh_version: input.mesh.gmsh_version,
      dolfinx_version: '0.10.0',
      petsc_version: '3.23.0',
    },
    model_input_contract_version: input.contract_version,
    model_input_sha256: modelHash,
    field_representation: 'lagrange_p1_interpolation',
    mesh: {
      refinement_factor: input.mesh.refinement_factor,
      format: 'msh4',
      path: 'mesh-1.msh',
      sha256: sha256(mesh),
      bytes: mesh.byteLength,
      node_count: 4,
      cell_count: 2,
      min_quality: 0.5,
    },
    field_datasets: datasets,
    physical_groups: input.mesh.physical_groups,
    diagnostics: {
      inlet_flow_m2_s_per_depth: 1e-7,
      outlet_flow_m2_s_per_depth: -1e-7,
      relative_flow_balance: 0,
      mean_inlet_pressure_pa: 10,
      mean_outlet_pressure_pa: 0,
      pressure_drop_pa: 10,
      divergence_l2_per_s: 0,
      darcy_linear_iterations: 1,
      darcy_linear_converged_reason: 4,
      inlet_species_rate_mol_m_s_per_depth: -1e-7,
      outlet_species_rate_mol_m_s_per_depth: 1e-7,
      wall_species_rate_mol_m_s_per_depth: 0,
      relative_species_balance: 0,
      peclet_number: 1,
      minimum_concentration_mol_m3: 1,
      maximum_concentration_mol_m3: 2,
      transport_linear_iterations: 1,
      transport_linear_converged_reason: 4,
    },
    solution_artifacts: [
      {
        path: 'darcy-transport-solution.xdmf',
        format: 'xdmf',
        sha256: sha256(xdmf),
        bytes: xdmf.byteLength,
      },
      {
        path: 'darcy-transport-solution.h5',
        format: 'hdf5',
        sha256: sha256(hdf5),
        bytes: hdf5.byteLength,
      },
    ],
    field_summaries: summaries,
    solver_diagnostics: [
      {
        solver_id: 'darcy_pressure',
        method: 'petsc_preonly_lu',
        status: 'converged',
        iterations: 1,
        converged_reason: 4,
      },
      {
        solver_id: 'neutral_scalar_transport',
        method: 'petsc_preonly_lu',
        status: 'converged',
        iterations: 1,
        converged_reason: 4,
      },
    ],
  });
  return { response, mesh, hdf5, xdmf };
}

describe('development Darcy transport worker adapter', () => {
  it('runs through a durable worker claim and stores an input-bound result', async () => {
    const root = await mkdtemp(join(tmpdir(), 'metrev-darcy-worker-'));
    const meshBytes = Buffer.from('synthetic msh4 payload');
    const input = modelInput(meshBytes);
    const payloads = responseFor(input, '00000000-0000-4000-8000-000000000001');
    const meshStore = new LocalSpatialArtifactStore({
      rootDirectory: join(root, 'meshes'),
    });
    const fieldStore = new LocalSpatialFieldArtifactStore({
      rootDirectory: join(root, 'fields'),
    });
    let artifactDirectory = '';
    const sidecarRunner: SpatialSidecarRunner = async (
      request: SpatialSidecarRequest,
      options: SidecarProcessOptions,
    ) => {
      expect(request.operation).toBe('planar_darcy_transport');
      await mkdir(options.artifactRoot, { recursive: true });
      artifactDirectory = await mkdtemp(join(options.artifactRoot, 'run-'));
      await Promise.all([
        writeFile(join(artifactDirectory, 'mesh-1.msh'), payloads.mesh),
        writeFile(
          join(artifactDirectory, 'darcy-transport-solution.h5'),
          payloads.hdf5,
        ),
        writeFile(
          join(artifactDirectory, 'darcy-transport-solution.xdmf'),
          payloads.xdmf,
        ),
      ]);
      return {
        response: responseFor(input, request.request_id).response,
        artifactDirectory,
      };
    };
    const executor = new DarcyDevelopmentExecutor({
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
      idempotency_key: 'darcy-development-worker-test',
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
        workerId: 'darcy-development-test-worker',
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
            { variable_id: 'neutral_tracer_c', association: 'mesh_nodes' },
          ],
          convergence: [
            { status: 'not_applicable', iterations: 0, history: [] },
          ],
          linear_solver_diagnostics: [
            {
              solver_id: 'darcy_pressure',
              status: 'converged',
              termination_code: 4,
            },
            {
              solver_id: 'neutral_scalar_transport',
              status: 'converged',
              termination_code: 4,
            },
          ],
          conservation_residuals: [
            { balance_id: 'darcy_flow_balance', passed: true },
            { balance_id: 'neutral_species_mass_balance', passed: true },
          ],
        },
      });

      const firstField = completed?.result?.fields[0];
      if (!firstField || firstField.value_type !== 'scalar')
        throw new Error('Expected a persisted scalar field');
      const stream = await fieldStore.readField({
        ownerId,
        runId: run.id,
        fieldId: firstField.field_id,
        uri: firstField.artifact.uri,
        datasetPath: firstField.artifact.dataset_path,
      });
      const chunks: Buffer[] = [];
      for await (const chunk of stream)
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      expect(Buffer.concat(chunks)).toEqual(payloads.hdf5);
      await expect(
        fieldStore.readField({
          ownerId: 'different-owner',
          runId: run.id,
          fieldId: firstField.field_id,
          uri: firstField.artifact.uri,
          datasetPath: firstField.artifact.dataset_path,
        }),
      ).rejects.toMatchObject({ code: 'integrity_failure' });

      let actor: SessionActor = {
        userId: ownerId,
        email: 'darcy-owner@example.invalid',
        role: 'ANALYST',
        sessionId: 'darcy-development-session',
        sessionToken: 'darcy-development-token',
      };
      const app = await buildApp({
        repository: new MemoryEvaluationRepository(),
        spatialSimulationRunRepository: repository,
        spatialFieldArtifactReader: fieldStore,
        rateLimit: false,
        sessionResolver: async () => actor,
      });
      try {
        const path = `/api/spatial-simulations/${run.id}/fields/${firstField.field_id}`;
        const apiResponse = await app.inject({ method: 'GET', url: path });
        expect(apiResponse.statusCode).toBe(200);
        expect(apiResponse.rawPayload).toEqual(payloads.hdf5);

        actor = { ...actor, userId: 'different-owner' };
        expect(
          (await app.inject({ method: 'GET', url: path })).statusCode,
        ).toBe(404);
      } finally {
        await app.close();
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

  it.skipIf(!process.env.METREV_SPATIAL_DOCKER_IMAGE)(
    'executes the pinned native sidecar through the worker and authenticated API',
    async () => {
      const nativeImage = process.env.METREV_SPATIAL_DOCKER_IMAGE;
      if (!nativeImage || !/^[A-Za-z0-9._:/-]+$/.test(nativeImage))
        throw new Error('A valid pinned sidecar image is required');

      const root = await mkdtemp(join(tmpdir(), 'metrev-darcy-native-worker-'));
      let app: Awaited<ReturnType<typeof buildApp>> | undefined;
      try {
        const artifactRoot = join(root, 'sidecar-output');
        await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
        const pythonShim = join(root, 'docker-python');
        const shellQuote = (value: string) =>
          `'${value.replaceAll("'", "'\\''")}'`;
        await writeFile(
          pythonShim,
          [
            '#!/bin/sh',
            'set -u',
            'if [ "${1:-}" != "-m" ] || [ "${2:-}" != "metrev_spatial" ]; then exit 64; fi',
            'shift 2',
            'output_dir="${2:?missing sidecar output directory}"',
            'log_id="${output_dir##*/}"',
            `log_root=${shellQuote(root)}`,
            'stdout_file="$log_root/$log_id.stdout"',
            'stderr_file="$log_root/$log_id.stderr"',
            `docker run --pull=never --rm --interactive --network none --cpus=2 --memory=4g --pids-limit=256 --user "$(id -u):$(id -g)" --env HOME=/tmp --env XDG_CACHE_HOME=/tmp/.cache --mount ${shellQuote(`type=bind,source=${artifactRoot},target=${artifactRoot}`)} ${shellQuote(nativeImage)} "$@" > "$stdout_file" 2> "$stderr_file"`,
            'status=$?',
            'cp "$stdout_file" "$log_root/latest.stdout"',
            'cp "$stderr_file" "$log_root/latest.stderr"',
            'cat "$stdout_file"',
            'cat "$stderr_file" >&2',
            'exit "$status"',
            '',
          ].join('\n'),
          { mode: 0o700 },
        );

        const sidecarOptions = {
          pythonExecutable: pythonShim,
          moduleDirectory: root,
          artifactRoot,
          timeoutMs: 120_000,
        };
        const inputCandidate = spatialModelInputV2Schema.parse(
          darcyTransportInput(),
        );
        inputCandidate.geometry.layers[0].width_m.value = 0.01;
        inputCandidate.geometry.target_size_m.value = 0.00025;
        inputCandidate.mesh.request.mesh.layers[0].width_m.value = 0.01;
        inputCandidate.mesh.request.mesh.target_size_m.value = 0.00025;
        inputCandidate.mesh.input_sha256 = digestRequest(
          inputCandidate.mesh.request,
        );
        const meshRun = await runSpatialSidecar(
          inputCandidate.mesh.request,
          sidecarOptions,
        );
        if (
          meshRun.response.status !== 'ok' ||
          meshRun.response.operation !== 'planar_mesh' ||
          !meshRun.artifactDirectory
        )
          throw new Error(
            'Pinned sidecar failed to generate the selected mesh',
          );
        const meshArtifact = meshRun.response.artifacts.find(
          ({ refinement_factor }) => refinement_factor === 1,
        );
        if (!meshArtifact)
          throw new Error('Pinned sidecar omitted mesh level 1');
        const meshBytes = await readFile(
          join(meshRun.artifactDirectory, meshArtifact.path),
        );
        const gmshVersion = meshRun.response.metadata.gmsh_version;
        const sidecarVersion = meshRun.response.metadata.sidecar_version;
        if (!gmshVersion || !sidecarVersion)
          throw new Error('Pinned sidecar omitted runtime versions');

        inputCandidate.mesh.sha256 = sha256(meshBytes);
        inputCandidate.mesh.gmsh_version = gmshVersion;
        inputCandidate.mesh.sidecar_version = sidecarVersion;
        inputCandidate.mesh.physical_groups = meshRun.response.physical_groups;
        inputCandidate.mesh.component_map = meshRun.response.component_map;
        inputCandidate.mesh.interfaces = meshRun.response.interfaces;
        const input = spatialModelInputV2Schema.parse(inputCandidate);
        const permeability = input.material_fields.find(
          ({ parameter_id }) => parameter_id === 'hydraulic_permeability_m2',
        );
        if (!permeability || permeability.field.kind !== 'constant')
          throw new Error('Darcy input is missing constant permeability');
        permeability.field.value.value = 1e-12;
        const inletPressure = input.darcy_development?.inlet.pressure_pa;
        if (!inletPressure)
          throw new Error('Darcy input is missing inlet pressure');
        inletPressure.value = 1;

        const meshStore = new LocalSpatialArtifactStore({
          rootDirectory: join(root, 'meshes'),
        });
        const fieldStore = new LocalSpatialFieldArtifactStore({
          rootDirectory: join(root, 'fields'),
        });
        const nativeExecutor = new DarcyDevelopmentExecutor({
          ...sidecarOptions,
          meshArtifactStore: meshStore,
          fieldArtifactStore: fieldStore,
        });
        const executionErrors: unknown[] = [];
        const executor = {
          solverVersion: nativeExecutor.solverVersion,
          runtimeVersion: nativeExecutor.runtimeVersion,
          supports: nativeExecutor.supports.bind(nativeExecutor),
          execute: async (
            ...args: Parameters<typeof nativeExecutor.execute>
          ) => {
            try {
              return await nativeExecutor.execute(...args);
            } catch (error) {
              executionErrors.push(error);
              throw error;
            }
          },
        };
        const repository = new MemorySpatialSimulationRunRepository();
        const { run } = await repository.createOrGet({
          owner_id: ownerId,
          evaluation_id: null,
          idempotency_key: 'darcy-native-worker-test',
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
        const cycle = await runSpatialSimulationWorkerCycle({
          repository,
          executor,
          workerId: 'darcy-native-test-worker',
        });
        let nativeSidecarLogs = '';
        if (cycle.failed > 0) {
          const [stdout, stderr] = await Promise.all([
            readFile(join(root, 'latest.stdout'), 'utf8').catch(
              () => 'unavailable',
            ),
            readFile(join(root, 'latest.stderr'), 'utf8').catch(
              () => 'unavailable',
            ),
          ]);
          nativeSidecarLogs = `\nNative sidecar stdout:\n${stdout.slice(-4_000)}\nNative sidecar stderr:\n${stderr.slice(-4_000)}`;
        }
        expect(
          cycle,
          `Native worker error: ${
            executionErrors[0] instanceof Error
              ? (executionErrors[0].stack ?? executionErrors[0].message)
              : String(executionErrors[0] ?? 'unknown failure')
          }${nativeSidecarLogs}`,
        ).toMatchObject({ claimed: 1, completed: 1, failed: 0 });
        const completed = await repository.getOwnedRun(run.id, ownerId);
        expect(completed).toMatchObject({
          status: 'completed',
          result: {
            contract_version: 'spatial-simulation-result-v2',
            linear_solver_diagnostics: [
              { solver_id: 'darcy_pressure', status: 'converged' },
              { solver_id: 'neutral_scalar_transport', status: 'converged' },
            ],
            conservation_residuals: [
              { balance_id: 'darcy_flow_balance', passed: true },
              { balance_id: 'neutral_species_mass_balance', passed: true },
            ],
          },
        });
        const field = completed?.result?.fields.find(
          ({ variable_id }) => variable_id === 'neutral_tracer_c',
        );
        if (!field || field.value_type !== 'scalar')
          throw new Error('Native run omitted neutral scalar field');

        app = await buildApp({
          repository: new MemoryEvaluationRepository(),
          spatialSimulationRunRepository: repository,
          spatialFieldArtifactReader: fieldStore,
          rateLimit: false,
          sessionResolver: async () => ({
            userId: ownerId,
            email: 'darcy-native-owner@example.invalid',
            role: 'ANALYST',
            sessionId: 'darcy-native-session',
            sessionToken: 'darcy-native-token',
          }),
        });
        const response = await app.inject({
          method: 'GET',
          url: `/api/spatial-simulations/${run.id}/fields/${field.field_id}`,
        });
        expect(response.statusCode).toBe(200);
        expect(response.rawPayload.byteLength).toBe(field.artifact.bytes);
        expect(sha256(response.rawPayload)).toBe(field.artifact.sha256);
      } finally {
        await app?.close();
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it('does not admit vector or broader requested-output variants', () => {
    const input = modelInput(Buffer.from('msh'));
    const candidate = spatialModelInputV2Schema.parse({
      ...input,
      vector_outputs: [
        {
          id: 'velocity',
          components: [
            { axis: 'x', variable_id: 'ux' },
            { axis: 'y', variable_id: 'uy' },
          ],
        },
      ],
    });
    const executor = new DarcyDevelopmentExecutor({
      pythonExecutable: 'python3',
      moduleDirectory: '/unused',
      artifactRoot: '/unused',
      timeoutMs: 15_000,
      meshArtifactStore: new LocalSpatialArtifactStore({
        rootDirectory: '/tmp/metrev-unused-mesh-store',
      }),
      fieldArtifactStore: new LocalSpatialFieldArtifactStore({
        rootDirectory: '/tmp/metrev-unused-field-store',
      }),
      sidecarRunner: async () => {
        throw new Error('Unsupported input must never launch the sidecar');
      },
    });
    expect(executor.supports(input)).toBe(true);
    expect(executor.supports(candidate)).toBe(false);
  });
});
