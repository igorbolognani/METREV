import { z } from 'zod';
import { structuredCellInputSchema } from './structured-cell-schema';
import { structuredCellTopology } from './structured-cell-topology';
import { structuredCellFieldObservablesSchema } from './structured-cell-observables';
import {
  compileStructuredCellEquationGraph,
  structuredCellEquationGraphSchema,
} from './structured-cell-equation-graph';
import {
  spatialRuntimeInputSchema,
  spatialRuntimeInputSha256,
  spatialRuntimeMeshRequestSha256,
  type SpatialRuntimeInput,
} from './spatial-runtime-input';
import {
  spatialSpeciesBudgetSchema,
  spatialSpeciesBudgetResidual,
  spatialSpeciesBudgetMatchesLaw,
} from './spatial-species-budget';

import {
  spatialModelInputV2Schema,
  spatialModelInputV2Sha256,
} from './spatial-model-v2-schema';

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
  'json',
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

export const spatialFieldArtifactSchema = z
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
  artifact: spatialFieldArtifactSchema,
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
    derivation: z
      .discriminatedUnion('kind', [
        z
          .object({
            kind: z.literal('field_summary'),
            field_id: identifier,
            statistic: z.enum(['minimum', 'maximum', 'mean', 'integral']),
          })
          .strict(),
        z
          .object({
            kind: z.literal('field_component_summary'),
            field_id: identifier,
            axis: z.enum(['x', 'y', 'z', 'r']),
            statistic: z.enum(['minimum', 'maximum', 'mean', 'integral']),
          })
          .strict(),
      ])
      .optional(),
  })
  .strict();

type ScalarOutputDerivation = NonNullable<
  z.infer<typeof scalarOutputSchema>['derivation']
>;

const fieldMeasureDimension: Record<
  z.infer<typeof summarySchema>['integration_measure'],
  number
> = {
  domain_length: 1,
  domain_area: 2,
  domain_volume: 3,
  boundary_length: 2,
  boundary_area: 3,
};

const fieldMeasureLengthPower: Record<
  z.infer<typeof summarySchema>['integration_measure'],
  number
> = {
  domain_length: 1,
  domain_area: 2,
  domain_volume: 3,
  boundary_length: 1,
  boundary_area: 2,
};

// The current spatial variable authority uses this closed set of canonical
// units. Keep the dimensional algebra here deliberately limited to those
// units; adding a new state unit requires adding its SI dimensions here.
const fieldUnitDimensions: Record<string, Record<string, number>> = {
  'mol/m3': { mol: 1, m: -3 },
  V: { V: 1 },
  Pa: { Pa: 1 },
  'm/s': { m: 1, s: -1 },
  K: { K: 1 },
  'kg/m3': { kg: 1, m: -3 },
  m: { m: 1 },
};

const unitSymbolOrder = ['mol', 'kg', 'V', 'Pa', 'A', 'K', 'm', 's'];

function integratedUnit(
  fieldUnit: string,
  measureLengthPower: number,
): string | null {
  const fieldDimensions = fieldUnitDimensions[fieldUnit];
  if (!fieldDimensions) return null;
  const dimensions: Record<string, number> = {
    ...fieldDimensions,
    m: (fieldDimensions.m ?? 0) + measureLengthPower,
  };
  const formatSide = (sign: 1 | -1) =>
    unitSymbolOrder
      .filter((symbol) => (dimensions[symbol] ?? 0) * sign > 0)
      .map((symbol) => {
        const power = Math.abs(dimensions[symbol]);
        return `${symbol}${power === 1 ? '' : power}`;
      });
  const numerator = formatSide(1).join('*') || '1';
  const denominator = formatSide(-1).join('*');
  return denominator ? `${numerator}/${denominator}` : numerator;
}

function summaryValue(
  summary: z.infer<typeof summarySchema>,
  statistic: ScalarOutputDerivation['statistic'],
): number {
  return statistic === 'minimum' ||
    statistic === 'maximum' ||
    statistic === 'mean'
    ? summary[statistic]
    : summary.integral;
}

