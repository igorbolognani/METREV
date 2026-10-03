import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildSpatialParameterAuthorityCoverage,
  P03_SPATIAL_PARAMETER_INVENTORY,
} from '../../scripts/spatial-parameter-authority-coverage.mjs';

const authority = JSON.parse(
  readFileSync(
    'bioelectrochem_agent_kit/domain/ontology/spatial-parameter-authority.json',
    'utf8',
  ),
);

describe('P03 spatial parameter-authority coverage', () => {
  it('reports declared metadata and keeps value provenance separate', () => {
    const report = buildSpatialParameterAuthorityCoverage(authority);
    const permeability = report.parameters.find(
      (parameter) => parameter.concept_id === 'porous_permeability',
    );

    expect(report.source.requirements).toBe(
      'governance/MASTER_EXECUTION_TASK.md#28.3',
    );
    expect(report.provenance_policy.status).toBe('known');
    expect(permeability).toMatchObject({
      definition_status: 'known',
      unit_status: 'known',
      canonical_unit: 'm2',
      provenance_policy_status: 'known',
      value_source_status: 'not_supplied_by_parameter_authority',
      domain_status: 'known',
      applicability_status: 'known',
      phenomenon_presence_status: 'not_assessed',
    });
    expect(permeability.domains).toContain('anode');
    expect(permeability.physics).toContain('darcy_flow');
    expect(permeability).not.toHaveProperty('value');
    expect(permeability).not.toHaveProperty('source_ref');
  });

  it('exposes missing P03 vocabulary as pending without asserting phenomenon absence', () => {
    const report = buildSpatialParameterAuthorityCoverage(authority);
    const pendingIds = report.parameters
      .filter((parameter) => parameter.definition_status === 'pending')
      .map((parameter) => parameter.concept_id);

    expect(pendingIds).toEqual(['species_identity', 'reaction_stoichiometry']);
    expect(
      report.parameters.find(
        (entry) => entry.concept_id === 'molecular_diffusivity',
      ),
    ).toMatchObject({
      definition_status: 'known',
      canonical_unit: 'm2/s',
      value_source_status: 'not_supplied_by_parameter_authority',
    });
    expect(report.summary.definition_status.known).toBeGreaterThan(0);
    expect(report.summary.definition_status.pending).toBeGreaterThan(0);
    expect(
      report.parameters.every(
        (parameter) => parameter.phenomenon_presence_status === 'not_assessed',
      ),
    ).toBe(true);
    expect(report.scope.pending_does_not_mean).toContain('absent');
  });

  it('marks incomplete unit, domain, and provenance metadata pending', () => {
    const incomplete = structuredClone(authority);
    incomplete.parameters.porosity.unit = '';
    incomplete.parameters.porosity.domains = [];
    incomplete.provenance_requirement = 'Every value needs a locator.';

    const report = buildSpatialParameterAuthorityCoverage(incomplete);
    const porosity = report.parameters.find(
      (parameter) => parameter.concept_id === 'porosity',
    );

    expect(report.provenance_policy.status).toBe('pending');
    expect(porosity).toMatchObject({
      definition_status: 'pending',
      unit_status: 'pending',
      canonical_unit: null,
      provenance_policy_status: 'pending',
      domain_status: 'pending',
      applicability_status: 'pending',
    });
    expect(porosity.missing_metadata_fields).toContain('unit');
    expect(porosity.missing_metadata_fields).toContain('domains');
  });

  it('is stable across repeated runs and inventories each declared P03 concept', () => {
    const first = buildSpatialParameterAuthorityCoverage(authority);
    const second = buildSpatialParameterAuthorityCoverage(authority);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.parameters).toHaveLength(
      P03_SPATIAL_PARAMETER_INVENTORY.length,
    );
    expect(first).not.toHaveProperty('generated_at');
  });
});
