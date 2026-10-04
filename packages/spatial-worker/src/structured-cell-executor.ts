import { createHash, randomUUID } from 'node:crypto';
import { readFile, rm, lstat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { z } from 'zod';
import {
  compileStructuredCellEquationGraph,
  structuredCellInputSchema,
  STRUCTURED_CELL_DARCY_PRESSURE_SOLVE_TOLERANCE,
  structuredCellTopology,
  STRUCTURED_CELL_LIMITS,
  spatialRuntimeInputSha256,
  structuredCellGeometrySha256,
  serializeStructuredCellInput,
  serializeStructuredCellGeometry,
  spatialSimulationResultForInputSchema,
  structuredCellFieldObservablesSchema,
  deriveStructuredCellFieldReduction,
  structuredCellMeshRefinementEvidenceSchema,
  validateStructuredCellFieldSamples,
  type SpatialRuntimeInput,
  type SpatialSimulationResult,
} from '@metrev/domain-contracts';
import { LocalSpatialFieldArtifactStore } from '@metrev/spatial-artifact-store';
import {
  runSpatialSidecarProcess,
  type SidecarProcessOptions,
} from '@metrev/spatial-sidecar-client';
import type {
  SpatialSimulationExecutor,
  SpatialSimulationExecutionContext,
} from './worker';
import {
  SpatialSimulationExecutionError,
  SpatialNumericalResultError,
  normalizeSpatialSimulationExecutionError,
} from './execution-error';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const artifactSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_-]{0,100}$/),
    path: z.string().regex(/^[a-z][a-z0-9_-]{0,100}\.json$/),
    sha256: digest,
    bytes: z
      .number()
      .int()
      .positive()
      .max(64 * 1024 * 1024),
  })
  .strict();
const envelopeSchema = z
  .object({
    version: z.literal('structured-cell-fv-v1'),
    protocol_version: z.literal('structured-cell-process-v6'),
    status: z.enum(['prepared', 'converged', 'not_converged']),
    dimension: z.union([z.literal(2), z.literal(3)]),
    request_id: z.string().uuid(),
    input_sha256: digest,
    geometry_sha256: digest,
    artifacts: z.array(artifactSchema).min(1).max(32),
  })
  .passthrough();
const envelopeVersionSchema = z
  .object({
    version: z.string().optional(),
    protocol_version: z.string().optional(),
  })
  .passthrough();
const fieldSchema = z
  .object({
    id: z.string(),
    unit: z.enum(['mol/m3', 'V', 'A/m3', 'Pa', 'm/s']),
    values: z.array(z.number().finite()).min(1).max(20000),
    cells: z.array(z.number().int().nonnegative()).min(1).max(20000),
  })
  .strict();
const circuitSchema = z
  .object({
    collector_voltage_V: z.number().finite(),
    anodic_current_A: z.number().finite(),
    signed_electrical_power_W: z.number().finite(),
    mfc_generated_power_W: z.number().finite().nullable(),
    mec_electrical_input_W: z.number().finite().nullable(),
  })
  .strict();
const fieldExtremumSchema = z
  .object({
    value: z.number().finite(),
    unit: z.enum(['mol/m3', 'V', 'A/m3', 'Pa', 'm/s']),
    cell_index: z.number().int().nonnegative().max(19999),
    cell_center_m: z.array(z.number().finite()).min(2).max(3),
    cell_size_m: z.array(z.number().finite().positive()).min(2).max(3),
    region_index: z.number().int().nonnegative().max(127),
    domain_tag: z.string().min(1).max(160),
  })
  .strict();
const fieldExtremaSchema = z
  .object({
    field_id: z.string().min(1).max(160),
    unit: z.enum(['mol/m3', 'V', 'A/m3', 'Pa', 'm/s']),
    minimum: fieldExtremumSchema,
    maximum: fieldExtremumSchema,
  })
  .strict();
const residualSchema = z
  .object({
    balance_id: z.string(),
    kind: z.enum([
      'species_mass',
      'ionic_charge',
      'solid_charge',
      'circuit_closure',
      'fluid_volume',
    ]),
    scope: z.literal('global'),
    absolute_residual: z.number().finite().nonnegative(),
    unit: z.enum(['mol/s', 'A', 'V', 'm3/s']),
    relative_residual: z.number().finite().nonnegative(),
    tolerance: z.number().finite().positive(),
    passed: z.boolean(),
  })
  .strict();
