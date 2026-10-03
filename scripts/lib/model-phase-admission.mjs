/** Offline executable admission. Evidence applies to one exact model/run scope only. */
const hash = /^[a-f0-9]{64}$/;
const identityKeys = [
  'model_id',
  'dimension',
  'system',
  'input_sha256',
  'mesh_sha256',
  'solver_version',
  'runtime_version',
  'runtime_source_sha256',
  'time_mode',
  'advection',
];

const numerical = [
  'mass_conservation',
  'charge_conservation',
  'positivity',
  'nonlinear_convergence',
  'nonconvergence_visibility',
  'electrical_accounting',
  'zero_current',
  'zero_reaction',
  'zero_flow',
  'high_conductivity_limit',
  'zero_membrane_resistance_limit',
  'analytical_diffusion',
  'dimension_reduction',
  'mesh_refinement',
  'nonlinear_tolerance_sensitivity',
  'restart_reproducibility',
];
const product = [
  'contract',
  'provenance',
  'units',
  'stack_physics_resolution',
  'geometry',
  'mesh_topology',
  'flow',
  'species_transport',
  'charge_transport',
  'reaction',
  'membrane_cathode_circuit',
  'case_runner',
  'async_execution',
  'persistence',
  'spatial_artifacts',
  'api',
  'ui',
  'reporting',
  'ci',
];
const experiment = ['experimental_comparison'];
const independent = ['independent_holdout', 'uncertainty', 'source_review'];
const modelPolicies = {
  'structured-cell-supporting-electrolyte-v1': {
    dimensions: [2, 3],
    numerical,
    product,
  },
};

function validScope(scope) {
  return (
    scope &&
    identityKeys.every((key) => scope[key] !== undefined) &&
    modelPolicies[scope.model_id]?.dimensions.includes(scope.dimension) &&
    ['MFC', 'MEC'].includes(scope.system) &&
    ['steady', 'transient'].includes(scope.time_mode) &&
    typeof scope.advection === 'boolean' &&
    ['input_sha256', 'mesh_sha256', 'runtime_source_sha256'].every((key) =>
      hash.test(scope[key]),
    ) &&
    ['model_id', 'solver_version', 'runtime_version'].every(
      (key) => typeof scope[key] === 'string' && scope[key].trim().length > 0,
    )
  );
}

function sameScope(a, b) {
  return identityKeys.every((key) => a?.[key] === b?.[key]);
}

function inspectedEvidence(record, scope, category) {
  if (!sameScope(record.scope, scope)) return 'evidence_scope_mismatch';
  if (record.category !== category) return 'evidence_category_mismatch';
  if (!['passed', 'failed'].includes(record.status))
    return 'evidence_not_executed';
  if (record.status === 'failed') return 'executed_check_failed';
  if (
    typeof record.method !== 'string' ||
    !record.method.trim() ||
    !record.run_id?.trim() ||
    !Number.isFinite(Date.parse(record.executed_at)) ||
    !['test_fixture', 'development_case', 'independent_observation'].includes(
      record.data_role,
    )
  )
    return 'execution_provenance_missing';
  if (!Array.isArray(record.assertions) || record.assertions.length === 0)
    return 'executed_assertions_missing';
  for (const assertion of record.assertions) {
    if (
      typeof assertion.name !== 'string' ||
      !assertion.name.trim() ||
      typeof assertion.unit !== 'string' ||
      !assertion.unit.trim()
    )
      return 'assertion_identity_missing';
    if (
      !Number.isFinite(assertion.actual) ||
      !Number.isFinite(assertion.expected) ||
      !Number.isFinite(assertion.tolerance) ||
      assertion.tolerance < 0
    )
      return 'assertion_nonfinite_or_invalid';
    if (Math.abs(assertion.actual - assertion.expected) > assertion.tolerance)
      return 'measured_assertion_failed';
  }
  if (category === 'experimental' || category === 'independent') {
    if (record.data_role === 'test_fixture')
      return 'synthetic_data_cannot_establish_experimental_maturity';
    if (
      !record.dataset_id?.trim() ||
      !hash.test(record.dataset_sha256) ||
      record.condition_matched !== true ||
      record.review_state !== 'accepted'
    )
      return 'matched_reviewed_dataset_missing';
    if (
      category === 'independent' &&
      (record.data_role !== 'independent_observation' ||
        record.used_for_calibration !== false)
    )
      return 'independent_holdout_missing';
  }
  if (record.gate === 'case_runner' && record.data_role === 'test_fixture')
    return 'real_normalized_case_required';
  if (record.gate === 'mesh_refinement') {
    const levels = record.related_runs;
    if (
      !Array.isArray(levels) ||
      levels.length < 3 ||
      levels.some(
        (level) =>
          !hash.test(level.input_sha256) ||
          !hash.test(level.mesh_sha256) ||
          level.status !== 'converged' ||
          [
            'model_id',
            'dimension',
            'system',
            'solver_version',
            'runtime_version',
            'runtime_source_sha256',
          ].some((key) => level[key] !== scope[key]) ||
          !Number.isSafeInteger(level.cell_count) ||
          level.cell_count < 1,
      ) ||
      new Set(levels.map((level) => level.mesh_sha256)).size < 3 ||
      !levels.every(
        (level, index) =>
          index === 0 || level.cell_count > levels[index - 1].cell_count,
      )
    )
      return 'three_distinct_refinement_runs_required';
  }
  if (record.gate === 'time_refinement') {
    const levels = record.related_runs;
    if (
      !Array.isArray(levels) ||
      levels.length < 3 ||
      !levels.every(
        (level, index) =>
          Number.isFinite(level.time_step_s) &&
          level.time_step_s > 0 &&
          level.status === 'converged' &&
          level.model_id === scope.model_id &&
          level.dimension === scope.dimension &&
          level.system === scope.system &&
          level.solver_version === scope.solver_version &&
          level.runtime_version === scope.runtime_version &&
          level.runtime_source_sha256 === scope.runtime_source_sha256 &&
          hash.test(level.input_sha256) &&
          level.mesh_sha256 === scope.mesh_sha256 &&
          (index === 0 || level.time_step_s < levels[index - 1].time_step_s),
      )
    )
      return 'three_decreasing_timestep_runs_required';
  }
  return null;
}

