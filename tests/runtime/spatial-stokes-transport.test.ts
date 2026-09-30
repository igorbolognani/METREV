import { describe, expect, it } from 'vitest';
import {
  spatialModelInputV2Schema,
  spatialSidecarRequestSchema,
} from '@metrev/domain-contracts';
import { planarStokesRequestFromInput } from '../../packages/spatial-sidecar-client/src';
import { stokesTransportInput } from '../fixtures/spatial-input-v2';

describe('source-backed Stokes scalar transfer', () => {
  it('binds a neutral liquid scalar and source-backed diffusivity to the same mesh and flow states', () => {
    const input = spatialModelInputV2Schema.parse(stokesTransportInput());
    const request = planarStokesRequestFromInput(input);
    expect(request).toMatchObject({
      operation: 'planar_stokes',
      transport_setup: {
        domain_tag: 'liquid',
        concentration_variable: 'c',
        velocity_variables: { x: 'ux', y: 'uy' },
      },
      effective_diffusivity: { unit: 'm2/s', source_kind: 'test_fixture' },
    });
  });
  it.each([
    'flow',
    'domain',
    'charge',
    'diffusivity',
    'unit',
    'source',
    'reaction',
  ])('rejects incompatible %s', (variant) => {
    const input = stokesTransportInput();
    if (variant === 'flow')
      input.stokes_transport_development.velocity_variables.x = 'unresolved';
    if (variant === 'domain')
      input.stokes_transport_development.domain_tag = 'porous';
    if (variant === 'charge') input.species[0].valence.value = 1;
    if (variant === 'diffusivity')
      input.species[0].effective_diffusivity = {
        kind: 'constant',
        value: {
          value: 0,
          unit: 'm2/s',
          source_kind: 'test_fixture',
          source_ref: 'fixture',
        },
      };
    if (variant === 'unit')
      input.stokes_transport_development.inlet.concentration_mol_m3.unit =
        'kg/m3';
    if (variant === 'source')
      input.stokes_transport_development.inlet.concentration_mol_m3.source_ref =
        '';
    if (variant === 'reaction')
      input.reaction_laws.push({
        id: 'r',
        equation_ref: 'EQ-RX-001',
        domain_tags: ['liquid'],
        stoichiometry: [{ species_id: input.species[0].id, coefficient: -1 }],
        electron_count: 0,
        proton_count: 0,
        parameter_ids: [],
      });
    expect(spatialModelInputV2Schema.safeParse(input).success).toBe(false);
  });
  it('rejects a partial or misbound sidecar transport request', () => {
    const request = planarStokesRequestFromInput(stokesTransportInput());
    const { effective_diffusivity: omitted, ...partial } = request;
    expect(omitted).toBeDefined();
    expect(spatialSidecarRequestSchema.safeParse(partial).success).toBe(false);
    request.transport_setup!.velocity_variables.x = 'different';
    expect(spatialSidecarRequestSchema.safeParse(request).success).toBe(false);
  });
});
