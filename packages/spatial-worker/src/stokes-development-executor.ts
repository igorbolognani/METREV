import { lstat, mkdir, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

import {
  spatialModelInputV2Schema,
  spatialModelInputV2Sha256,
  spatialSimulationResultForInputSchema,
  type SpatialModelInputV2,
  type SpatialSidecarRequest,
  type SpatialSidecarResponse,
  type SpatialSimulationResult,
} from '@metrev/domain-contracts';
import {
  LocalSpatialArtifactStore,
  LocalSpatialFieldArtifactStore,
} from '@metrev/spatial-artifact-store';
import {
  planarStokesRequestFromInput,
  runSpatialSidecar,
  type SidecarProcessOptions,
  type SidecarProcessResult,
} from '@metrev/spatial-sidecar-client';

import type {
  SpatialSimulationExecutionContext,
  SpatialSimulationExecutor,
} from './worker';
import { normalizeSpatialSimulationExecutionError } from './execution-error';

type StokesResponse = Extract<
  SpatialSidecarResponse,
  { operation: 'planar_stokes'; status: 'ok' }
>;

export type StokesSidecarRunner = (
  request: SpatialSidecarRequest,
  options: SidecarProcessOptions,
) => Promise<SidecarProcessResult>;

export interface StokesDevelopmentExecutorOptions {
  pythonExecutable: string;
  moduleDirectory: string;
  artifactRoot: string;
  timeoutMs: number;
  meshArtifactStore: LocalSpatialArtifactStore;
  fieldArtifactStore: LocalSpatialFieldArtifactStore;
  /** Override only for isolated tests; normal runs use the process-isolated client. */
  sidecarRunner?: StokesSidecarRunner;
}

const FLOW_BALANCE_TOLERANCE = 1e-8;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function isSupportedStokesInput(input: SpatialModelInputV2): boolean {
  const setup = input.stokes_development;
  if (
    input.dimension !== 2 ||
    input.coordinate_system !== 'cartesian' ||
    input.geometry.layers.length !== 1 ||
    input.geometry.layers[0].kind !== 'bulk_liquid' ||
    !setup ||
    input.darcy_development !== undefined ||
    input.darcy_transport_development !== undefined ||
    input.species.length > 0 ||
    input.reaction_laws.length > 0 ||
    input.initial_conditions.length > 0 ||
    input.boundary_conditions.length > 0 ||
    (input.vector_outputs?.length ?? 0) > 0
  )
    return false;
  const layer = input.geometry.layers[0];
  if (layer.tag !== setup.domain_tag) return false;
  const material = input.material_fields;
  if (
    material.length !== 1 ||
    material[0].domain_tag !== setup.domain_tag ||
    material[0].parameter_id !== setup.viscosity_parameter_id ||
    material[0].field.kind !== 'constant'
  )
    return false;
  const expectedOutputs = [
    setup.pressure_variable,
    setup.velocity_variables.x,
    setup.velocity_variables.y,
  ].sort();
  const requestedOutputs = [...input.requested_outputs].sort();
  return (
    expectedOutputs.length === requestedOutputs.length &&
    expectedOutputs.every(
      (variable, index) => variable === requestedOutputs[index],
    )
  );
}

function artifactPath(directory: string, relativePath: string): string {
  const root = resolve(directory);
  const path = resolve(root, relativePath);
  if (!path.startsWith(`${root}${sep}`))
    throw new Error(
      'Sidecar artifact path escaped its private output directory',
    );
  return path;
}

function domainsFromInput(input: SpatialModelInputV2) {
  const domainEntries = input.geometry.layers.map((layer) => ({
    role: 'domain' as const,
    tag: layer.tag,
    kind: layer.kind,
    physical_group_tag: `region:${layer.tag}`,
    physical_group_id: input.mesh.physical_groups[`region:${layer.tag}`],
    ...(input.mesh.component_map[layer.tag]
      ? { component_id: input.mesh.component_map[layer.tag] }
      : {}),
  }));
  const boundaryEntries = Object.values(input.geometry.boundaries).map(
    (boundary) => ({
      role: 'boundary' as const,
      tag: boundary.tag,
      boundary_kind:
        boundary.role === 'electrode'
          ? ('electrode_contact' as const)
          : boundary.role,
      physical_group_tag: `boundary:${boundary.tag}`,
      physical_group_id: input.mesh.physical_groups[`boundary:${boundary.tag}`],
    }),
  );
  return [...domainEntries, ...boundaryEntries];
}

function assertResponseBindsToInput(
  input: SpatialModelInputV2,
  request: Extract<SpatialSidecarRequest, { operation: 'planar_stokes' }>,
  response: StokesResponse,
): void {
  if (
    response.request_id !== request.request_id ||
    response.model_input_contract_version !== input.contract_version ||
    response.model_input_sha256 !== spatialModelInputV2Sha256(input) ||
    response.mesh.sha256 !== input.mesh.sha256 ||
    response.mesh.refinement_factor !== input.mesh.refinement_factor ||
    response.mesh.format !== input.mesh.format ||
    response.metadata.gmsh_version !== input.mesh.gmsh_version ||
    canonicalJson(response.physical_groups) !==
      canonicalJson(input.mesh.physical_groups)
  )
    throw new Error('Stokes output does not match the admitted input');
  if (
    response.diagnostics.relative_flow_balance > FLOW_BALANCE_TOLERANCE ||
    response.diagnostics.linear_converged_reason <= 0 ||
    response.diagnostics.linear_iterations <= 0 ||
    !response.field_summaries ||
    !response.solver_diagnostics
  )
    throw new Error('Stokes output is missing verified result diagnostics');
}

function resultFromResponse(input: {
  context: SpatialSimulationExecutionContext;
  modelInput: SpatialModelInputV2;
  response: StokesResponse;
  meshUri: string;
  meshSha256: string;
  meshBytes: number;
  fields: SpatialSimulationResult['fields'];
}): SpatialSimulationResult {
  const { context, modelInput: model, response } = input;
  const diagnostics = response.diagnostics;
  const solverDiagnostics = response.solver_diagnostics;
  if (!solverDiagnostics)
    throw new Error('Stokes solver diagnostics are missing');
  const result = {
    contract_version: 'spatial-simulation-result-v2' as const,
    run_id: context.run.id,
    evaluation_id: context.run.evaluation_id,
    model_id: context.run.model_id,
    system: context.run.system,
    dimension: 2 as const,
    coordinate_system: 'cartesian' as const,
    input_contract_version: context.run.input_contract_version,
    input_sha256: context.run.input_sha256,
    solver_version: context.run.solver_version,
    runtime_version: context.run.runtime_version,
    produced_at: new Date().toISOString(),
    mesh: {
      artifact: {
        uri: input.meshUri,
        sha256: input.meshSha256,
        bytes: input.meshBytes,
        format: 'msh4' as const,
        media_type: 'application/vnd.gmsh.msh',
      },
      dimension: 2 as const,
      geometry_version: model.geometry.geometry_version,
      request_sha256: model.mesh.input_sha256,
      refinement_factor: model.mesh.refinement_factor,
      generated_with: { name: 'gmsh', version: model.mesh.gmsh_version },
      physical_groups: response.physical_groups,
      mesh_quality: {
        node_count: response.mesh.node_count,
        cell_count: response.mesh.cell_count,
        minimum_quality: response.mesh.min_quality,
      },
    },
    domains: domainsFromInput(model),
    scalar_outputs: [],
    fields: input.fields,
    conservation_residuals: [
      {
        balance_id: 'stokes_flow_balance',
        kind: 'other' as const,
        scope: 'global' as const,
        absolute_residual: Math.abs(
          diagnostics.inlet_flow_m2_s_per_depth -
            diagnostics.outlet_flow_m2_s_per_depth,
        ),
        unit: 'm2/s',
        relative_residual: diagnostics.relative_flow_balance,
        tolerance: FLOW_BALANCE_TOLERANCE,
        passed: true,
      },
    ],
    convergence: [
      {
        solver_id: 'nonlinear_coupled_system',
        method: 'not_applicable',
        status: 'not_applicable' as const,
        residual_unit: '1',
        absolute_tolerance: 0,
        relative_tolerance: 0,
        iterations: 0,
        history: [],
        termination_reason: 'linear_system_only',
      },
    ],
    linear_solver_diagnostics: solverDiagnostics.map((solver) => ({
      solver_id: solver.solver_id,
      method: solver.method,
      status: solver.status,
      iterations: solver.iterations,
      termination_reason: 'petsc_ksp_converged',
      termination_code: solver.converged_reason,
    })),
    warnings: [
      {
        code: 'restricted_development_physics',
        severity: 'info' as const,
        message:
          'This result covers one bulk-liquid domain with steady Stokes flow and declared boundary tractions; species transport, porous coupling, electrochemistry, and circuit closure are not evaluated.',
      },
    ],
    unsupported_physics: [],
    artifact_hashes: [
      ...new Set([
        input.meshSha256,
        ...input.fields.map((field) => field.artifact.sha256),
      ]),
    ].sort(),
  };
  return spatialSimulationResultForInputSchema(
    model,
    context.run.input_sha256,
  ).parse(result);
}

/** Development-only adapter for the single bulk-liquid steady Stokes limit. */
export class StokesDevelopmentExecutor implements SpatialSimulationExecutor {
  readonly solverVersion = 'stokes-development-v0.1.0';
  readonly runtimeVersion = 'spatial-sidecar-v1';
  private readonly options: StokesDevelopmentExecutorOptions;
  private readonly sidecarRunner: StokesSidecarRunner;

  constructor(options: StokesDevelopmentExecutorOptions) {
    if (
      !options.pythonExecutable.trim() ||
      !options.moduleDirectory.trim() ||
      !options.artifactRoot.trim() ||
      !Number.isSafeInteger(options.timeoutMs) ||
      options.timeoutMs < 1 ||
      options.timeoutMs > 120_000
    )
      throw new RangeError('Invalid development sidecar process configuration');
    this.options = {
      ...options,
      moduleDirectory: resolve(options.moduleDirectory),
      artifactRoot: resolve(options.artifactRoot),
    };
    this.sidecarRunner = options.sidecarRunner ?? runSpatialSidecar;
  }

  supports(candidate: SpatialModelInputV2): boolean {
    try {
      return isSupportedStokesInput(spatialModelInputV2Schema.parse(candidate));
    } catch {
      return false;
    }
  }

  async execute(
    context: SpatialSimulationExecutionContext,
  ): Promise<SpatialSimulationResult> {
    const model = spatialModelInputV2Schema.parse(context.input);
    if (!this.supports(model))
      throw new RangeError('Input exceeds the Stokes development solver scope');
    const inputHash = spatialModelInputV2Sha256(model);
    if (
      inputHash !== context.run.input_sha256 ||
      model.model_id !== context.run.model_id ||
      model.system !== context.run.system ||
      model.dimension !== context.run.dimension ||
      model.contract_version !== context.run.input_contract_version ||
      model.mesh.input_sha256 !== context.run.mesh_request_sha256 ||
      (context.run.mesh_sha256 !== null &&
        model.mesh.sha256 !== context.run.mesh_sha256)
    )
      throw new Error(
        'Durable run identity does not match the immutable input',
      );

    await context.reportProgress({ status: 'meshing', progress: 25 });
    const request = planarStokesRequestFromInput(model);
    let artifactDirectory: string | null = null;
    try {
      await mkdir(this.options.artifactRoot, { recursive: true, mode: 0o700 });
      const artifactRootStat = await lstat(this.options.artifactRoot);
      if (
        !artifactRootStat.isDirectory() ||
        artifactRootStat.isSymbolicLink() ||
        artifactRootStat.mode & 0o077
      )
        throw new Error('Sidecar output root must be a private directory');
      let sidecar: SidecarProcessResult;
      try {
        sidecar = await this.sidecarRunner(request, {
          pythonExecutable: this.options.pythonExecutable,
          moduleDirectory: this.options.moduleDirectory,
          artifactRoot: this.options.artifactRoot,
          timeoutMs: this.options.timeoutMs,
          signal: context.signal,
        });
      } catch (error) {
        throw normalizeSpatialSimulationExecutionError(error);
      }
      artifactDirectory = sidecar.artifactDirectory;
      if (
        sidecar.response.status !== 'ok' ||
        sidecar.response.operation !== 'planar_stokes' ||
        !artifactDirectory
      )
        throw new Error('Stokes sidecar returned no successful artifacts');
      const response = sidecar.response as StokesResponse;
      assertResponseBindsToInput(model, request, response);
      if (context.signal.aborted)
        throw context.signal.reason ?? new Error('execution aborted');
      await context.reportProgress({
        status: 'solving',
        progress: 70,
        mesh_sha256: response.mesh.sha256,
      });
      await context.reportProgress({ status: 'postprocessing', progress: 85 });

      const meshFilePath = artifactPath(artifactDirectory, response.mesh.path);
      const hdf5Artifact = response.solution_artifacts.find(
        (artifact) => artifact.format === 'hdf5',
      );
      if (!hdf5Artifact)
        throw new Error('Stokes HDF5 field artifact is missing');
      const hdf5Path = artifactPath(artifactDirectory, hdf5Artifact.path);
      const storedMesh = await this.options.meshArtifactStore.storeMesh({
        meshFilePath,
        ownerId: context.ownerId,
        modelInput: model,
        sidecarResponse: response,
      });
      const summaryByVariable = new Map(
        response.field_summaries!.map((summary) => [
          summary.variable_id,
          summary,
        ]),
      );
      const fields = await Promise.all(
        response.field_datasets.map(async (dataset) => {
          const summary = summaryByVariable.get(dataset.variable_id);
          if (!summary) throw new Error('Stokes field summary is missing');
          const field = {
            field_id: `field_${dataset.variable_id}`,
            variable_id: dataset.variable_id,
            value_type: 'scalar' as const,
            unit: dataset.unit,
            association: 'mesh_nodes' as const,
            domain_tags: [dataset.domain_tag],
            artifact: {
              uri: `metrev-artifact://sha256/${hdf5Artifact.sha256}`,
              sha256: hdf5Artifact.sha256,
              bytes: hdf5Artifact.bytes,
              format: 'hdf5' as const,
              media_type: 'application/x-hdf5',
              dataset_path: dataset.dataset_path,
            },
            sampled_at: new Date().toISOString(),
            summary: {
              sample_count: summary.sample_count,
              minimum: summary.minimum,
              maximum: summary.maximum,
              mean: summary.mean,
              integral: summary.integral,
              integral_unit: summary.integral_unit,
              integration_measure: summary.integration_measure,
            },
          };
          await this.options.fieldArtifactStore.storeField({
            sourceFilePath: hdf5Path,
            ownerId: context.ownerId,
            runId: context.run.id,
            field,
          });
          return field;
        }),
      );
      if (context.signal.aborted)
        throw context.signal.reason ?? new Error('execution aborted');
      return resultFromResponse({
        context,
        modelInput: model,
        response,
        meshUri: storedMesh.uri,
        meshSha256: storedMesh.sha256,
        meshBytes: storedMesh.bytes,
        fields,
      });
    } finally {
      if (artifactDirectory)
        await rm(artifactDirectory, { recursive: true, force: true });
    }
  }
}
