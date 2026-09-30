import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  spatialMeshReferenceSchema,
  spatialModelInputV2Schema,
  spatialModelInputV2Sha256,
  spatialSidecarRequestSchema,
  spatialSidecarResponseSchema,
  type SpatialSidecarRequest,
  type SpatialSidecarResponse,
} from '@metrev/domain-contracts';

/** Translate an admitted v2 case to the deliberately narrow Stokes sidecar request. */
export function planarStokesRequestFromInput(
  candidate: unknown,
  requestId = randomUUID(),
): Extract<SpatialSidecarRequest, { operation: 'planar_stokes' }> {
  const input = spatialModelInputV2Schema.parse(candidate);
  const setup = input.stokes_development;
  if (!setup)
    throw new RangeError(
      'Input does not declare the Stokes development regime',
    );
  const viscosity = input.material_fields.find(
    (entry) =>
      entry.parameter_id === setup.viscosity_parameter_id &&
      entry.domain_tag === setup.domain_tag,
  );
  if (!viscosity || viscosity.field.kind !== 'constant')
    throw new RangeError('Stokes sidecar requires constant declared viscosity');
  return spatialSidecarRequestSchema.parse({
    protocol_version: 'spatial-sidecar-v1',
    request_id: requestId,
    operation: 'planar_stokes',
    mesh_request: input.mesh.request,
    mesh_sha256: input.mesh.sha256,
    refinement_factor: input.mesh.refinement_factor,
    model_input_contract_version: input.contract_version,
    model_input_sha256: spatialModelInputV2Sha256(input),
    setup,
    viscosity: viscosity.field.value,
  }) as Extract<SpatialSidecarRequest, { operation: 'planar_stokes' }>;
}

/** Bind a validated request and matching sidecar manifest to a stored mesh URI.
 * The artifact store must still authorize the URI and verify its file hash before use.
 */
export function meshReferenceFromSidecar(
  candidateRequest: SpatialSidecarRequest,
  candidateResponse: SpatialSidecarResponse,
  refinementFactor: number,
  uri: string,
): ReturnType<typeof spatialMeshReferenceSchema.parse> {
  const request = spatialSidecarRequestSchema.parse(candidateRequest);
  const response = spatialSidecarResponseSchema.parse(candidateResponse);
  if (
    request.operation !== 'planar_mesh' ||
    response.status !== 'ok' ||
    response.operation !== 'planar_mesh' ||
    !response.metadata.gmsh_version ||
    response.request_id !== request.request_id ||
    response.geometry_version !== request.mesh.geometry_version ||
    response.input_sha256 !==
      createHash('sha256').update(JSON.stringify(request)).digest('hex')
  )
    throw new RangeError(
      'Mesh manifest does not match the exact planar request',
    );
  const artifact = response.artifacts.find(
    (entry) => entry.refinement_factor === refinementFactor,
  );
  if (!artifact || !request.mesh.refinement_factors.includes(refinementFactor))
    throw new RangeError('Requested mesh level is absent from the manifest');
  return spatialMeshReferenceSchema.parse({
    kind: 'generated_mesh',
    uri,
    sha256: artifact.sha256,
    format: artifact.format,
    refinement_factor: artifact.refinement_factor,
    input_sha256: response.input_sha256,
    request,
    sidecar_version: response.metadata.sidecar_version,
    gmsh_version: response.metadata.gmsh_version,
    physical_groups: response.physical_groups,
    component_map: response.component_map,
    interfaces: response.interfaces,
  });
}

export type SidecarTransportCode =
  | 'timeout'
  | 'cancelled'
  | 'process_failure'
  | 'invalid_response'
  | 'artifact_integrity';

export class SidecarTransportError extends Error {
  constructor(
    readonly code: SidecarTransportCode,
    message: string,
  ) {
    super(message);
    this.name = 'SidecarTransportError';
  }
}

export interface SidecarProcessOptions {
  /** Trusted, locally provisioned Python interpreter and module directory. */
  pythonExecutable: string;
  moduleDirectory: string;
  artifactRoot: string;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface SidecarProcessResult {
  response: SpatialSidecarResponse;
  /** Never persist this local path as a user-facing artifact URL. */
  artifactDirectory: string | null;
}

function killProcessTree(child: ChildProcess): void {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    child.kill('SIGKILL');
    return;
  }
  try {
    // detached:true makes the child the leader of its own POSIX process group.
    process.kill(-child.pid, 'SIGKILL');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH')
      child.kill('SIGKILL');
  }
}

