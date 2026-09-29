import { describe, expect, it } from 'vitest';

import {
  spatialModelInputSchema,
  spatialModelInputV2Schema,
  spatialSidecarRequestSchema,
  spatialVariableAuthority,
} from '@metrev/domain-contracts';
import { meshReferenceFromSidecar } from '@metrev/spatial-sidecar-client';
import {
  canonicalRequest,
  copy,
  digestRequest,
  meshRequest,
  q,
  requestDigest,
  validSpatialInput,
} from '../fixtures/spatial-input-v2';

const valid = validSpatialInput;

describe('spatial-input-v2 admission boundary', () => {
  it('binds source-traced local mesh sizes into the admitted request and rejects invalid refinements', () => {
    const candidate = valid();
    candidate.geometry.layers[1].target_size_m = q(0.0005, 'm');
    candidate.mesh.request.mesh.layers[1].target_size_m = q(0.0005, 'm');
    candidate.mesh.input_sha256 = digestRequest(candidate.mesh.request);
    expect(spatialModelInputV2Schema.safeParse(candidate).success).toBe(true);
    candidate.geometry.layers[1].target_size_m.value = 0.0006;
    expect(spatialModelInputV2Schema.safeParse(candidate).success).toBe(false);
    for (const local of [
      q(0.003, 'm'),
      q(0.0005, 's'),
      q(0, 'm'),
      q(0.000001, 'm'),
      q(1e-320, 'm'),
    ]) {
      const request = copy(meshRequest);
      request.mesh.layers[1].target_size_m = local;
      expect(spatialSidecarRequestSchema.safeParse(request).success).toBe(
        false,
      );
    }
  });
  it('joins a tagged planar mesh to source-backed state and circuit declarations without enabling a solver', () => {
    const parsed = spatialModelInputV2Schema.parse(valid());
    expect(parsed.mesh.physical_groups['interface:biofilm:liquid']).toBe(203);
    expect(parsed.variables[0].unit).toBe(
      spatialVariableAuthority.variables.species_concentration.unit,
    );
    expect(spatialModelInputSchema.safeParse(parsed).success).toBe(false);
  });

  it('rejects mismatched physical groups, interfaces, component mapping and mesh levels', () => {
    for (const mutation of [
      (candidate: ReturnType<typeof valid>) => {
        delete (candidate.mesh.physical_groups as Record<string, number>)[
          'region:biofilm'
        ];
      },
      (candidate: ReturnType<typeof valid>) => {
        candidate.mesh.interfaces[0].to_tag = 'liquid';
      },
      (candidate: ReturnType<typeof valid>) => {
        candidate.mesh.component_map.anode = 'wrong';
      },
      (candidate: ReturnType<typeof valid>) => {
        candidate.mesh.refinement_factor = 8;
      },
    ]) {
      const candidate = valid();
      mutation(candidate);
      expect(spatialModelInputV2Schema.safeParse(candidate).success).toBe(
        false,
      );
    }
  });

  it('rejects a valid mesh manifest reused for a differently sized geometry', () => {
    const candidate = valid();
    candidate.geometry.layers[1].width_m.value += 0.0001;
    expect(spatialModelInputV2Schema.safeParse(candidate).success).toBe(false);
    const alteredDigest = valid();
    alteredDigest.mesh.input_sha256 = 'b'.repeat(64);
    expect(spatialModelInputV2Schema.safeParse(alteredDigest).success).toBe(
      false,
    );
  });

  it('compares equivalent geometry metadata independent of record key insertion order', () => {
    const candidate = valid();
    candidate.geometry.height_m.conditions = {
      pressure: '101325 Pa',
      temperature: '298 K',
    };
    candidate.mesh.request.mesh.height_m.conditions = {
      temperature: '298 K',
      pressure: '101325 Pa',
    };
    candidate.mesh.input_sha256 = digestRequest(candidate.mesh.request);
    expect(spatialModelInputV2Schema.safeParse(candidate).success).toBe(true);
  });

  it('checks species, material, sample and boundary units against explicit variable authority', () => {
    const changes = [
      (candidate: ReturnType<typeof valid>) => {
        candidate.species[0].molecular_diffusivity.value.unit = 'm/s';
      },
      (candidate: ReturnType<typeof valid>) => {
        candidate.material_fields[0].field.value.value = 1.2;
      },
      (candidate: ReturnType<typeof valid>) => {
        candidate.initial_conditions[0].field.samples[0].position_m = [
          0.02, 0.002,
        ];
      },
      (candidate: ReturnType<typeof valid>) => {
        candidate.boundary_conditions[0].value = q(1, 'kg/m3');
      },
      (candidate: ReturnType<typeof valid>) => {
        candidate.boundary_conditions[0].tag = 'liquid';
      },
      (candidate: ReturnType<typeof valid>) => {
        candidate.variables[0].domain_tags = ['anode'];
      },
      (candidate: ReturnType<typeof valid>) => {
        candidate.boundary_conditions[0].value = q(-1, 'mol/m3');
      },
    ];
    for (const mutate of changes) {
      const candidate = valid();
      mutate(candidate);
      expect(spatialModelInputV2Schema.safeParse(candidate).success).toBe(
        false,
      );
    }
    const flux = valid();
    flux.boundary_conditions[0] = {
      kind: 'flux',
      tag: 'outer_wall',
      variable: 'substrate_c',
      value: q(1, 'mol/m2/s'),
    };
    expect(spatialModelInputV2Schema.safeParse(flux).success).toBe(true);
    flux.boundary_conditions[0].value = q(1, 'mol/m3');
    expect(spatialModelInputV2Schema.safeParse(flux).success).toBe(false);
    const robin = valid();
    robin.boundary_conditions[0] = {
      kind: 'robin',
      tag: 'outer_wall',
      variable: 'temperature',
      ambient: q(300, 'K'),
      coefficient: q(1, 'W/m2/K'),
    } as never;
    expect(spatialModelInputV2Schema.safeParse(robin).success).toBe(true);
    (
      robin.boundary_conditions[0] as { ambient: ReturnType<typeof q> }
    ).ambient = q(0, 'K');
    expect(spatialModelInputV2Schema.safeParse(robin).success).toBe(false);
  });

  it('requires complete, source-backed stoichiometry and retains MEC electrical input', () => {
    const candidate = valid();
    candidate.species.push({
      id: 'product',
      valence: q(0, '1'),
      molecular_diffusivity: { kind: 'constant', value: q(2e-9, 'm2/s') },
    });
    const reaction = {
      id: 'test_reaction',
      domain_tag: 'biofilm',
      equation_ref: 'test-fixture://reaction-law',
      stoichiometry: [
        { species_id: 'substrate', coefficient: q(-1, '1') },
        { species_id: 'product', coefficient: q(1, '1') },
      ],
      electron_count: q(2, '1'),
      proton_count: q(2, '1'),
    };
    (candidate.reaction_laws as unknown[]).push(reaction);
    expect(spatialModelInputV2Schema.safeParse(candidate).success).toBe(true);
    reaction.stoichiometry[1].coefficient.unit = 'mol';
    expect(spatialModelInputV2Schema.safeParse(candidate).success).toBe(false);
    const mec = valid();
    mec.system = 'MEC';
    mec.circuit = { kind: 'applied_voltage', voltage: q(0.7, 'V') } as never;
    expect(spatialModelInputV2Schema.safeParse(mec).success).toBe(true);
  });

  it('binds a verified sidecar manifest to a mesh URI and rejects missing levels', () => {
    const candidate = valid();
    const response = {
      protocol_version: 'spatial-sidecar-v1',
      request_id: meshRequest.request_id,
      status: 'ok',
      operation: 'planar_mesh',
      metadata: {
        sidecar_version: '0.1.0',
        protocol_version: 'spatial-sidecar-v1',
        python_version: '3.12',
        gmsh_version: '4.15.2',
        dolfinx_version: null,
        petsc_version: null,
      },
      geometry_version: 'planar-layers-v1',
      input_sha256: requestDigest,
      physical_groups: candidate.mesh.physical_groups,
      component_map: candidate.mesh.component_map,
      interfaces: candidate.mesh.interfaces as [
        { tag: string; from_tag: string; to_tag: string; normal: [1, 0] },
      ],
      artifacts: [
        {
          refinement_factor: 1,
          format: 'msh4',
          path: 'mesh-1.msh',
          sha256: 'a'.repeat(64),
          bytes: 120,
          node_count: 3,
          cell_count: 1,
          min_quality: 0.5,
        },
      ],
    } as Parameters<typeof meshReferenceFromSidecar>[1];
    const reference = meshReferenceFromSidecar(
      canonicalRequest,
      response,
      1,
      'test-fixture://mesh-1.msh',
    );
    expect(reference.sha256).toBe(candidate.mesh.sha256);
    expect(() =>
      meshReferenceFromSidecar(
        canonicalRequest,
        response,
        2,
        'test-fixture://mesh-2.msh',
      ),
    ).toThrow('Requested mesh level is absent');
    expect(() =>
      meshReferenceFromSidecar(
        canonicalRequest,
        { ...response, input_sha256: 'b'.repeat(64) },
        1,
        'test-fixture://mesh-1.msh',
      ),
    ).toThrow('does not match the exact planar request');
  });
});
