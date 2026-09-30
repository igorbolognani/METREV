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
import { StokesDevelopmentExecutor } from '../../packages/spatial-worker/src/stokes-development-executor';
import type { StokesSidecarRunner } from '../../packages/spatial-worker/src/stokes-development-executor';
import { runSpatialSimulationWorkerCycle } from '../../packages/spatial-worker/src/worker';
import {
  darcyTransportInput,
  digestRequest,
  stokesChannelInput,
  stokesTransportInput,
} from '../fixtures/spatial-input-v2';

const ownerId = 'stokes-development-owner';

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function modelInput(meshBytes: Buffer, withTransport = false) {
  const candidate = withTransport
    ? stokesTransportInput()
    : stokesChannelInput();
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
  ] as Array<
    readonly [string, string, string, number, number, number, number, string]
  >;
  if (input.stokes_transport_development)
    fields.push(['concentration', 'c', 'mol/m3', 1, 2, 1.5, 1.5, 'mol/m']);
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
    ...(input.stokes_transport_development
      ? {
          transport_diagnostics: {
            inlet_species_rate_mol_m_s_per_depth: -1e-8,
            outlet_species_rate_mol_m_s_per_depth: 1e-8,
            wall_species_rate_mol_m_s_per_depth: 0,
            relative_species_balance: 0,
            peclet_number: 0.1,
            minimum_concentration_mol_m3: 1,
            maximum_concentration_mol_m3: 2,
            linear_iterations: 1,
            linear_converged_reason: 4,
          },
        }
      : {}),
    field_summaries: fieldSummaries,
    solver_diagnostics: [
      {
        solver_id: 'stokes_saddle_point',
        method: 'petsc_preonly_lu',
        status: 'converged',
        iterations: 1,
        converged_reason: 4,
      },
      ...(input.stokes_transport_development
        ? [
            {
              solver_id: 'neutral_scalar_transport',
              method: 'petsc_preonly_lu',
              status: 'converged',
              iterations: 1,
              converged_reason: 4,
            },
          ]
        : []),
    ],
  });
  return { response, mesh, hdf5, xdmf };
}

