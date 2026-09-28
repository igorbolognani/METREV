import { z } from 'zod';

const identifier = z.string().trim().min(1).max(160);
const tag = z.string().trim().min(1).max(160);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const unit = z.string().trim().min(1).max(80);
const positiveInteger = z.number().int().positive();
const timestamp = z.string().datetime({ offset: true });

export const spatialArtifactFormatSchema = z.enum([
  'msh4',
  'xdmf',
  'hdf5',
  'vtu',
]);

/** Stable content-addressed references only; signed URLs and local paths are not persisted. */
const artifactReferenceObjectSchema = z
  .object({
    uri: z.string().regex(/^metrev-artifact:\/\/sha256\/[a-f0-9]{64}$/),
    sha256,
    bytes: positiveInteger,
    format: spatialArtifactFormatSchema,
    media_type: z.string().trim().min(1).max(120),
  })
  .strict();

function verifyArtifactUriDigest(
  artifact: { uri: string; sha256: string },
  context: z.RefinementCtx,
): void {
  if (!artifact.uri.endsWith(`/${artifact.sha256}`))
    context.addIssue({
      code: 'custom',
      path: ['uri'],
      message: 'Artifact URI must identify the declared SHA-256 digest',
    });
}

export const spatialResultArtifactReferenceSchema =
  artifactReferenceObjectSchema.superRefine(verifyArtifactUriDigest);

const meshArtifactSchema = z
  .object({
    artifact: spatialResultArtifactReferenceSchema,
    dimension: z.union([z.literal(2), z.literal(3)]),
    geometry_version: identifier,
    request_sha256: sha256,
    refinement_factor: positiveInteger,
    generated_with: z
      .object({ name: identifier, version: identifier })
      .strict(),
    physical_groups: z.record(positiveInteger),
    mesh_quality: z
      .object({
        node_count: positiveInteger,
        cell_count: positiveInteger,
        minimum_quality: z.number().finite().min(0).max(1),
      })
      .strict(),
  })
  .strict()
  .superRefine((mesh, context) => {
    if (mesh.artifact.format === 'msh4' && mesh.generated_with.name !== 'gmsh')
      context.addIssue({
        code: 'custom',
        path: ['generated_with', 'name'],
        message: 'msh4 mesh metadata must identify the Gmsh generator',
      });
  });

const domainKind = z.enum([
  'bulk_liquid',
  'anode',
  'biofilm',
  'membrane',
  'separator',
  'cathode',
  'gas',
]);

const domainManifestEntrySchema = z.discriminatedUnion('role', [
  z
    .object({
      role: z.literal('domain'),
      tag,
      kind: domainKind,
      physical_group_tag: tag,
      physical_group_id: positiveInteger,
      component_id: identifier.optional(),
    })
    .strict(),
  z
    .object({
      role: z.literal('boundary'),
      tag,
      boundary_kind: z.enum([
        'wall',
        'inlet',
        'outlet',
        'electrode_contact',
        'symmetry',
        'other',
      ]),
      physical_group_tag: tag,
      physical_group_id: positiveInteger,
      component_id: identifier.optional(),
    })
    .strict(),
  z
    .object({
      role: z.literal('interface'),
      tag,
      from_domain_tag: tag,
      to_domain_tag: tag,
      normal: z.array(z.number().finite()).min(2).max(3),
      physical_group_tag: tag,
      physical_group_id: positiveInteger,
    })
    .strict(),
]);

const summarySchema = z
  .object({
    sample_count: positiveInteger,
    minimum: z.number().finite(),
    maximum: z.number().finite(),
    mean: z.number().finite(),
    integral: z.number().finite(),
    integral_unit: unit,
    integration_measure: z.enum([
      'domain_length',
      'domain_area',
      'domain_volume',
      'boundary_length',
      'boundary_area',
    ]),
  })
  .strict()
  .superRefine((summary, context) => {
    if (
      summary.minimum > summary.maximum ||
      summary.mean < summary.minimum ||
      summary.mean > summary.maximum
    )
      context.addIssue({
        code: 'custom',
        path: ['mean'],
        message: 'Field statistics must satisfy minimum <= mean <= maximum',
      });
  });

const fieldArtifactSchema = z
  .object({
    ...artifactReferenceObjectSchema.shape,
    dataset_path: z.string().trim().min(1).max(512),
  })
  .strict()
  .superRefine(verifyArtifactUriDigest);

