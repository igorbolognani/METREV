import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_METADATA = [
  'meaning',
  'unit',
  'form',
  'domains',
  'derivable',
  'derivation_rule',
  'physics',
  'dimensions',
];

const REQUIRED_PROVENANCE_TERMS = [
  'unit',
  'source_kind',
  'source_ref',
  'locator',
  'conditions',
];

const ALLOWED_SOURCE_KINDS = [
  'measured',
  'literature',
  'default',
  'assumption',
  'test_fixture',
];

/**
 * P03 vocabulary inventory from governance/MASTER_EXECUTION_TASK.md §28.3.
 * A null authority_parameter_id records an explicit gap in the spatial
 * parameter authority; it does not assert that the physical phenomenon is
 * absent or unsupported elsewhere in the project.
 */
export const P03_SPATIAL_PARAMETER_INVENTORY = [
  {
    concept_id: 'fluid_density',
    term: 'fluid density',
    authority_parameter_id: 'fluid_density_kg_m3',
  },
  {
    concept_id: 'dynamic_viscosity',
    term: 'dynamic viscosity',
    authority_parameter_id: 'dynamic_viscosity_pa_s',
  },
  {
    concept_id: 'kinematic_viscosity',
    term: 'kinematic viscosity',
    authority_parameter_id: 'kinematic_viscosity_m2_s',
  },
  {
    concept_id: 'porous_permeability',
    term: 'porous permeability field',
    authority_parameter_id: 'hydraulic_permeability_m2',
  },
  {
    concept_id: 'darcy_boundary_pressure',
    term: 'Darcy pressure boundary/input',
    authority_parameter_id: null,
  },
  {
    concept_id: 'darcy_flow_rate',
    term: 'Darcy flow rate',
    authority_parameter_id: null,
  },
  {
    concept_id: 'darcy_velocity',
    term: 'Darcy velocity field',
    authority_parameter_id: null,
  },
  {
    concept_id: 'brinkman_closure',
    term: 'Brinkman-specific closure/stress parameter',
    authority_parameter_id: null,
  },
  {
    concept_id: 'species_identity',
    term: 'species identity',
    authority_parameter_id: null,
  },
  {
    concept_id: 'species_valence',
    term: 'species valence',
    authority_parameter_id: null,
  },
  {
    concept_id: 'molecular_diffusivity',
    term: 'molecular/free-species diffusivity',
    authority_parameter_id: null,
  },
  {
    concept_id: 'effective_diffusivity',
    term: 'effective diffusivity',
    authority_parameter_id: 'effective_diffusivity_m2_s',
  },
  {
    concept_id: 'ion_mobility',
    term: 'ion mobility or declared derivation',
    authority_parameter_id: null,
  },
  {
    concept_id: 'inlet_concentration',
    term: 'inlet concentration',
    authority_parameter_id: null,
  },
  {
    concept_id: 'electronic_conductivity',
    term: 'electronic conductivity field',
    authority_parameter_id: 'solid_conductivity_s_m',
  },
  {
    concept_id: 'ionic_conductivity',
    term: 'ionic conductivity field',
    authority_parameter_id: 'ionic_conductivity_s_m',
  },
  {
    concept_id: 'membrane_fixed_charge',
    term: 'membrane fixed charge',
    authority_parameter_id: 'membrane_fixed_charge_mol_m3',
  },
  {
    concept_id: 'partition_coefficient',
    term: 'species partition coefficient',
    authority_parameter_id: 'partition_coefficient',
  },
  {
    concept_id: 'donnan_interface_quantities',
    term: 'Donnan interface quantities',
    authority_parameter_id: null,
  },
  {
    concept_id: 'henry_coefficient',
    term: 'Henry coefficient',
    authority_parameter_id: null,
  },
  {
    concept_id: 'gas_solubility',
    term: 'gas solubility',
    authority_parameter_id: null,
  },
  {
    concept_id: 'gas_liquid_transfer',
    term: 'gas-liquid transfer coefficient',
    authority_parameter_id: 'gas_transfer_coefficient_m_s',
  },
  {
    concept_id: 'reaction_stoichiometry',
    term: 'complete reaction stoichiometry',
    authority_parameter_id: null,
  },
  {
    concept_id: 'reaction_electron_count',
    term: 'reaction electron count',
    authority_parameter_id: null,
  },
  {
    concept_id: 'reaction_proton_count',
    term: 'reaction proton count',
    authority_parameter_id: null,
  },
  {
    concept_id: 'accessible_reactive_area',
    term: 'volumetric accessible reactive area a_v(x,y,z)',
    authority_parameter_id: 'specific_surface_area_m2_m3',
  },
  {
    concept_id: 'porosity',
    term: 'porosity field',
    authority_parameter_id: 'porosity',
  },
  {
    concept_id: 'tortuosity',
    term: 'tortuosity field',
    authority_parameter_id: 'tortuosity',
  },
  {
    concept_id: 'initial_biomass_field',
    term: 'initial biomass field',
    authority_parameter_id: null,
  },
  {
    concept_id: 'initial_biofilm_thickness',
    term: 'initial biofilm thickness',
    authority_parameter_id: null,
  },
  {
    concept_id: 'biofilm_growth',
    term: 'biofilm growth law parameters',
    authority_parameter_id: null,
  },
  {
    concept_id: 'biofilm_decay',
    term: 'biofilm decay law parameters',
    authority_parameter_id: null,
  },
  {
    concept_id: 'biofilm_detachment',
    term: 'biofilm detachment law parameters',
    authority_parameter_id: null,
  },
  {
    concept_id: 'buffer_acid_base',
    term: 'buffer and acid-base parameters',
    authority_parameter_id: null,
  },
  {
    concept_id: 'temperature_boundary_field',
    term: 'temperature boundary/field',
    authority_parameter_id: null,
  },
  {
    concept_id: 'thermal_properties',
    term: 'thermal properties',
    authority_parameter_id: null,
  },
];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasUsableDomains(value) {
  return (
    Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString)
  );
}

