import {
  scaleTransferInputSchema,
  type ScaleTransferInput,
} from '@metrev/domain-contracts';

/** Exact effective coefficients for declared ideal layers in series or parallel. */
export function calculateLayeredScaleTransfer(candidate: ScaleTransferInput) {
  const input = scaleTransferInputSchema.parse(candidate);
  const t = input.target_temperature.value;
  const within =
    t >= input.validity.temperature.minimum.value &&
    t <= input.validity.temperature.maximum.value;
  const provenance = {
    source_run_ref: input.source_run_ref,
    source_geometry_sha256: input.source_geometry_sha256,
    method: input.method,
    method_source_ref: input.method_source_ref,
    samples: input.samples,
    validity: input.validity,
    target_temperature: input.target_temperature,
  };
  const base = {
    contract_version: 'scale-transfer-layered-result-v1',
    source_scale: input.source_scale,
    target_scale: input.target_scale,
    target_domain_tag: input.target_domain_tag,
    property: input.property,
    species_id: input.species_id,
    direction_axis: input.direction_axis,
    provenance,
    decision_eligible: false,
    independent_validation: false,
    restrictions: [
      'ideal_layers_only',
      'no_pore_resolved_or_nanoscale_solver',
      'no_reaction_kinetics_homogenization',
      'no_unchecked_target_parameter_adoption',
    ],
  };
  if (!within)
    return { ...base, status: 'outside_validity_range', value: null };
  const minimum = Math.min(
    ...input.samples.map((sample) => sample.property_value.value),
  );
  const value =
    input.method === 'series_layer_harmonic'
      ? minimum /
        input.samples.reduce(
          (s, q) =>
            s + q.volume_fraction.value * (minimum / q.property_value.value),
          0,
        )
      : input.samples.reduce(
          (s, q) => s + q.volume_fraction.value * q.property_value.value,
          0,
        );
  if (!Number.isFinite(value))
    throw new RangeError('Nonfinite homogenized property');
  return {
    ...base,
    status: 'development_transfer_computed',
    value: {
      value,
      unit: input.samples[0].property_value.unit,
      source_kind: 'modeled',
      source_ref: input.source_run_ref,
    },
    bound_check: {
      minimum,
      maximum: Math.max(...input.samples.map((s) => s.property_value.value)),
    },
  };
}