function inspectGroup(evidence, required, scope, category) {
  const gaps = [];
  const passed = [];
  for (const gate of required) {
    const candidates = evidence.filter((entry) => entry.gate === gate);
    const applicable = candidates.filter((entry) =>
      sameScope(entry.scope, scope),
    );
    // A failing execution for the same scope cannot be hidden by an older PASS.
    const failure = applicable.find((entry) => entry.status === 'failed');
    const errors = (failure ? [failure] : applicable).map((entry) =>
      inspectedEvidence(entry, scope, category),
    );
    if (!failure && errors.includes(null)) passed.push(gate);
    else
      gaps.push({
        gate,
        reason:
          errors[0] ??
          (candidates.length ? 'evidence_scope_mismatch' : 'evidence_missing'),
        action: `Run ${gate} for ${scope.model_id} ${scope.dimension}D ${scope.system} with the declared input, mesh and runtime versions.`,
      });
  }
  return { passed, gaps, admitted: gaps.length === 0 };
}

/** No registry mutation and no promotion inferred from the existence of files. */
export function evaluateModelPhaseAdmission(bundle, scope) {
  if (
    bundle?.version !== 'model-verification-evidence-v1' ||
    !Array.isArray(bundle.evidence) ||
    !validScope(scope)
  )
    throw new Error('Invalid versioned evidence bundle or model scope');
  const policy = modelPolicies[scope.model_id];
  const numericalRequirements = [...policy.numerical];
  if (scope.time_mode === 'transient')
    numericalRequirements.push('time_refinement');
  if (scope.advection === true)
    numericalRequirements.push('analytical_advection_diffusion');
  const groups = {
    numerical: inspectGroup(
      bundle.evidence,
      numericalRequirements,
      scope,
      'numerical',
    ),
    product: inspectGroup(bundle.evidence, policy.product, scope, 'product'),
    experimental: inspectGroup(
      bundle.evidence,
      experiment,
      scope,
      'experimental',
    ),
    independent: inspectGroup(
      bundle.evidence,
      independent,
      scope,
      'independent',
    ),
  };
  const numericalVerified = groups.numerical.admitted;
  const developmentIntegrated = numericalVerified && groups.product.admitted;
  const phase2 = scope.dimension === 2 && developmentIntegrated;
  const phase3Prerequisites = inspectGroup(
    bundle.evidence,
    ['phase2_same_architecture', 'three_dimensional_refinement', 'performance'],
    scope,
    'product',
  );
  const phase3 =
    scope.dimension === 3 &&
    developmentIntegrated &&
    phase3Prerequisites.admitted;
  const functional = scope.dimension === 2 ? phase2 : phase3;
  return {
    version: 'model-phase-admission-v1',
    scope,
    groups,
    phase3_prerequisites: phase3Prerequisites,
    admission: {
      numerically_verified: numericalVerified,
      development_integrated: developmentIntegrated,
      phase2_functional: phase2,
      phase3_functional: phase3,
      experimentally_compared:
        numericalVerified && groups.experimental.admitted,
      independently_validated:
        numericalVerified &&
        groups.experimental.admitted &&
        groups.independent.admitted,
      production_eligible:
        functional &&
        groups.experimental.admitted &&
        groups.independent.admitted,
    },
    decision_eligible:
      functional && groups.experimental.admitted && groups.independent.admitted,
    note: 'Admission applies only to this model, dimension, system, input, mesh and runtime identity. Numerical closure does not establish predictive accuracy.',
  };
}
