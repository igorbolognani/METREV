import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadYamlFile } from '@metrev/domain-contracts';
import {
  COMPONENT_MODEL_PARAMETER_GROUPS,
  MODEL_FIDELITY_PROFILES,
} from '@metrev/electrochem-models';

interface DomainModelFidelityCatalog {
  fidelities: Array<{
    id: string;
    spatial_dimension: number;
    temporal: boolean;
    scales: string[];
    status: string;
    required_component_parameters: string[];
    required_spatial_inputs: string[];
    references: string[];
  }>;
  component_parameter_groups: Record<string, string[]>;
  component_parameter_catalog: Record<
    string,
    { unit: string; scales: string[]; purpose: string }
  >;
}

const domainCatalog = loadYamlFile<DomainModelFidelityCatalog>(
  resolve(
    process.cwd(),
    'bioelectrochem_agent_kit/domain/ontology/model-fidelity.yml',
  ),
);

describe('multi-scale model fidelity catalog', () => {
  it('keeps the runtime profile dimensions and status aligned with the domain ontology', () => {
    expect(
      MODEL_FIDELITY_PROFILES.map((profile) => ({
        id: profile.id,
        spatial_dimension: profile.spatialDimension,
        temporal: profile.temporal,
        scales: profile.scales,
        status: profile.status,
        required_component_parameters: profile.requiredComponentParameters,
        required_spatial_inputs: profile.requiredSpatialInputs,
      })),
    ).toEqual(
      domainCatalog.fidelities.map((profile) => ({
        id: profile.id,
        spatial_dimension: profile.spatial_dimension,
        temporal: profile.temporal,
        scales: profile.scales,
        status: profile.status,
        required_component_parameters: profile.required_component_parameters,
        required_spatial_inputs: profile.required_spatial_inputs,
      })),
    );
    expect(
      MODEL_FIDELITY_PROFILES.filter(
        (profile) => profile.status === 'executable',
      ).map((profile) => profile.id),
    ).toEqual(['coupled-0d-dae-v1']);
  });

  it('keeps every component property ID and SI unit aligned with the domain catalog', () => {
    const runtimeIds = COMPONENT_MODEL_PARAMETER_GROUPS.flatMap((group) => {
      expect(domainCatalog.component_parameter_groups[group.id]).toEqual(
        group.parameters.map((parameter) => parameter.id),
      );
      return group.parameters.map((parameter) => parameter.id);
    });

    expect([...new Set(runtimeIds)].sort()).toEqual(
      Object.keys(domainCatalog.component_parameter_catalog).sort(),
    );

    for (const group of COMPONENT_MODEL_PARAMETER_GROUPS) {
      for (const parameter of group.parameters) {
        const source = domainCatalog.component_parameter_catalog[parameter.id];
        expect(source, parameter.id).toBeDefined();
        expect(source.unit, parameter.id).toBe(parameter.unit);
        expect(source.scales, parameter.id).toEqual(parameter.scales);
        expect(source.purpose.trim(), parameter.id).not.toBe('');
      }
    }
  });

  it('uses traceable DOI identifiers for every dimensional fidelity profile', () => {
    for (const profile of MODEL_FIDELITY_PROFILES) {
      expect(profile.referenceDois.length, profile.id).toBeGreaterThan(0);
      for (const doi of profile.referenceDois) {
        expect(doi, profile.id).toMatch(/^10\.\d{4,9}\/\S+$/);
      }
    }
  });
});