const solveSchema = envelopeSchema
  .extend({
    status: z.enum(['converged', 'not_converged']),
    evaluations: z.number().int().positive(),
    optimizer_termination: z.number().int(),
    termination_reason: z.enum([
      'nonlinear_and_conservation_passed',
      'conservation_gate_failed',
      'maximum_evaluations',
      'linear_solve_failed',
      'nonfinite_newton_step',
      'positivity_step_blocked',
      'line_search_failed',
    ]),
    history: z.array(z.number().finite().nonnegative()).min(1).max(10001),
    residuals: z.array(residualSchema).min(1).max(64),
    field_extrema: z.array(fieldExtremaSchema).min(1).max(32),
    circuit: circuitSchema,
    interface_species_flux_mol_s: z.record(z.array(z.number().finite())),
  })
  .strict();

export function parseStructuredCellProcessEnvelope(
  value: unknown,
  expected: { solverVersion: string; runtimeVersion: string },
): z.infer<typeof envelopeSchema> {
  const versions = envelopeVersionSchema.parse(value);
  if (versions.protocol_version !== expected.runtimeVersion)
    throw new SpatialSimulationExecutionError(
      'spatial_sidecar_protocol_mismatch',
      `Cell sidecar protocol mismatch: expected ${expected.runtimeVersion}, received ${versions.protocol_version ?? 'missing'}`,
    );
  if (versions.version !== expected.solverVersion)
    throw new SpatialSimulationExecutionError(
      'spatial_solver_version_mismatch',
      `Cell solver version mismatch: expected ${expected.solverVersion}, received ${versions.version ?? 'missing'}`,
    );
  return envelopeSchema.parse(value);
}

export interface StructuredCellExecutorOptions extends Omit<
  SidecarProcessOptions,
  'signal'
> {
  artifactStore: Pick<
    LocalSpatialFieldArtifactStore,
    'storeField' | 'storeArtifact'
  >;
}