const fieldCommonSchema = z.object({
  field_id: identifier,
  variable_id: identifier,
  unit,
  association: z.enum(['mesh_nodes', 'mesh_cells']),
  domain_tags: z.array(tag).min(1).max(64),
  component_id: identifier.optional(),
  artifact: fieldArtifactSchema,
  sampled_at: timestamp,
  simulation_time_s: z.number().finite().nonnegative().optional(),
});

const scalarFieldSchema = fieldCommonSchema
  .extend({
    value_type: z.literal('scalar'),
    summary: summarySchema,
  })
  .strict();

const vectorFieldSchema = fieldCommonSchema
  .extend({
    value_type: z.literal('vector'),
    components: z
      .array(
        z
          .object({
            axis: z.enum(['x', 'y', 'z', 'r']),
            summary: summarySchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
  })
  .strict();

export const spatialFieldManifestSchema = z
  .discriminatedUnion('value_type', [scalarFieldSchema, vectorFieldSchema])
  .superRefine((field, context) => {
    if (field.value_type === 'vector') {
      const axes = field.components.map(({ axis }) => axis);
      if (new Set(axes).size !== axes.length)
        context.addIssue({
          code: 'custom',
          path: ['components'],
          message: 'Vector component axes must be unique',
        });
    }
  });

const scalarOutputSchema = z
  .object({
    metric_id: identifier,
    value: z.number().finite(),
    unit,
    source_kind: z.literal('modeled'),
    source_ref: identifier,
  })
  .strict();

const conservationResidualSchema = z
  .object({
    balance_id: identifier,
    kind: z.enum([
      'species_mass',
      'ionic_charge',
      'solid_charge',
      'circuit_closure',
      'energy',
      'other',
    ]),
    scope: z.enum(['global', 'domain', 'interface']),
    scope_tag: tag.optional(),
    absolute_residual: z.number().finite().nonnegative(),
    unit,
    relative_residual: z.number().finite().nonnegative(),
    tolerance: z.number().finite().nonnegative(),
    passed: z.boolean(),
  })
  .strict()
  .superRefine((residual, context) => {
    if (residual.passed && residual.relative_residual > residual.tolerance)
      context.addIssue({
        code: 'custom',
        path: ['passed'],
        message: 'A passing conservation residual must satisfy its tolerance',
      });
    if (residual.scope === 'global' && residual.scope_tag !== undefined)
      context.addIssue({
        code: 'custom',
        path: ['scope_tag'],
        message: 'Global residuals cannot reference a local scope tag',
      });
    if (residual.scope !== 'global' && residual.scope_tag === undefined)
      context.addIssue({
        code: 'custom',
        path: ['scope_tag'],
        message: 'Domain and interface residuals require a scope tag',
      });
  });

const convergenceHistoryEntrySchema = z
  .object({
    iteration: positiveInteger,
    nonlinear_residual: z.number().finite().nonnegative(),
    linear_residual: z.number().finite().nonnegative().optional(),
  })
  .strict();

const solverConvergenceSchema = z
  .object({
    solver_id: identifier,
    method: identifier,
    status: z.enum(['converged', 'not_converged', 'not_applicable']),
    residual_unit: unit,
    absolute_tolerance: z.number().finite().nonnegative(),
    relative_tolerance: z.number().finite().nonnegative(),
    iterations: z.number().int().nonnegative(),
    history: z.array(convergenceHistoryEntrySchema).max(10_000),
    termination_reason: identifier,
  })
  .strict()
  .superRefine((solver, context) => {
    if (solver.status === 'not_applicable' && solver.iterations !== 0)
      context.addIssue({
        code: 'custom',
        path: ['iterations'],
        message: 'A solver marked not_applicable must report zero iterations',
      });
    if (solver.status !== 'not_applicable' && solver.iterations === 0)
      context.addIssue({
        code: 'custom',
        path: ['iterations'],
        message: 'An executed solver must report at least one iteration',
      });
    if (solver.status !== 'not_applicable' && solver.history.length === 0)
      context.addIssue({
        code: 'custom',
        path: ['history'],
        message: 'Executed solvers must retain convergence history',
      });
    if (
      solver.history.some(
        (entry, index) =>
          index > 0 && entry.iteration <= solver.history[index - 1].iteration,
      )
    )
      context.addIssue({
        code: 'custom',
        path: ['history'],
        message: 'Convergence iterations must be strictly increasing',
      });
    if (
      solver.history.length > 0 &&
      solver.history.at(-1)?.iteration !== solver.iterations
    )
      context.addIssue({
        code: 'custom',
        path: ['iterations'],
        message: 'The last convergence history entry must match iterations',
      });
  });

const warningSchema = z
  .object({
    code: identifier,
    severity: z.enum(['info', 'warning', 'error']),
    message: z.string().trim().min(1).max(1000),
  })
  .strict();

const unsupportedPhysicsSchema = z
  .object({
    module_id: identifier,
    reason: z.string().trim().min(1).max(1000),
    missing_boundary: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

/** Metadata and external references only. Field samples and mesh nodes stay in artifacts. */
export const spatialSimulationResultSchema = z
  .object({
    contract_version: z.literal('spatial-simulation-result-v1'),
    run_id: identifier,
    evaluation_id: identifier.nullable(),
    model_id: identifier,
    system: z.enum(['MFC', 'MEC']),
    dimension: z.union([z.literal(2), z.literal(3)]),
    coordinate_system: z.enum(['cartesian', 'axisymmetric']),
    input_contract_version: identifier,
    input_sha256: sha256,
    solver_version: identifier,
    runtime_version: identifier,
    produced_at: timestamp,
    mesh: meshArtifactSchema,
    domains: z.array(domainManifestEntrySchema).min(1).max(128),
    scalar_outputs: z.array(scalarOutputSchema).max(256),
    fields: z.array(spatialFieldManifestSchema).min(1).max(256),
    conservation_residuals: z.array(conservationResidualSchema).min(1).max(256),
    convergence: z.array(solverConvergenceSchema).min(1).max(128),
    warnings: z.array(warningSchema).max(500),
    unsupported_physics: z.array(unsupportedPhysicsSchema).max(128),
    artifact_hashes: z.array(sha256).min(1).max(513),
  })
  .strict()
  .superRefine((result, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message });
    if (result.mesh.dimension !== result.dimension)
      issue(['mesh', 'dimension'], 'Result and mesh dimensions must match');
    if (result.coordinate_system === 'axisymmetric' && result.dimension !== 2)
      issue(
        ['coordinate_system'],
        'Axisymmetric coordinates require a two-dimensional mesh',
      );

    const groupIds = new Set<number>();
    const manifestGroups = new Set<string>();
    const domainTags = new Set<string>();
    for (const [index, entry] of result.domains.entries()) {
      if (manifestGroups.has(entry.physical_group_tag))
        issue(
          ['domains', index, 'physical_group_tag'],
          'Physical group tags must be unique',
        );
      manifestGroups.add(entry.physical_group_tag);
      if (groupIds.has(entry.physical_group_id))
        issue(
          ['domains', index, 'physical_group_id'],
          'Physical group IDs must be unique',
        );
      groupIds.add(entry.physical_group_id);
      if (entry.role === 'domain') domainTags.add(entry.tag);
      if (
        result.mesh.physical_groups[entry.physical_group_tag] !==
        entry.physical_group_id
      )
        issue(
          ['domains', index, 'physical_group_id'],
          'Domain manifest does not match the mesh physical-group map',
        );
    }

    const declaredGroups = Object.keys(result.mesh.physical_groups).sort();
    const manifestedGroups = [...manifestGroups].sort();
    if (
      declaredGroups.length !== manifestedGroups.length ||
      declaredGroups.some((group, index) => group !== manifestedGroups[index])
    )
      issue(
        ['domains'],
        'Domain manifest must account for every mesh physical group exactly once',
      );

    for (const [index, entry] of result.domains.entries()) {
      if (entry.role === 'interface') {
        if (
          !domainTags.has(entry.from_domain_tag) ||
          !domainTags.has(entry.to_domain_tag) ||
          entry.from_domain_tag === entry.to_domain_tag
        )
          issue(
            ['domains', index],
            'An interface must connect two distinct declared domains',
          );
        if (entry.normal.length !== result.dimension)
          issue(
            ['domains', index, 'normal'],
            'Interface normal rank must match the spatial dimension',
          );
        const norm = Math.hypot(...entry.normal);
        if (Math.abs(norm - 1) > 1e-6)
          issue(
            ['domains', index, 'normal'],
            'Interface normal must be a unit vector',
          );
      }
    }

    const fieldIds = new Set<string>();
    const artifactDigests = new Set([result.mesh.artifact.sha256]);
    for (const [index, field] of result.fields.entries()) {
      if (fieldIds.has(field.field_id))
        issue(['fields', index, 'field_id'], 'Field IDs must be unique');
      fieldIds.add(field.field_id);
      if (field.domain_tags.some((domain) => !domainTags.has(domain)))
        issue(
          ['fields', index, 'domain_tags'],
          'Fields must reference declared mesh domains',
        );
      if (field.component_id) {
        const componentExists = result.domains.some(
          (entry) =>
            entry.role === 'domain' &&
            entry.component_id === field.component_id &&
            field.domain_tags.includes(entry.tag),
        );
        if (!componentExists)
          issue(
            ['fields', index, 'component_id'],
            'Field component must match one of its declared domains',
          );
      }
      artifactDigests.add(field.artifact.sha256);
      if (field.artifact.format === 'msh4')
        issue(
          ['fields', index, 'artifact', 'format'],
          'Field data cannot use the mesh-only msh4 format',
        );
      if (field.value_type === 'vector') {
        const expectedAxes =
          result.coordinate_system === 'axisymmetric'
            ? ['r', 'z']
            : result.dimension === 2
              ? ['x', 'y']
              : ['x', 'y', 'z'];
        const actualAxes = field.components.map(({ axis }) => axis);
        if (
          expectedAxes.length !== actualAxes.length ||
          expectedAxes.some((axis, axisIndex) => actualAxes[axisIndex] !== axis)
        )
          issue(
            ['fields', index, 'components'],
            'Vector axes must match the result coordinate system and dimension',
          );
      }
    }

    for (const [index, output] of result.scalar_outputs.entries())
      if (output.source_ref !== result.model_id)
        issue(
          ['scalar_outputs', index, 'source_ref'],
          'Modeled scalar provenance must identify the producing model',
        );

    for (const [index, residual] of result.conservation_residuals.entries()) {
      if (
        residual.scope === 'domain' &&
        !domainTags.has(residual.scope_tag as string)
      )
        issue(
          ['conservation_residuals', index, 'scope_tag'],
          'Domain residuals must reference a declared domain',
        );
      if (
        residual.scope === 'interface' &&
        !result.domains.some(
          (entry) =>
            entry.role === 'interface' && entry.tag === residual.scope_tag,
        )
      )
        issue(
          ['conservation_residuals', index, 'scope_tag'],
          'Interface residuals must reference a declared interface',
        );
    }

    const declaredArtifactDigests = [...result.artifact_hashes].sort();
    const expectedArtifactDigests = [...artifactDigests].sort();
    if (
      new Set(declaredArtifactDigests).size !== declaredArtifactDigests.length
    )
      issue(['artifact_hashes'], 'Artifact digests must be unique');
    if (
      declaredArtifactDigests.length !== expectedArtifactDigests.length ||
      expectedArtifactDigests.some(
        (digest, index) => declaredArtifactDigests[index] !== digest,
      )
    )
      issue(
        ['artifact_hashes'],
        'Artifact digest list must match the mesh and field references',
      );
  });

export const spatialSimulationRunStatusSchema = z.enum([
  'queued',
  'preparing_geometry',
  'meshing',
  'solving',
  'postprocessing',
  'completed',
  'failed',
  'cancelled',
]);

export const spatialSimulationFailureSchema = z
  .object({
    code: identifier,
    message: z.string().trim().min(1).max(1000),
  })
  .strict();

export const spatialSimulationRunSnapshotSchema = z
  .object({
    id: identifier,
    evaluation_id: identifier.nullable(),
    model_id: identifier,
    system: z.enum(['MFC', 'MEC']),
    dimension: z.union([z.literal(2), z.literal(3)]),
    input_contract_version: identifier,
    input_sha256: sha256,
    solver_version: identifier,
    runtime_version: identifier,
    mesh_request_sha256: sha256.nullable(),
    mesh_sha256: sha256.nullable(),
    status: spatialSimulationRunStatusSchema,
    progress: z.number().int().min(0).max(100),
    result: spatialSimulationResultSchema.nullable(),
    failure: spatialSimulationFailureSchema.nullable(),
    created_at: timestamp,
    updated_at: timestamp,
    started_at: timestamp.nullable(),
    completed_at: timestamp.nullable(),
  })
  .strict()
  .superRefine((run, context) => {
    const terminal = ['completed', 'failed', 'cancelled'].includes(run.status);
    if (run.status === 'completed') {
      if (run.progress !== 100 || run.result === null || run.failure !== null)
        context.addIssue({
          code: 'custom',
          path: ['result'],
          message:
            'Completed runs require 100% progress, a result manifest and no failure',
        });
      if (
        run.result &&
        (run.result.convergence.some(
          (entry) => entry.status === 'not_converged',
        ) ||
          run.result.conservation_residuals.some((entry) => !entry.passed))
      )
        context.addIssue({
          code: 'custom',
          path: ['result'],
          message:
            'A non-converged or conservation-failing result must not be marked completed',
        });
    } else if (!['failed'].includes(run.status) && run.result !== null) {
      context.addIssue({
        code: 'custom',
        path: ['result'],
        message: 'Only completed or failed runs may carry a result manifest',
      });
    }
    if (run.status === 'failed' && run.failure === null)
      context.addIssue({
        code: 'custom',
        path: ['failure'],
        message: 'Failed runs require a structured failure reason',
      });
    if (run.status !== 'failed' && run.failure !== null)
      context.addIssue({
        code: 'custom',
        path: ['failure'],
        message: 'Only failed runs may carry a failure reason',
      });
    if (terminal !== (run.completed_at !== null))
      context.addIssue({
        code: 'custom',
        path: ['completed_at'],
        message: 'Terminal status and completion timestamp must agree',
      });
    if (run.status === 'queued' && run.started_at !== null)
      context.addIssue({
        code: 'custom',
        path: ['started_at'],
        message: 'Queued runs have not started execution',
      });
    if (run.status !== 'queued' && run.started_at === null)
      context.addIssue({
        code: 'custom',
        path: ['started_at'],
        message: 'Started or terminal runs require a start timestamp',
      });
    if (run.result) {
      if (
        run.result.run_id !== run.id ||
        run.result.evaluation_id !== run.evaluation_id ||
        run.result.model_id !== run.model_id ||
        run.result.system !== run.system ||
        run.result.input_sha256 !== run.input_sha256 ||
        run.result.mesh.request_sha256 !== run.mesh_request_sha256 ||
        run.result.dimension !== run.dimension ||
        run.result.solver_version !== run.solver_version ||
        run.result.runtime_version !== run.runtime_version ||
        run.result.mesh.artifact.sha256 !== run.mesh_sha256
      )
        context.addIssue({
          code: 'custom',
          path: ['result'],
          message: 'Result manifest must match its persisted run identity',
        });
    }
  });

export const createSpatialSimulationRunInputSchema = z
  .object({
    owner_id: identifier,
    evaluation_id: identifier.nullable().default(null),
    idempotency_key: identifier,
    model_id: identifier,
    system: z.enum(['MFC', 'MEC']),
    dimension: z.union([z.literal(2), z.literal(3)]),
    input_contract_version: identifier,
    input_sha256: sha256,
    solver_version: identifier,
    runtime_version: identifier,
    mesh_request_sha256: sha256.nullable().default(null),
  })
  .strict();

export const transitionSpatialSimulationRunInputSchema = z
  .object({
    run_id: identifier,
    owner_id: identifier,
    expected_status: spatialSimulationRunStatusSchema,
    next_status: spatialSimulationRunStatusSchema,
    progress: z.number().int().min(0).max(100),
    mesh_sha256: sha256.optional(),
    result: spatialSimulationResultSchema.optional(),
    failure: spatialSimulationFailureSchema.optional(),
  })
  .strict();

export type SpatialArtifactFormat = z.infer<typeof spatialArtifactFormatSchema>;
export type SpatialSimulationResult = z.infer<
  typeof spatialSimulationResultSchema
>;
export type SpatialSimulationRunStatus = z.infer<
  typeof spatialSimulationRunStatusSchema
>;
export type SpatialSimulationRunSnapshot = z.infer<
  typeof spatialSimulationRunSnapshotSchema
>;
export type CreateSpatialSimulationRunInput = z.input<
  typeof createSpatialSimulationRunInputSchema
>;
export type TransitionSpatialSimulationRunInput = z.infer<
  typeof transitionSpatialSimulationRunInputSchema
>;