function hasUsableDimensions(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((dimension) => [1, 2, 3].includes(dimension))
  );
}

function isValidProvenancePolicy(authority) {
  if (
    !Array.isArray(authority?.allowed_source_kinds) ||
    !ALLOWED_SOURCE_KINDS.every((kind) =>
      authority.allowed_source_kinds.includes(kind),
    ) ||
    !isNonEmptyString(authority?.provenance_requirement)
  ) {
    return false;
  }

  const normalizedRequirement = authority.provenance_requirement.toLowerCase();
  return REQUIRED_PROVENANCE_TERMS.every((term) =>
    normalizedRequirement.includes(term),
  );
}

function missingMetadata(entry) {
  return REQUIRED_METADATA.filter((field) => {
    const value = entry?.[field];
    if (field === 'meaning' || field === 'unit')
      return !isNonEmptyString(value);
    if (field === 'form') return !['scalar', 'scalar_or_field'].includes(value);
    if (field === 'domains' || field === 'physics')
      return !hasUsableDomains(value);
    if (field === 'derivable') return typeof value !== 'boolean';
    if (field === 'derivation_rule') {
      return value !== null && !isNonEmptyString(value);
    }
    if (field === 'dimensions') return !hasUsableDimensions(value);
    return true;
  });
}

function isDerivationConsistent(entry) {
  return entry?.derivable === true
    ? isNonEmptyString(entry.derivation_rule)
    : entry?.derivable === false && entry.derivation_rule === null;
}