/** Opt-in research executor. No product registration or fidelity substitution occurs here. */
export class StructuredCellDevelopmentExecutor implements SpatialSimulationExecutor {
  readonly solverVersion = 'structured-cell-fv-v1';
  readonly runtimeVersion = 'structured-cell-process-v6';
  constructor(private readonly options: StructuredCellExecutorOptions) {
    if (
      !options.pythonExecutable.trim() ||
      !options.moduleDirectory.trim() ||
      !options.artifactRoot.trim() ||
      !Number.isSafeInteger(options.timeoutMs) ||
      options.timeoutMs < 1 ||
      options.timeoutMs > 120000
    )
      throw new RangeError('Invalid structured cell process configuration');
  }
  supports(candidate: SpatialRuntimeInput): boolean {
    return structuredCellInputSchema.safeParse(candidate).success;
  }
  async execute(
    context: SpatialSimulationExecutionContext,
  ): Promise<SpatialSimulationResult> {
    try {
      return await this.executeCell(context);
    } catch (error) {
      throw normalizeSpatialSimulationExecutionError(error);
    }
  }
  private async executeCell(
    context: SpatialSimulationExecutionContext,
  ): Promise<SpatialSimulationResult> {
    const input = structuredCellInputSchema.parse(context.input);
    const equationGraph = compileStructuredCellEquationGraph(input);
    const inputHash = spatialRuntimeInputSha256(input);
    const geometryHash = structuredCellGeometrySha256(input);
    if (
      context.run.input_sha256 !== inputHash ||
      context.run.mesh_request_sha256 !== geometryHash
    )
      throw new Error('Cell run identity mismatch');
    if (context.run.solver_version !== this.solverVersion)
      throw new SpatialSimulationExecutionError(
        'spatial_solver_version_mismatch',
        `Queued run requires solver ${context.run.solver_version}; active executor provides ${this.solverVersion}`,
      );
    if (context.run.runtime_version !== this.runtimeVersion)
      throw new SpatialSimulationExecutionError(
        'spatial_runtime_version_mismatch',
        `Queued run requires runtime ${context.run.runtime_version}; active executor provides ${this.runtimeVersion}`,
      );
    const expectedMesh = structuredCellTopology(input);
    const directories: string[] = [];
    const invoke = async (operation: 'prepare' | 'solve') => {
      const requestId = randomUUID();
      const payload = JSON.stringify({
        operation,
        request_id: requestId,
        input_json: serializeStructuredCellInput(input),
        input_sha256: inputHash,
        geometry_json: serializeStructuredCellGeometry(input),
        geometry_sha256: geometryHash,
      });
      const result = await runSpatialSidecarProcess(
        payload,
        { ...this.options, signal: context.signal },
        true,
        'metrev_spatial.structured_cell',
      );
      if (!result.artifactDirectory)
        throw new Error('Cell output directory missing');
      directories.push(result.artifactDirectory);
      const response = parseStructuredCellProcessEnvelope(
        JSON.parse(result.stdout),
        {
          solverVersion: this.solverVersion,
          runtimeVersion: this.runtimeVersion,
        },
      );
      if (
        response.request_id !== requestId ||
        response.input_sha256 !== inputHash ||
        response.geometry_sha256 !== geometryHash ||
        response.dimension !== input.dimension ||
        new Set(response.artifacts.map((a) => a.id)).size !==
          response.artifacts.length
      )
        throw new Error('Cell response identity mismatch');
      return { response, directory: result.artifactDirectory };
    };
    const load = async (
      directory: string,
      artifact: z.infer<typeof artifactSchema>,
    ) => {
      const path = resolve(directory, artifact.path);
      if (!path.startsWith(resolve(directory) + sep))
        throw new Error('Artifact escaped private directory');
      const stat = await lstat(path);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.size !== artifact.bytes
      )
        throw new Error('Invalid cell artifact file');
      const bytes = await readFile(path);
      if (
        bytes.length !== artifact.bytes ||
        createHash('sha256').update(bytes).digest('hex') !== artifact.sha256
      )
        throw new Error('Cell artifact digest mismatch');
      return { path, data: JSON.parse(bytes.toString('utf8')) as unknown };
    };
    const reference = (
      artifact: z.infer<typeof artifactSchema>,
      datasetPath: string,
    ) => ({
      uri: `metrev-artifact://sha256/${artifact.sha256}`,
      sha256: artifact.sha256,
      bytes: artifact.bytes,
      format: 'json' as const,
      media_type: 'application/json',
      dataset_path: datasetPath,
    });
    try {
      await context.reportProgress({
        status: 'preparing_geometry',
        progress: 5,
      });
      await context.reportProgress({ status: 'meshing', progress: 15 });
      const prepared = await invoke('prepare');
      if (
        prepared.response.status !== 'prepared' ||
        prepared.response.artifacts.length !== 1
      )
        throw new Error('Invalid mesh preparation response');
      const meshArtifact = prepared.response.artifacts[0];
      if (meshArtifact.id !== 'mesh') throw new Error('Missing cell mesh');
      const mesh = await load(prepared.directory, meshArtifact);
      // Validate every numerical coordinate, size, region and physical volume.
      const equal = (a: unknown, b: unknown): boolean =>
        Array.isArray(a) && Array.isArray(b)
          ? a.length === b.length && a.every((v, i) => equal(v, b[i]))
          : typeof a === 'number' && typeof b === 'number'
            ? Math.abs(a - b) <=
              1e-12 * Math.max(Math.abs(a), Math.abs(b), 1e-30)
            : a === b;
      const meshData = z
        .object({
          shape: z.array(z.number().int().positive()),
          centers_m: z.array(z.array(z.number().finite())),
          sizes_m: z.array(z.array(z.number().finite().positive())),
          region_index: z.array(z.number().int().nonnegative()),
          volumes_m3: z.array(z.number().finite().positive()),
        })
        .strict()
        .parse(mesh.data);
      for (const key of Object.keys(
        expectedMesh,
      ) as (keyof typeof expectedMesh)[])
        if (!equal(meshData[key], expectedMesh[key]))
          throw new Error('Cell mesh differs from its declared geometry');
      const meshPublication = {
        sourceFilePath: mesh.path,
        ownerId: context.ownerId,
        runId: context.run.id,
        fieldId: '_mesh',
        artifact: reference(meshArtifact, '/mesh'),
        signal: context.signal,
      };
      await this.options.artifactStore.storeArtifact(meshPublication);
      await context.reportProgress({
        status: 'solving',
        progress: 30,
        mesh_sha256: meshArtifact.sha256,
      });
      const solved = await invoke('solve');
      const response = solveSchema.parse(solved.response);
      if (
        response.artifacts.find((a) => a.id === 'mesh')?.sha256 !==
        meshArtifact.sha256
      )
        throw new Error('Cell mesh changed during solve');
      const names = [
        'faradaic_current_density',
        ...('hydraulics' in input && input.hydraulics
          ? [
              'darcy_pressure',
              ...['x', 'y', ...(input.dimension === 3 ? ['z'] : [])].map(
                (axis) => 'darcy_velocity_' + axis,
              ),
            ]
          : []),
        'liquid_potential',
        'solid_potential_anode',
        'solid_potential_cathode',
        ...input.species.map((s) => 'concentration_' + s.id),
      ].sort();
      if (
        response.artifacts
          .filter((a) => a.id !== 'mesh')
          .map((a) => a.id)
          .sort()
          .join() !== names.join()
      )
        throw new Error('Cell output states are incomplete');
      if (
        response.history.at(-1)! > input.numerics.nonlinear_tolerance &&
        response.status === 'converged'
      )
        throw new Error('Cell convergence claim exceeds its tolerance');
      if (
        response.residuals.some((r) => {
          const expectedTolerance =
            r.balance_id === 'darcy_local_volume' &&
            input.hydraulics?.version ===
              'structured-cell-darcy-pressure-solve-v1'
              ? STRUCTURED_CELL_DARCY_PRESSURE_SOLVE_TOLERANCE
              : input.numerics.conservation_tolerance;
          return (
            r.tolerance !== expectedTolerance ||
            r.passed !== r.relative_residual <= r.tolerance
          );
        }) ||
        (response.status === 'converged' &&
          response.residuals.some((r) => !r.passed))
      )
        throw new Error('Invalid cell conservation claim');
      await context.reportProgress({ status: 'postprocessing', progress: 85 });
      const fields: SpatialSimulationResult['fields'] = [];
      const loadedFields = new Map<
        string,
        {
          data: z.infer<typeof fieldSchema>;
          artifact: z.infer<typeof artifactSchema>;
        }
      >();
      for (const artifact of response.artifacts.filter(
        (a) => a.id !== 'mesh',
      )) {
        const loaded = await load(solved.directory, artifact);
        const data = validateStructuredCellFieldSamples(
          fieldSchema.parse(loaded.data),
          input,
        );
        const hydraulicField =
          data.id === 'darcy_pressure' || data.id.startsWith('darcy_velocity_');
        const region =
          artifact.id === 'solid_potential_anode'
            ? 0
            : artifact.id === 'solid_potential_cathode'
              ? input.geometry.layers.length - 1
              : null;
        const expectedCells = expectedMesh.region_index.flatMap((r, i) =>
          (region === null || region === r) &&
          (!hydraulicField || input.geometry.layers[r].kind !== 'membrane')
            ? [i]
            : [],
        );
        if (
          data.id !== artifact.id ||
          data.unit !==
            (data.id.startsWith('concentration_')
              ? 'mol/m3'
              : data.id === 'faradaic_current_density'
                ? 'A/m3'
                : data.id === 'darcy_pressure'
                  ? 'Pa'
                  : data.id.startsWith('darcy_velocity_')
                    ? 'm/s'
                    : 'V') ||
          data.values.length !== expectedCells.length ||
          data.cells.join() !== expectedCells.join() ||
          (data.unit === 'mol/m3' && data.values.some((v) => v < 0))
        )
          throw new Error(
            'Cell field values differ from admitted state topology',
          );
        const measures = data.cells.map((i) =>
          expectedMesh.sizes_m[i].reduce((a, b) => a * b, 1),
        );
        const total = measures.reduce((a, b) => a + b, 0);
        const minimum = Math.min(...data.values);
        const maximum = Math.max(...data.values);
        const integral = data.values.reduce(
          (sum, v, i) => sum + v * measures[i],
          0,
        );
        const mean =
          minimum +
          data.values.reduce(
            (sum, v, i) => sum + (v - minimum) * measures[i],
            0,
          ) /
            total;
        const field: SpatialSimulationResult['fields'][number] = {
          field_id: data.id,
          variable_id: data.id,
          unit: data.unit,
          association: 'mesh_cells',
          domain_tags:
            region === null
              ? input.geometry.layers
                  .filter((l) => !hydraulicField || l.kind !== 'membrane')
                  .map((l) => l.tag)
              : [input.geometry.layers[region].tag],
          artifact: reference(artifact, '/values'),
          sampled_at: new Date().toISOString(),
          value_type: 'scalar',
          summary: {
            sample_count: data.values.length,
            minimum,
            maximum,
            mean,
            integral,
            integral_unit:
              data.unit === 'Pa'
                ? `Pa*m${input.dimension}`
                : data.unit === 'm/s'
                  ? `m${input.dimension + 1}/s`
                  : data.unit === 'A/m3'
                    ? input.dimension === 2
                      ? 'A/m'
                      : 'A'
                    : data.unit === 'V'
                      ? `V*m${input.dimension}`
                      : input.dimension === 2
                        ? 'mol/m'
                        : 'mol',
            integration_measure:
              input.dimension === 2 ? 'domain_area' : 'domain_volume',
          },
        };
        const fieldPublication = {
          sourceFilePath: loaded.path,
          ownerId: context.ownerId,
          runId: context.run.id,
          field,
          signal: context.signal,
        };
        await this.options.artifactStore.storeField(fieldPublication);
        fields.push(field);
        loadedFields.set(data.id, { data, artifact });
      }
      const close = (actual: number, expected: number) =>
        Math.abs(actual - expected) <=
        1e-12 * Math.max(Math.abs(actual), Math.abs(expected), 1e-30);
      const derivedFields = response.field_extrema.map((entry) => {
        const loaded = loadedFields.get(entry.field_id);
        const manifest = fields.find(
          (field) => field.field_id === entry.field_id,
        );
        if (!loaded || !manifest || entry.unit !== loaded.data.unit)
          throw new Error(
            'Cell extrema differ from persisted field identities',
          );
        for (const statistic of ['minimum', 'maximum'] as const) {
          const point = entry[statistic];
          const sign = statistic === 'minimum' ? 1 : -1;
          const values: number[] = loaded.data.values;
          const cells: number[] = loaded.data.cells;
          let sampleIndex: number = 0;
          for (let index = 1; index < values.length; index += 1) {
            const value: number = values[index]!;
            const current: number = values[sampleIndex]!;
            if (
              sign * value < sign * current ||
              (value === current && cells[index]! < cells[sampleIndex]!)
            )
              sampleIndex = index;
          }
          const cellIndex: number = cells[sampleIndex]!;
          const regionIndex = expectedMesh.region_index[cellIndex];
          const domainTag = input.geometry.layers[regionIndex]?.tag;
          const center = expectedMesh.centers_m[cellIndex];
          const size = expectedMesh.sizes_m[cellIndex];
          if (
            point.value !== loaded.data.values[sampleIndex] ||
            point.cell_index !== cellIndex ||
            point.region_index !== regionIndex ||
            point.domain_tag !== domainTag ||
            point.cell_center_m.length !== input.dimension ||
            point.cell_size_m.length !== input.dimension ||
            point.cell_center_m.some(
              (value, axis) => !close(value, center[axis]),
            ) ||
            point.cell_size_m.some((value, axis) => !close(value, size[axis]))
          )
            throw new Error(
              'Cell extrema do not match their field samples and mesh',
            );
        }
        return {
          ...entry,
          field_artifact_sha256: manifest.artifact.sha256,
          dataset_path: manifest.artifact.dataset_path,
          association: manifest.association,
        };
      });
      if (
        new Set(derivedFields.map((entry) => entry.field_id)).size !==
          fields.length ||
        derivedFields.length !== fields.length
      )
        throw new Error(
          'Cell extrema do not cover every persisted field exactly once',
        );
      const structuredCellFieldObservables =
        structuredCellFieldObservablesSchema.parse({
          contract_version: 'structured-cell-field-extrema-v1',
          record_kind: 'modeled_field_extremum',
          source_kind: 'modeled_field_artifact',
          classification: null,
          thresholds_applied: false,
          decision_eligible: false,
          independent_validation: false,
          algorithm: 'argmin_argmax_lowest_global_cell_index_v1',
          input_sha256: inputHash,
          mesh_sha256: meshArtifact.sha256,
          geometry_request_sha256: geometryHash,
          coordinate_system: 'cartesian',
          position_basis: 'finite_volume_cell_center',
          fields: derivedFields,
        });
      const physicalGroups = Object.fromEntries(
        input.geometry.layers.map((l, i) => ['region:' + l.tag, i + 1]),
      );
      const fieldReduction = deriveStructuredCellFieldReduction({
        input,
        input_sha256: inputHash,
        mesh_sha256: meshArtifact.sha256,
        geometry_request_sha256: geometryHash,
        numerical_status: response.status,
        fields: [...loadedFields.values()].map(({ data, artifact }) => ({
          samples: data,
          artifact_sha256: artifact.sha256,
        })),
      });
      const result = spatialSimulationResultForInputSchema(input).parse({
        contract_version: 'spatial-simulation-result-v3',
        run_id: context.run.id,
        evaluation_id: context.run.evaluation_id,
        model_id: input.model_id,
        system: input.system,
        dimension: input.dimension,
        coordinate_system: 'cartesian',
        input_contract_version: input.contract_version,
        input_sha256: inputHash,
        solver_version: this.solverVersion,
        runtime_version: this.runtimeVersion,
        produced_at: new Date().toISOString(),
        mesh: {
          artifact: {
            uri: `metrev-artifact://sha256/${meshArtifact.sha256}`,
            sha256: meshArtifact.sha256,
            bytes: meshArtifact.bytes,
            format: 'json',
            media_type: 'application/json',
          },
          dimension: input.dimension,
          geometry_version: input.geometry.geometry_version,
          request_sha256: geometryHash,
          refinement_factor: 1,
          generated_with: {
            name: 'metrev-structured-fv',
            version: this.solverVersion,
          },
          physical_groups: physicalGroups,
          mesh_quality: {
            node_count: expectedMesh.shape.reduce((a, b) => a * (b + 1), 1),
            cell_count: expectedMesh.centers_m.length,
            minimum_quality: Math.min(
              ...expectedMesh.sizes_m.map(
                (s) => Math.min(...s) / Math.max(...s),
              ),
            ),
          },
        },
        domains: input.geometry.layers.map((l, i) => ({
          role: 'domain',
          tag: l.tag,
          kind: l.kind,
          physical_group_tag: 'region:' + l.tag,
          physical_group_id: i + 1,
        })),
        scalar_outputs: [],
        fields,
        conservation_residuals: response.residuals,
        convergence: [
          {
            solver_id: 'coupled_cell',
            method: 'sparse_analytic_newton_positive_line_search',
            status: response.status,
            residual_unit: '1',
            absolute_tolerance: input.numerics.nonlinear_tolerance,
            relative_tolerance: input.numerics.nonlinear_tolerance,
            iterations: response.history.length,
            history: response.history.map((nonlinear_residual, i) => ({
              iteration: i + 1,
              nonlinear_residual,
            })),
            termination_reason: response.termination_reason,
          },
        ],
        warnings: [
          {
            code: 'development_only',
            severity: 'warning',
            message:
              'Restricted supporting-electrolyte development cell; numerical closure is not experimental validation.',
          },
        ],
        unsupported_physics: STRUCTURED_CELL_LIMITS.map((reason, i) => ({
          module_id: 'restriction_' + i,
          reason,
        })),
        artifact_hashes: [
          ...new Set([
            meshArtifact.sha256,
            ...fields.map((f) => f.artifact.sha256),
          ]),
        ],
        cell_circuit: response.circuit,
        equation_graph: equationGraph,
        structured_cell_field_observables: structuredCellFieldObservables,
        structured_cell_field_reduction: fieldReduction,
        structured_cell_mesh_refinement_evidence:
          structuredCellMeshRefinementEvidenceSchema.parse({
            contract_version: 'structured-cell-mesh-refinement-evidence-v1',
            record_kind: 'numerical_mesh_refinement_evidence',
            evidence_role: 'mathematical_software_verification',
            decision_eligible: false,
            independent_validation: false,
            current_run_id: context.run.id,
            algorithm:
              'three_level_finest_solution_difference_uniform_characteristic_h_v1',
            status: 'unavailable',
            unavailable_reason: 'three_completed_runs_required',
            compared_run_ids: [context.run.id],
            levels: [],
            refinement_ratio: null,
            observables: [],
          }),
      });
      if (response.status === 'not_converged')
        throw new SpatialNumericalResultError(result);
      return result;
    } finally {
      await Promise.all(
        directories.map((directory) =>
          rm(directory, { recursive: true, force: true }),
        ),
      );
    }
  }
}