/** Worker-side boundary only. No Fastify request may launch a mesh synchronously. */
export async function runSpatialSidecar(
  input: SpatialSidecarRequest,
  options: SidecarProcessOptions,
): Promise<SidecarProcessResult> {
  const request = spatialSidecarRequestSchema.parse(input);
  if (
    !Number.isSafeInteger(options.timeoutMs) ||
    options.timeoutMs < 1 ||
    options.timeoutMs > 120_000
  )
    throw new RangeError('Sidecar timeout must be in [1, 120000] ms');
  if (options.signal?.aborted)
    throw new SidecarTransportError(
      'cancelled',
      'Sidecar request was cancelled',
    );

  const artifactDirectory =
    request.operation === 'planar_mesh' || request.operation === 'planar_stokes'
      ? await (async () => {
          await mkdir(options.artifactRoot, { recursive: true });
          return mkdtemp(join(resolve(options.artifactRoot), 'metrev-mesh-'));
        })()
      : null;
  const payload = JSON.stringify(request);
  const args = [
    '-m',
    'metrev_spatial',
    ...(artifactDirectory ? ['--output-dir', artifactDirectory] : []),
  ];
  const stdout = await new Promise<string>((resolveOutput, rejectOutput) => {
    const child = spawn(options.pythonExecutable, args, {
      cwd: options.moduleDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: options.moduleDirectory },
      detached: process.platform !== 'win32',
    });
    let out = '';
    let err = '';
    let settled = false;
    let reason: SidecarTransportCode | undefined;
    const finish = (error?: Error, output?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
      if (error) rejectOutput(error);
      else resolveOutput(output ?? '');
    };
    const cancel = () => {
      reason = 'cancelled';
      killProcessTree(child);
      finish(
        new SidecarTransportError('cancelled', 'Sidecar request was cancelled'),
      );
    };
    const timer = setTimeout(() => {
      reason = 'timeout';
      killProcessTree(child);
      finish(
        new SidecarTransportError('timeout', 'Sidecar exceeded its time limit'),
      );
    }, options.timeoutMs);
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) cancel();
    child.on('error', (error) =>
      finish(new SidecarTransportError('process_failure', error.message)),
    );
    child.stdout.on('data', (data: Buffer) => {
      out += data.toString('utf8');
      if (out.length > 2_000_000) {
        killProcessTree(child);
        finish(
          new SidecarTransportError(
            'invalid_response',
            'Sidecar response exceeds 2 MB',
          ),
        );
      }
    });
    child.stderr.on('data', (data: Buffer) => {
      err = (err + data.toString('utf8')).slice(-4096);
    });
    child.on('close', (code) => {
      if (settled) return;
      if (code !== 0)
        finish(
          new SidecarTransportError(
            reason ?? 'process_failure',
            `Sidecar exited ${code}: ${err}`,
          ),
        );
      else finish(undefined, out);
    });
    child.stdin.on('error', () => {
      /* close/error event reports process failure */
    });
    child.stdin.end(payload);
  }).catch(async (error: unknown) => {
    if (artifactDirectory)
      await rm(artifactDirectory, { recursive: true, force: true });
    throw error;
  });

  let response: SpatialSidecarResponse;
  try {
    response = spatialSidecarResponseSchema.parse(JSON.parse(stdout));
  } catch {
    if (artifactDirectory)
      await rm(artifactDirectory, { recursive: true, force: true });
    throw new SidecarTransportError(
      'invalid_response',
      'Sidecar returned malformed protocol data',
    );
  }
  if (response.status === 'error') {
    if (artifactDirectory)
      await rm(artifactDirectory, { recursive: true, force: true });
    return { response, artifactDirectory: null };
  }
  try {
    if (
      response.request_id !== request.request_id ||
      response.operation !== request.operation
    )
      throw new SidecarTransportError(
        'invalid_response',
        'Sidecar response does not match the request',
      );

    if (
      response.operation === 'planar_stokes' &&
      request.operation === 'planar_stokes'
    ) {
      if (
        !artifactDirectory ||
        response.model_input_contract_version !==
          request.model_input_contract_version ||
        response.model_input_sha256 !== request.model_input_sha256 ||
        response.mesh.sha256 !== request.mesh_sha256 ||
        response.mesh.refinement_factor !== request.refinement_factor
      )
        throw new SidecarTransportError(
          'artifact_integrity',
          'Stokes result does not match the admitted model and mesh',
        );
      const expectedGroups: Record<string, number> = {};
      request.mesh_request.mesh.layers.forEach((layer, index) => {
        expectedGroups[`region:${layer.tag}`] = index + 1;
      });
      (['left', 'right', 'bottom', 'top'] as const).forEach((side, index) => {
        expectedGroups[
          `boundary:${request.mesh_request.mesh.boundaries[side].tag}`
        ] = 101 + index;
      });
      for (
        let index = 1;
        index < request.mesh_request.mesh.layers.length;
        index++
      ) {
        const left = request.mesh_request.mesh.layers[index - 1];
        const right = request.mesh_request.mesh.layers[index];
        expectedGroups[`interface:${left.tag}:${right.tag}`] = 201 + index;
      }
      if (
        Object.keys(expectedGroups).length !==
          Object.keys(response.physical_groups).length ||
        Object.entries(expectedGroups).some(
          ([tag, id]) => response.physical_groups[tag] !== id,
        )
      )
        throw new SidecarTransportError(
          'artifact_integrity',
          'Stokes mesh physical groups do not match the admitted recipe',
        );
      const expectedDatasets = [
        {
          variable_id: request.setup.pressure_variable,
          field_name: 'pressure',
          dataset_path: '/Function/pressure/0',
          unit: 'Pa',
        },
        {
          variable_id: request.setup.velocity_variables.x,
          field_name: 'velocity_x',
          dataset_path: '/Function/velocity_x/0',
          unit: 'm/s',
        },
        {
          variable_id: request.setup.velocity_variables.y,
          field_name: 'velocity_y',
          dataset_path: '/Function/velocity_y/0',
          unit: 'm/s',
        },
      ];
      if (
        expectedDatasets.some(
          (expected) =>
            !response.field_datasets.some(
              (field) =>
                field.variable_id === expected.variable_id &&
                field.field_name === expected.field_name &&
                field.dataset_path === expected.dataset_path &&
                field.unit === expected.unit &&
                field.domain_tag === request.setup.domain_tag,
            ),
        )
      )
        throw new SidecarTransportError(
          'artifact_integrity',
          'Stokes field datasets do not match the declared state variables',
        );
      const artifacts = [response.mesh, ...response.solution_artifacts];
      for (const artifact of artifacts) {
        const bytes = await readFile(
          join(artifactDirectory, artifact.path),
        ).catch(() => {
          throw new SidecarTransportError(
            'artifact_integrity',
            'Stokes mesh or solution artifact is missing',
          );
        });
        if (
          bytes.length !== artifact.bytes ||
          createHash('sha256').update(bytes).digest('hex') !== artifact.sha256
        )
          throw new SidecarTransportError(
            'artifact_integrity',
            'Stokes artifact hash or length does not match its manifest',
          );
      }
    }

    if (
      response.operation === 'planar_mesh' &&
      request.operation === 'planar_mesh'
    ) {
      if (
        !artifactDirectory ||
        response.input_sha256 !==
          createHash('sha256').update(payload).digest('hex') ||
        response.artifacts.length !== request.mesh.refinement_factors.length ||
        response.artifacts.some(
          (artifact, index) =>
            artifact.refinement_factor !==
            request.mesh.refinement_factors[index],
        )
      )
        throw new SidecarTransportError(
          'artifact_integrity',
          'Mesh manifest does not match input',
        );
      for (const artifact of response.artifacts) {
        const bytes = await readFile(
          join(artifactDirectory, artifact.path),
        ).catch(() => {
          throw new SidecarTransportError(
            'artifact_integrity',
            'Mesh file is missing',
          );
        });
        if (
          bytes.length !== artifact.bytes ||
          createHash('sha256').update(bytes).digest('hex') !== artifact.sha256
        )
          throw new SidecarTransportError(
            'artifact_integrity',
            'Mesh file hash or length does not match manifest',
          );
      }
    }
  } catch (error) {
    if (artifactDirectory)
      await rm(artifactDirectory, { recursive: true, force: true });
    throw error;
  }
  return { response, artifactDirectory };
}
