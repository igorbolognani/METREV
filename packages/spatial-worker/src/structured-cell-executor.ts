import { createHash, randomUUID } from 'node:crypto';
import { readFile, rm, lstat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { z } from 'zod';
import {
  structuredCellInputSchema,
  structuredCellTopology,
  STRUCTURED_CELL_LIMITS,
  spatialRuntimeInputSha256,
  structuredCellGeometrySha256,
  spatialSimulationResultForInputSchema,
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
    status: z.enum(['prepared', 'converged', 'not_converged']),
    dimension: z.union([z.literal(2), z.literal(3)]),
    request_id: z.string().uuid(),
    input_sha256: digest,
    geometry_sha256: digest,
    artifacts: z.array(artifactSchema).min(1).max(16),
  })
  .passthrough();
const fieldSchema = z
  .object({
    id: z.string(),
    unit: z.enum(['mol/m3', 'V']),
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
const residualSchema = z
  .object({
    balance_id: z.string(),
    kind: z.enum([
      'species_mass',
      'ionic_charge',
      'solid_charge',
      'circuit_closure',
    ]),
    scope: z.literal('global'),
    absolute_residual: z.number().finite().nonnegative(),
    unit: z.enum(['mol/s', 'A', 'V']),
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
    circuit: circuitSchema,
    interface_species_flux_mol_s: z.record(z.array(z.number().finite())),
  })
  .strict();

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
  readonly runtimeVersion = 'structured-cell-process-v1';
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
    const inputHash = spatialRuntimeInputSha256(input);
    const geometryHash = structuredCellGeometrySha256(input);
    if (
      context.run.input_sha256 !== inputHash ||
      context.run.mesh_request_sha256 !== geometryHash ||
      context.run.solver_version !== this.solverVersion ||
      context.run.runtime_version !== this.runtimeVersion
    )
      throw new Error('Cell run identity mismatch');
    const expectedMesh = structuredCellTopology(input);
    const directories: string[] = [];
    const invoke = async (operation: 'prepare' | 'solve') => {
      const requestId = randomUUID();
      const payload = JSON.stringify({
        operation,
        request_id: requestId,
        input_json: JSON.stringify(input),
        input_sha256: inputHash,
        geometry_json: JSON.stringify(input.geometry),
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
      const response = envelopeSchema.parse(JSON.parse(result.stdout));
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
      await this.options.artifactStore.storeArtifact({
        sourceFilePath: mesh.path,
        ownerId: context.ownerId,
        runId: context.run.id,
        fieldId: '_mesh',
        artifact: reference(meshArtifact, '/mesh'),
      });
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
        response.residuals.some(
          (r) =>
            r.tolerance !== input.numerics.conservation_tolerance ||
            r.passed !== r.relative_residual <= r.tolerance,
        ) ||
        (response.status === 'converged' &&
          response.residuals.some((r) => !r.passed))
      )
        throw new Error('Invalid cell conservation claim');
      await context.reportProgress({ status: 'postprocessing', progress: 85 });
      const fields: SpatialSimulationResult['fields'] = [];
      for (const artifact of response.artifacts.filter(
        (a) => a.id !== 'mesh',
      )) {
        const loaded = await load(solved.directory, artifact);
        const data = fieldSchema.parse(loaded.data);
        const region =
          artifact.id === 'solid_potential_anode'
            ? 0
            : artifact.id === 'solid_potential_cathode'
              ? input.geometry.layers.length - 1
              : null;
        const expectedCells = expectedMesh.region_index.flatMap((r, i) =>
          region === null || region === r ? [i] : [],
        );
        if (
          data.id !== artifact.id ||
          data.unit !==
            (data.id.startsWith('concentration_') ? 'mol/m3' : 'V') ||
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
              ? input.geometry.layers.map((l) => l.tag)
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
              data.unit === 'V'
                ? `V*m${input.dimension}`
                : input.dimension === 2
                  ? 'mol/m'
                  : 'mol',
            integration_measure:
              input.dimension === 2 ? 'domain_area' : 'domain_volume',
          },
        };
        await this.options.artifactStore.storeField({
          sourceFilePath: loaded.path,
          ownerId: context.ownerId,
          runId: context.run.id,
          field,
        });
        fields.push(field);
      }
      const physicalGroups = Object.fromEntries(
        input.geometry.layers.map((l, i) => ['region:' + l.tag, i + 1]),
      );
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