function summaryUnit(
  fieldUnit: string,
  summary: z.infer<typeof summarySchema>,
): string | null {
  return integratedUnit(
    fieldUnit,
    fieldMeasureLengthPower[summary.integration_measure],
  );
}

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
    species_budget: spatialSpeciesBudgetSchema.optional(),
    unit,
    relative_residual: z.number().finite().nonnegative(),
    tolerance: z.number().finite().nonnegative(),
    passed: z.boolean(),
  })
  .strict()
  .superRefine((residual, context) => {
    if (residual.species_budget) {
      const measured = spatialSpeciesBudgetResidual(residual.species_budget);
      if (
        residual.kind !== 'species_mass' ||
        residual.unit !== 'mol/(m*s)' ||
        Math.abs(measured.absolute - residual.absolute_residual) >
          1e-10 *
            Math.max(measured.absolute, residual.absolute_residual, 1e-30) ||
        Math.abs(measured.relative - residual.relative_residual) > 1e-12
      )
        context.addIssue({
          code: 'custom',
          path: ['species_budget'],
          message:
            'Species residual must match its measured production, loss and outward flux budget',
        });
    }
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

/** Direct linear-solver outcomes are distinct from nonlinear residual histories. */
const linearSolverDiagnosticSchema = z
  .object({
    solver_id: identifier,
    method: identifier,
    status: z.enum(['converged', 'not_converged']),
    iterations: z.number().int().nonnegative(),
    termination_reason: identifier,
    termination_code: z.number().int().optional(),
  })
  .strict()
  .superRefine((solver, context) => {
    if (
      solver.status === 'converged' &&
      solver.termination_code !== undefined &&
      solver.termination_code <= 0
    )
      context.addIssue({
        code: 'custom',
        path: ['termination_code'],
        message:
          'A converged solver must have a positive termination code when one is supplied',
      });
    if (
      solver.status === 'not_converged' &&
      solver.termination_code !== undefined &&
      solver.termination_code > 0
    )
      context.addIssue({
        code: 'custom',
        path: ['termination_code'],
        message:
          'A non-converged solver must not have a positive termination code',
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
    contract_version: z.enum([
      'spatial-simulation-result-v1',
      'spatial-simulation-result-v2',
      'spatial-simulation-result-v3',
    ]),
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
    linear_solver_diagnostics: z
      .array(linearSolverDiagnosticSchema)
      .min(1)
      .max(128)
      .optional(),
    warnings: z.array(warningSchema).max(500),
    unsupported_physics: z.array(unsupportedPhysicsSchema).max(128),
    artifact_hashes: z.array(sha256).min(1).max(513),
    equation_graph: structuredCellEquationGraphSchema.optional(),
    cell_circuit: z
      .object({
        collector_voltage_V: z.number().finite(),
        anodic_current_A: z.number().finite(),
        signed_electrical_power_W: z.number().finite(),
        mfc_generated_power_W: z.number().finite().nullable(),
        mec_electrical_input_W: z.number().finite().nullable(),
      })
      .strict()
      .optional(),
    structured_cell_field_observables:
      structuredCellFieldObservablesSchema.optional(),
  })
  .strict()
  .superRefine((result, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message });
    if (
      result.equation_graph &&
      (result.contract_version !== 'spatial-simulation-result-v3' ||
        result.model_id !== result.equation_graph.model_id ||
        result.dimension !== result.equation_graph.dimension)
    )
      issue(
        ['equation_graph'],
        'Equation graph must match the restricted result-v3 profile and dimension',
      );
    if (result.cell_circuit) {
      const c = result.cell_circuit;
      if (
        result.contract_version !== 'spatial-simulation-result-v3' ||
        Math.abs(
          c.signed_electrical_power_W -
            c.collector_voltage_V * c.anodic_current_A,
        ) >
          1e-12 * Math.max(1, Math.abs(c.signed_electrical_power_W))
      )
        issue(
          ['cell_circuit'],
          'Circuit power must bind to current and voltage in result-v3',
        );
      if (
        result.system === 'MFC'
          ? c.mfc_generated_power_W !== c.signed_electrical_power_W ||
            c.mec_electrical_input_W !== null
          : c.mec_electrical_input_W !== -c.signed_electrical_power_W ||
            c.mfc_generated_power_W !== null
      )
        issue(
          ['cell_circuit'],
          'MEC electrical input and MFC generated output must remain distinct',
        );
    }
    const fieldObservables = result.structured_cell_field_observables;
    if (fieldObservables) {
      if (
        result.contract_version !== 'spatial-simulation-result-v3' ||
        result.input_contract_version !== 'spatial-cell-input-v1' ||
        result.model_id !== 'structured-cell-supporting-electrolyte-v1'
      )
        issue(
          ['structured_cell_field_observables'],
          'Field extrema are restricted to the structured-cell development profile',
        );
      if (
        fieldObservables.input_sha256 !== result.input_sha256 ||
        fieldObservables.mesh_sha256 !== result.mesh.artifact.sha256 ||
        fieldObservables.geometry_request_sha256 !==
          result.mesh.request_sha256 ||
        fieldObservables.fields.length !== result.fields.length
      )
        issue(
          ['structured_cell_field_observables'],
          'Field extrema must reference this immutable input, geometry request, and mesh',
        );
      for (const entry of fieldObservables.fields) {
        const field = result.fields.find(
          (candidate) => candidate.field_id === entry.field_id,
        );
        if (
          !field ||
          field.value_type !== 'scalar' ||
          field.association !== entry.association ||
          field.unit !== entry.unit ||
          field.artifact.sha256 !== entry.field_artifact_sha256 ||
          field.artifact.dataset_path !== entry.dataset_path ||
          field.summary.minimum !== entry.minimum.value ||
          field.summary.maximum !== entry.maximum.value
        )
          issue(
            ['structured_cell_field_observables', 'fields'],
            'Field extrema must match their persisted field artifact and summary',
          );
      }
    }
    if (
      result.contract_version === 'spatial-simulation-result-v1' &&
      result.linear_solver_diagnostics !== undefined
    )
      issue(
        ['linear_solver_diagnostics'],
        'Linear solver diagnostics require spatial-simulation-result-v2',
      );
    if (
      result.linear_solver_diagnostics &&
      new Set(result.linear_solver_diagnostics.map((entry) => entry.solver_id))
        .size !== result.linear_solver_diagnostics.length
    )
      issue(
        ['linear_solver_diagnostics'],
        'Linear solver identifiers must be unique',
      );
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
    const validateSummary = (
      summary: z.infer<typeof summarySchema>,
      fieldUnit: string,
      path: (string | number)[],
    ) => {
      const axisymmetricPhysicalMeasure =
        result.coordinate_system === 'axisymmetric' &&
        ['domain_volume', 'boundary_area'].includes(
          summary.integration_measure,
        );
      if (
        fieldMeasureDimension[summary.integration_measure] !==
        (axisymmetricPhysicalMeasure ? 3 : result.dimension)
      )
        issue(
          [...path, 'integration_measure'],
          'Integration measure dimension must match the spatial or axisymmetric physical dimension',
        );
      const expectedUnit = summaryUnit(fieldUnit, summary);
      if (!expectedUnit)
        issue(
          [...path, 'integral_unit'],
          `No dimensional rule is registered for field unit ${fieldUnit}`,
        );
      else if (summary.integral_unit !== expectedUnit)
        issue(
          [...path, 'integral_unit'],
          `Expected integral unit ${expectedUnit} for ${fieldUnit} over ${summary.integration_measure}`,
        );
    };
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
        if (result.contract_version !== 'spatial-simulation-result-v1')
          for (const [componentIndex, component] of field.components.entries())
            validateSummary(component.summary, field.unit, [
              'fields',
              index,
              'components',
              componentIndex,
              'summary',
            ]);
      } else {
        if (result.contract_version !== 'spatial-simulation-result-v1')
          validateSummary(field.summary, field.unit, [
            'fields',
            index,
            'summary',
          ]);
      }
    }

    const metricIds = new Set<string>();
    for (const [index, output] of result.scalar_outputs.entries()) {
      if (metricIds.has(output.metric_id))
        issue(
          ['scalar_outputs', index, 'metric_id'],
          'Metric IDs must be unique',
        );
      metricIds.add(output.metric_id);
      if (output.source_ref !== result.model_id)
        issue(
          ['scalar_outputs', index, 'source_ref'],
          'Modeled scalar provenance must identify the producing model',
        );
      if (result.contract_version === 'spatial-simulation-result-v1') {
        if (output.derivation !== undefined)
          issue(
            ['scalar_outputs', index, 'derivation'],
            'The v1 result contract does not accept v2 derivation metadata',
          );
        continue;
      }
      const derivation = output.derivation;
      if (derivation === undefined) {
        issue(
          ['scalar_outputs', index, 'derivation'],
          'A v2 scalar output must declare its source field statistic',
        );
        continue;
      }
      const sourceField = result.fields.find(
        (field) => field.field_id === derivation.field_id,
      );
      if (
        !sourceField ||
        (derivation.kind === 'field_summary' &&
          sourceField.value_type !== 'scalar') ||
        (derivation.kind === 'field_component_summary' &&
          sourceField.value_type !== 'vector')
      ) {
        issue(
          ['scalar_outputs', index, 'derivation', 'field_id'],
          'A metric must reference a field of its declared derivation kind',
        );
      } else {
        const summary =
          sourceField.value_type === 'scalar'
            ? sourceField.summary
            : sourceField.components.find(
                (component) =>
                  derivation.kind === 'field_component_summary' &&
                  component.axis === derivation.axis,
              )?.summary;
        if (!summary) {
          issue(
            ['scalar_outputs', index, 'derivation', 'axis'],
            'Vector metric axis must identify a declared component',
          );
          continue;
        }
        const expectedValue = summaryValue(summary, derivation.statistic);
        const expectedUnit =
          derivation.statistic === 'integral'
            ? summary.integral_unit
            : sourceField.unit;
        if (output.unit !== expectedUnit)
          issue(
            ['scalar_outputs', index, 'unit'],
            `Expected ${expectedUnit} for the declared field statistic`,
          );
        const scale = Math.max(
          1,
          Math.abs(expectedValue),
          Math.abs(output.value),
        );
        if (Math.abs(output.value - expectedValue) > 1e-12 * scale)
          issue(
            ['scalar_outputs', index, 'value'],
            'A field-summary metric must equal its declared source statistic',
          );
      }
    }

    for (const [index, residual] of result.conservation_residuals.entries()) {
      if (
        residual.species_budget &&
        (result.contract_version !== 'spatial-simulation-result-v2' ||
          result.dimension !== 2 ||
          result.coordinate_system !== 'cartesian')
      )
        issue(
          ['conservation_residuals', index, 'species_budget'],
          'Per-depth species budgets require Cartesian 2D result-v2',
        );
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

/** Bind scalar states and explicitly composed vector views to immutable input. */
export function spatialSimulationResultForInputSchema(
  candidate: SpatialRuntimeInput,
  admittedInputSha256?: string,
) {
  if (candidate.contract_version === 'spatial-cell-input-v1') {
    const input = structuredCellInputSchema.parse(candidate);
    return spatialSimulationResultSchema.superRefine((result, context) => {
      const issue = (message: string) =>
        context.addIssue({ code: 'custom', message });
      if (
        result.contract_version !== 'spatial-simulation-result-v3' ||
        result.input_contract_version !== input.contract_version ||
        result.input_sha256 !==
          (admittedInputSha256 ?? spatialRuntimeInputSha256(input)) ||
        result.model_id !== input.model_id ||
        result.dimension !== input.dimension ||
        result.system !== input.system ||
        result.coordinate_system !== input.coordinate_system
      )
        issue('Cell result identity differs from its immutable input');
      if (
        result.mesh.request_sha256 !== spatialRuntimeMeshRequestSha256(input) ||
        result.mesh.geometry_version !== input.geometry.geometry_version ||
        result.mesh.generated_with.name !== 'metrev-structured-fv' ||
        result.mesh.artifact.format !== 'json'
      )
        issue('Cell mesh differs from its geometry request');
      const expected = [
        'liquid_potential',
        'solid_potential_anode',
        'solid_potential_cathode',
        ...input.species.map((s) => 'concentration_' + s.id),
      ].sort();
      if (
        result.fields
          .map((f) => f.field_id)
          .sort()
          .join() !== expected.join()
      )
        issue('Cell fields must cover every admitted state exactly');
      const domains = result.domains.filter((d) => d.role === 'domain');
      if (
        domains.length !== input.geometry.layers.length ||
        domains.some(
          (d) =>
            !input.geometry.layers.some(
              (l) => l.tag === d.tag && l.kind === d.kind,
            ),
        )
      )
        issue('Cell regions differ from input');
      for (const f of result.fields)
        if (
          f.variable_id !== f.field_id ||
          f.association !== 'mesh_cells' ||
          f.value_type !== 'scalar' ||
          f.unit !== (f.field_id.startsWith('concentration_') ? 'mol/m3' : 'V')
        )
          issue('Invalid cell field meaning or unit');
      const observables = result.structured_cell_field_observables;
      if (observables) {
        const expectedMesh = structuredCellTopology(input);
        const close = (actual: number, expected: number) =>
          Math.abs(actual - expected) <=
          1e-12 * Math.max(Math.abs(actual), Math.abs(expected), 1e-30);
        for (const entry of observables.fields) {
          const field = result.fields.find(
            (candidate) => candidate.field_id === entry.field_id,
          );
          for (const statistic of ['minimum', 'maximum'] as const) {
            const point = entry[statistic];
            const expectedCenter = expectedMesh.centers_m[point.cell_index];
            const expectedSize = expectedMesh.sizes_m[point.cell_index];
            const expectedRegion = expectedMesh.region_index[point.cell_index];
            if (
              !field ||
              point.cell_index >= expectedMesh.centers_m.length ||
              !field.domain_tags.includes(
                input.geometry.layers[point.region_index]?.tag,
              ) ||
              point.region_index !== expectedRegion ||
              point.domain_tag !== input.geometry.layers[expectedRegion]?.tag ||
              point.cell_center_m.length !== input.dimension ||
              point.cell_size_m.length !== input.dimension ||
              point.cell_center_m.some(
                (value, axis) => !close(value, expectedCenter[axis]),
              ) ||
              point.cell_size_m.some(
                (value, axis) => !close(value, expectedSize[axis]),
              )
            )
              issue(
                'Derived extremum position differs from the admitted cell mesh',
              );
          }
        }
      }
      if (!result.cell_circuit) issue('Cell circuit diagnostics are required');
      if (input.case_context && !result.equation_graph)
        issue(
          'Case-bound cell results require their fixed-profile equation graph',
        );
      if (
        input.case_context &&
        result.evaluation_id !== input.case_context.evaluation_id
      )
        issue(
          'Cell evaluation binding differs from its immutable case context',
        );
      if (
        result.equation_graph &&
        JSON.stringify(result.equation_graph) !==
          JSON.stringify(compileStructuredCellEquationGraph(input))
      )
        issue('Equation graph differs from admitted fixed-profile assembly');
    });
  }
  const input = spatialModelInputV2Schema.parse(candidate);
  const variables = new Map(
    input.variables.map((variable) => [variable.id, variable]),
  );
  const vectors = new Map(
    (input.vector_outputs ?? []).map((vector) => [vector.id, vector]),
  );
  const layers = new Map(
    input.geometry.layers.map((layer) => [layer.tag, layer]),
  );
  const boundaries = new Map(
    Object.values(input.geometry.boundaries).map((boundary) => [
      boundary.tag,
      boundary,
    ]),
  );
  const interfaces = new Map(
    input.mesh.interfaces.map((face) => [face.tag, face]),
  );
  // PostgreSQL jsonb can reorder object keys. Persisted runs carry the
  // original digest computed at admission before the JSONB round trip.
  const inputHash = admittedInputSha256 ?? spatialModelInputV2Sha256(input);
  return spatialSimulationResultSchema.superRefine((result, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message });
    if (result.contract_version !== 'spatial-simulation-result-v2')
      issue(
        ['contract_version'],
        'New input-bound runs must use spatial-simulation-result-v2',
      );
    if (
      result.input_sha256 !== inputHash ||
      result.input_contract_version !== input.contract_version
    )
      issue(
        ['input_sha256'],
        'Result must bind to the immutable spatial input snapshot',
      );
    if (
      result.dimension !== input.dimension ||
      result.coordinate_system !== input.coordinate_system
    )
      issue(
        ['dimension'],
        'Result coordinates and dimension must match the input',
      );

    const transport =
      input.darcy_transport_development ?? input.stokes_transport_development;
    const law = transport?.linear_source_loss;
    const budgets = result.conservation_residuals.filter(
      (residual) => residual.species_budget,
    );
    const concentration = result.fields.find(
      (field) => field.variable_id === transport?.concentration_variable,
    );
    if (law) {
      const area =
        input.geometry.height_m.value *
        input.geometry.layers.reduce(
          (sum, layer) => sum + layer.width_m.value,
          0,
        );
      if (
        budgets.length !== 1 ||
        concentration?.value_type !== 'scalar' ||
        !spatialSpeciesBudgetMatchesLaw(
          budgets[0].species_budget!,
          law,
          transport!.concentration_variable,
          area,
          concentration.summary.integral,
        )
      )
        issue(
          ['conservation_residuals'],
          'Source/loss runs require the measured budget bound to input and concentration integral',
        );
    } else if (budgets.length)
      issue(
        ['conservation_residuals'],
        'Source-free input cannot claim a reaction budget',
      );

    const inputGroupTags = Object.keys(input.mesh.physical_groups).sort();
    const resultGroupTags = Object.keys(result.mesh.physical_groups).sort();
    if (
      inputGroupTags.length !== resultGroupTags.length ||
      inputGroupTags.some(
        (tag, index) =>
          tag !== resultGroupTags[index] ||
          input.mesh.physical_groups[tag] !== result.mesh.physical_groups[tag],
      )
    )
      issue(
        ['mesh', 'physical_groups'],
        'Result physical groups must preserve the admitted mesh tag-to-ID map',
      );
    if (
      result.mesh.artifact.sha256 !== input.mesh.sha256 ||
      result.mesh.geometry_version !== input.geometry.geometry_version ||
      result.mesh.refinement_factor !== input.mesh.refinement_factor ||
      result.mesh.request_sha256 !== input.mesh.input_sha256 ||
      result.mesh.generated_with.version !== input.mesh.gmsh_version
    )
      issue(
        ['mesh'],
        'Result mesh identity must match the immutable admitted mesh',
      );

    const resultDomains = result.domains.filter(
      (entry) => entry.role === 'domain',
    );
    const resultBoundaries = result.domains.filter(
      (entry) => entry.role === 'boundary',
    );
    const resultInterfaces = result.domains.filter(
      (entry) => entry.role === 'interface',
    );
    const expectedGroupCount =
      input.geometry.layers.length + boundaries.size + interfaces.size;
    if (
      result.domains.length !== expectedGroupCount ||
      resultDomains.length !== layers.size ||
      resultBoundaries.length !== boundaries.size ||
      resultInterfaces.length !== interfaces.size
    )
      issue(
        ['domains'],
        'Result domain roles must cover the admitted regions, boundaries and interfaces exactly once',
      );

    for (const [index, entry] of result.domains.entries()) {
      if (entry.role === 'domain') {
        const layer = layers.get(entry.tag);
        const groupTag = `region:${entry.tag}`;
        if (
          !layer ||
          entry.kind !== layer.kind ||
          entry.physical_group_tag !== groupTag ||
          entry.physical_group_id !== input.mesh.physical_groups[groupTag] ||
          entry.component_id !== input.mesh.component_map[entry.tag]
        )
          issue(
            ['domains', index],
            'Result domain kind, component and physical group must match the admitted geometry',
          );
      } else if (entry.role === 'boundary') {
        const boundary = boundaries.get(entry.tag);
        const groupTag = `boundary:${entry.tag}`;
        const expectedKind =
          boundary?.role === 'electrode' ? 'electrode_contact' : boundary?.role;
        if (
          !boundary ||
          entry.boundary_kind !== expectedKind ||
          entry.component_id !== undefined ||
          entry.physical_group_tag !== groupTag ||
          entry.physical_group_id !== input.mesh.physical_groups[groupTag]
        )
          issue(
            ['domains', index],
            'Result boundary role and physical group must match the admitted geometry',
          );
      } else {
        const face = interfaces.get(entry.physical_group_tag);
        if (
          !face ||
          entry.tag !== face.tag ||
          entry.from_domain_tag !== face.from_tag ||
          entry.to_domain_tag !== face.to_tag ||
          entry.physical_group_id !==
            input.mesh.physical_groups[entry.physical_group_tag] ||
          entry.normal.length !== face.normal.length ||
          entry.normal.some((value, axis) => value !== face.normal[axis])
        )
          issue(
            ['domains', index],
            'Result interface orientation and physical group must match the admitted mesh',
          );
      }
    }

    const requestedOutputs = new Set(input.requested_outputs);
    const returnedOutputs = new Set<string>();
    for (const [index, field] of result.fields.entries()) {
      const variable = variables.get(field.variable_id);
      const vector = vectors.get(field.variable_id);
      if (!variable && !vector) {
        issue(
          ['fields', index, 'variable_id'],
          'Result field requires an input-declared variable or vector view',
        );
        continue;
      }
      if (!requestedOutputs.has(field.variable_id))
        issue(
          ['fields', index, 'variable_id'],
          'Result fields must be limited to the requested output set',
        );
      returnedOutputs.add(field.variable_id);
      if (vector) {
        const components = vector.components.map(({ variable_id }) =>
          variables.get(variable_id),
        );
        if (field.value_type !== 'vector')
          issue(
            ['fields', index, 'value_type'],
            'Declared vector views require vector fields',
          );
        if (field.unit !== components[0]?.unit)
          issue(
            ['fields', index, 'unit'],
            'Vector field unit must match its component state variables',
          );
        if (
          field.domain_tags.some((tag) =>
            components.some(
              (component) => !component?.domain_tags.includes(tag),
            ),
          )
        )
          issue(
            ['fields', index, 'domain_tags'],
            'Vector field must be defined in every component state domain',
          );
        continue;
      }
      if (field.unit !== variable!.unit)
        issue(
          ['fields', index, 'unit'],
          `Expected canonical variable unit ${variable!.unit}`,
        );
      if (field.domain_tags.some((tag) => !variable!.domain_tags.includes(tag)))
        issue(
          ['fields', index, 'domain_tags'],
          'Result field exceeds its declared variable domains',
        );
      if (field.value_type !== 'scalar')
        issue(
          ['fields', index, 'value_type'],
          'Current input variable kinds require scalar state fields',
        );
    }
    for (const [index, variableId] of input.requested_outputs.entries())
      if (!returnedOutputs.has(variableId))
        issue(
          ['requested_outputs', index],
          `Requested output ${variableId} is missing from the result fields`,
        );
  });
}

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
    attempt_count: z.number().int().min(0).max(3),
    max_attempts: z.number().int().min(1).max(3),
    retry_count: z.number().int().min(0).max(2),
    retry_of_run_id: identifier.nullable(),
    cancellation_requested: z.boolean(),
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
          run.result.linear_solver_diagnostics?.some(
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
    const cancelledBeforeStart =
      run.status === 'cancelled' && run.started_at === null;
    if (
      run.status !== 'queued' &&
      run.started_at === null &&
      !cancelledBeforeStart
    )
      context.addIssue({
        code: 'custom',
        path: ['started_at'],
        message: 'Started or terminal runs require a start timestamp',
      });
    if (run.cancellation_requested && run.status === 'completed')
      context.addIssue({
        code: 'custom',
        path: ['cancellation_requested'],
        message:
          'A completed run cannot have an outstanding cancellation request',
      });
    if (run.status === 'cancelled' && !run.cancellation_requested)
      context.addIssue({
        code: 'custom',
        path: ['cancellation_requested'],
        message: 'Cancelled runs must retain the cancellation request state',
      });
    if (run.retry_count === 0 && run.retry_of_run_id !== null)
      context.addIssue({
        code: 'custom',
        path: ['retry_of_run_id'],
        message: 'A retry run must have a positive retry count',
      });
    if (run.retry_count > 0 && run.retry_of_run_id === null)
      context.addIssue({
        code: 'custom',
        path: ['retry_of_run_id'],
        message: 'A retried run must reference the run it retries',
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
    input_snapshot: spatialRuntimeInputSchema,
  })
  .strict()
  .superRefine((input, context) => {
    const bindings: Array<[string, unknown, unknown]> = [
      ['model_id', input.model_id, input.input_snapshot.model_id],
      ['system', input.system, input.input_snapshot.system],
      ['dimension', input.dimension, input.input_snapshot.dimension],
      [
        'input_contract_version',
        input.input_contract_version,
        input.input_snapshot.contract_version,
      ],
      [
        'input_sha256',
        input.input_sha256,
        spatialRuntimeInputSha256(input.input_snapshot),
      ],
      [
        'mesh_request_sha256',
        input.mesh_request_sha256,
        spatialRuntimeMeshRequestSha256(input.input_snapshot),
      ],
    ];
    for (const [field, actual, expected] of bindings) {
      if (actual !== expected)
        context.addIssue({
          code: 'custom',
          path: [field],
          message:
            'Run identity must match the immutable spatial input snapshot',
        });
    }
  });

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

export const claimSpatialSimulationRunInputSchema = z
  .object({
    worker_id: z.string().trim().min(1).max(128),
    solver_version: identifier,
    runtime_version: identifier,
    lease_duration_ms: z.number().int().min(1_000).max(300_000),
  })
  .strict();

export const spatialSimulationRunLeaseInputSchema = z
  .object({
    run_id: identifier,
    owner_id: identifier,
    worker_id: z.string().trim().min(1).max(128),
    lease_token: z.string().uuid(),
    lease_duration_ms: z.number().int().min(1_000).max(300_000),
  })
  .strict();

export const retrySpatialSimulationRunInputSchema = z
  .object({
    run_id: identifier,
    owner_id: identifier,
    idempotency_key: z.string().trim().min(1).max(128),
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
export type ClaimSpatialSimulationRunInput = z.infer<
  typeof claimSpatialSimulationRunInputSchema
>;
export type SpatialSimulationRunLeaseInput = z.infer<
  typeof spatialSimulationRunLeaseInputSchema
>;
export type RetrySpatialSimulationRunInput = z.infer<
  typeof retrySpatialSimulationRunInputSchema
>;