describe('development Stokes worker adapter', () => {
  it.each([false, true])(
    'runs a durable worker claim through owner-scoped field serving (transport=%s)',
    async (withTransport) => {
      const root = await mkdtemp(join(tmpdir(), 'metrev-stokes-worker-'));
      const meshBytes = Buffer.from('synthetic Stokes msh4 payload');
      const input = modelInput(meshBytes, withTransport);
      const payloads = responseFor(
        input,
        '00000000-0000-4000-8000-000000000001',
      );
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
          writeFile(
            join(artifactDirectory, 'stokes-solution.h5'),
            payloads.hdf5,
          ),
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
              ...(withTransport
                ? [{ variable_id: 'c', association: 'mesh_nodes' }]
                : []),
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
              ...(withTransport
                ? [
                    {
                      solver_id: 'neutral_scalar_transport',
                      status: 'converged',
                      termination_code: 4,
                    },
                  ]
                : []),
            ],
            conservation_residuals: [
              { balance_id: 'stokes_flow_balance', passed: true },
              ...(withTransport
                ? [{ balance_id: 'stokes_species_balance', passed: true }]
                : []),
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
          if (withTransport) {
            const scalar = completed?.result?.fields.find(
              (field) => field.variable_id === 'c',
            );
            expect(scalar).toMatchObject({
              unit: 'mol/m3',
              summary: { mean: 1.5, integral_unit: 'mol/m' },
            });
            const scalarRead = await app.inject({
              method: 'GET',
              url: `/api/spatial-simulations/${run.id}/fields/${scalar!.field_id}`,
            });
            expect(scalarRead.statusCode).toBe(200);
            expect(scalarRead.rawPayload).toEqual(payloads.hdf5);
          }
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
            (await otherOwnerApp.inject({ method: 'GET', url: path }))
              .statusCode,
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
    },
  );

  it.skipIf(!process.env.METREV_SPATIAL_DOCKER_IMAGE).each([false, true])(
    'executes the pinned native Stokes sidecar through the worker and authenticated API (transport=%s)',
    async (withTransport) => {
      const nativeImage = process.env.METREV_SPATIAL_DOCKER_IMAGE;
      if (!nativeImage || !/^[A-Za-z0-9._:/-]+$/.test(nativeImage))
        throw new Error('A valid pinned sidecar image is required');

      const root = await mkdtemp(
        join(tmpdir(), 'metrev-stokes-native-worker-'),
      );
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
          withTransport ? stokesTransportInput() : stokesChannelInput(),
        );
        inputCandidate.mesh.input_sha256 = digestRequest(
          inputCandidate.mesh.request,
        );
        const setup = inputCandidate.stokes_development;
        if (!setup) throw new Error('Stokes input fixture has no setup');
        setup.inlet.traction_pa[1].value = withTransport ? 0 : 1e-7;
        if (withTransport) {
          const transport = inputCandidate.stokes_transport_development!;
          transport.inlet.concentration_mol_m3.value = 1;
          transport.outlet.concentration_mol_m3.value = 2;
        }
        const meshRun = await runSpatialSidecar(
          inputCandidate.mesh.request,
          sidecarOptions,
        );
        if (
          meshRun.response.status !== 'ok' ||
          meshRun.response.operation !== 'planar_mesh' ||
          !meshRun.artifactDirectory
        )
          throw new Error('Pinned sidecar failed to generate the Stokes mesh');
        const meshArtifact = meshRun.response.artifacts.find(
          ({ refinement_factor }) =>
            refinement_factor === inputCandidate.mesh.refinement_factor,
        );
        if (!meshArtifact)
          throw new Error('Pinned sidecar omitted the Stokes mesh');
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

        const meshStore = new LocalSpatialArtifactStore({
          rootDirectory: join(root, 'meshes'),
        });
        const fieldStore = new LocalSpatialFieldArtifactStore({
          rootDirectory: join(root, 'fields'),
        });
        const nativeExecutor = new StokesDevelopmentExecutor({
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
          idempotency_key: 'stokes-native-worker-test',
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
          workerId: 'stokes-native-test-worker',
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
              { solver_id: 'stokes_saddle_point', status: 'converged' },
              ...(withTransport
                ? [
                    {
                      solver_id: 'neutral_scalar_transport',
                      status: 'converged',
                    },
                  ]
                : []),
            ],
            conservation_residuals: [
              { balance_id: 'stokes_flow_balance', passed: true },
              ...(withTransport
                ? [{ balance_id: 'stokes_species_balance', passed: true }]
                : []),
            ],
          },
        });
        const pressure = completed?.result?.fields.find(
          ({ variable_id }) => variable_id === (withTransport ? 'c' : 'p'),
        );
        if (!pressure || pressure.value_type !== 'scalar')
          throw new Error('Native Stokes run omitted the pressure field');

        let actorId = ownerId;
        app = await buildApp({
          repository: new MemoryEvaluationRepository(),
          spatialSimulationRunRepository: repository,
          spatialFieldArtifactReader: fieldStore,
          rateLimit: false,
          sessionResolver: async () => ({
            userId: actorId,
            email: 'stokes-native-owner@example.invalid',
            role: 'ANALYST',
            sessionId: 'stokes-native-session',
            sessionToken: 'stokes-native-token',
          }),
        });
        const path = `/api/spatial-simulations/${run.id}/fields/${pressure.field_id}`;
        const apiResponse = await app.inject({ method: 'GET', url: path });
        expect(apiResponse.statusCode).toBe(200);
        expect(apiResponse.rawPayload.byteLength).toBe(pressure.artifact.bytes);
        expect(sha256(apiResponse.rawPayload)).toBe(pressure.artifact.sha256);
        actorId = 'different-stokes-owner';
        expect(
          (await app.inject({ method: 'GET', url: path })).statusCode,
        ).toBe(404);
      } finally {
        await app?.close();
        await rm(root, { recursive: true, force: true });
      }
    },
    180_000,
  );

  it('rejects missing fields and inconsistent scalar balance, extrema and solver outcomes', () => {
    const input = modelInput(
      Buffer.from('synthetic Stokes msh4 payload'),
      true,
    );
    const payload = responseFor(input, '00000000-0000-4000-8000-000000000001');
    if (
      payload.response.status !== 'ok' ||
      payload.response.operation !== 'planar_stokes'
    )
      throw new Error('expected Stokes response');
    for (const variant of [
      'missing_field',
      'balance',
      'extrema',
      'solver',
      'missing_diagnostics',
    ]) {
      const response = structuredClone(payload.response);
      if (variant === 'missing_field') response.field_datasets.pop();
      if (variant === 'balance')
        response.transport_diagnostics!.inlet_species_rate_mol_m_s_per_depth =
          -2e-8;
      if (variant === 'extrema')
        response.transport_diagnostics!.maximum_concentration_mol_m3 = 3;
      if (variant === 'solver') response.solver_diagnostics!.pop();
      if (variant === 'missing_diagnostics')
        delete response.transport_diagnostics;
      expect(
        spatialSidecarResponseSchema.safeParse(response).success,
        variant,
      ).toBe(false);
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