/** Build a stable authority-metadata coverage report without parameter values. */
export function buildSpatialParameterAuthorityCoverage(authority) {
  const parameterMap =
    authority?.parameters && typeof authority.parameters === 'object'
      ? authority.parameters
      : {};
  const provenancePolicyStatus = isValidProvenancePolicy(authority)
    ? 'known'
    : 'pending';

  const parameters = P03_SPATIAL_PARAMETER_INVENTORY.map((concept) => {
    const entry = concept.authority_parameter_id
      ? parameterMap[concept.authority_parameter_id]
      : undefined;
    const missingFields = missingMetadata(entry);
    if (
      !isDerivationConsistent(entry) &&
      !missingFields.includes('derivation_rule')
    ) {
      missingFields.push('derivation_rule');
    }
    const hasAuthorityEntry = Boolean(entry && typeof entry === 'object');
    const unitStatus = isNonEmptyString(entry?.unit) ? 'known' : 'pending';
    const domainStatus = hasUsableDomains(entry?.domains) ? 'known' : 'pending';
    const applicabilityStatus =
      domainStatus === 'known' &&
      Array.isArray(entry?.physics) &&
      entry.physics.length > 0 &&
      hasUsableDimensions(entry?.dimensions)
        ? 'known'
        : 'pending';
    const definitionStatus =
      hasAuthorityEntry &&
      missingFields.length === 0 &&
      provenancePolicyStatus === 'known'
        ? 'known'
        : 'pending';

    return {
      concept_id: concept.concept_id,
      term: concept.term,
      authority_parameter_id: concept.authority_parameter_id,
      definition_status: definitionStatus,
      unit_status: unitStatus,
      canonical_unit: unitStatus === 'known' ? entry.unit : null,
      si_unit_semantics_status:
        unitStatus === 'known'
          ? 'declared_not_independently_dimension_checked'
          : 'pending',
      provenance_policy_status: provenancePolicyStatus,
      value_source_status: 'not_supplied_by_parameter_authority',
      applicability_status: applicabilityStatus,
      domains: domainStatus === 'known' ? [...entry.domains] : [],
      domain_status: domainStatus,
      physics: Array.isArray(entry?.physics) ? [...entry.physics] : [],
      dimensions: hasUsableDimensions(entry?.dimensions)
        ? [...entry.dimensions]
        : [],
      missing_metadata_fields: missingFields.sort(),
      phenomenon_presence_status: 'not_assessed',
    };
  });

  const counts = { known: 0, pending: 0 };
  const dimensionCounts = {
    applicability: { known: 0, pending: 0 },
    domain: { known: 0, pending: 0 },
    provenance_policy: { known: 0, pending: 0 },
    unit: { known: 0, pending: 0 },
  };

  for (const parameter of parameters) {
    counts[parameter.definition_status] += 1;
    dimensionCounts.applicability[parameter.applicability_status] += 1;
    dimensionCounts.domain[parameter.domain_status] += 1;
    dimensionCounts.provenance_policy[parameter.provenance_policy_status] += 1;
    dimensionCounts.unit[parameter.unit_status] += 1;
  }

  return {
    schema_version: 1,
    report_kind: 'p03_spatial_parameter_authority_metadata_coverage',
    source: {
      requirements: 'governance/MASTER_EXECUTION_TASK.md#28.3',
      authority:
        'bioelectrochem_agent_kit/domain/ontology/spatial-parameter-authority.json',
    },
    scope: {
      description:
        'Checks spatial parameter-authority metadata coverage for selected P03 vocabulary; it does not check case values, scientific source claims, or solver support.',
      status_meaning:
        'known means the authority metadata record is complete; pending means the record or required metadata is missing.',
      pending_does_not_mean:
        'The physical phenomenon is absent, impossible, or unsupported elsewhere.',
      value_policy:
        'No parameter values or literature sources are created or inferred by this report.',
      si_unit_policy:
        'The declared unit is shown; dimensional equivalence to SI is not independently checked here.',
    },
    provenance_policy: {
      status: provenancePolicyStatus,
      allowed_source_kinds: Array.isArray(authority?.allowed_source_kinds)
        ? [...authority.allowed_source_kinds]
        : [],
      requirement: isNonEmptyString(authority?.provenance_requirement)
        ? authority.provenance_requirement
        : null,
    },
    summary: {
      total: parameters.length,
      definition_status: counts,
      metadata_dimension_status: dimensionCounts,
    },
    parameters,
  };
}

function runCli() {
  const authorityPath = fileURLToPath(
    new URL(
      '../bioelectrochem_agent_kit/domain/ontology/spatial-parameter-authority.json',
      import.meta.url,
    ),
  );
  const authority = JSON.parse(readFileSync(authorityPath, 'utf8'));
  const report = buildSpatialParameterAuthorityCoverage(authority);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (
    process.argv.includes('--strict') &&
    report.summary.definition_status.pending > 0
  ) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  runCli();
}
