import { describe, expect, it } from 'vitest';
import { compileStructuredCellEquationGraph } from '@metrev/domain-contracts';
import { resolveCaseSpatialComposition } from '@metrev/electrochem-models';
import { caseSpatialFixture } from '../fixtures/case-spatial';

describe('exact case/stack composition for the restricted cell', () => {
  it.each([
    [2, 'MFC'],
    [3, 'MFC'],
    [2, 'MEC'],
    [3, 'MEC'],
  ] as const)(
    'composes %sD %s without scientific parameter inference',
    (dimension, system) => {
      const { normalized, request } = caseSpatialFixture(dimension, system);
      const plan = resolveCaseSpatialComposition(normalized, request);
      expect(plan).toMatchObject({
        status: 'ready',
        missing_inputs: [],
        missing_modules: [],
        unsupported_configuration: [],
        decision_eligible: false,
      });
      expect(plan.input).toEqual(request.input);
      expect(plan.input?.case_context).toBeUndefined();
      expect(plan.equation_graph).toMatchObject({
        cell_count: dimension === 2 ? 12 : 24,
        algebraic_state_count: dimension === 2 ? 49 : 97,
        dimension,
      });
      expect(
        plan.equation_graph!.nodes.some(
          (n) => n.equation_id === 'cell-homogeneous-reactions-v1',
        ),
      ).toBe(false);
    },
  );
  it('separates missing data from absent physics and never substitutes a fidelity', () => {
    const { normalized, request } = caseSpatialFixture();
    expect(
      resolveCaseSpatialComposition(normalized, {
        ...request,
        input: undefined,
        component_domains: undefined,
      }),
    ).toMatchObject({ status: 'insufficient_data', input: null });
    expect(
      resolveCaseSpatialComposition(normalized, {
        ...request,
        model_id: 'biofilm-2d-electrode-research-v1',
      }),
    ).toMatchObject({
      status: 'not_implemented',
      input: null,
      missing_modules: ['requested_profile_equation_assembly'],
    });
    expect(
      resolveCaseSpatialComposition(normalized, {
        ...request,
        required_physics: ['hydraulics', 'fixed_membrane_charge'],
      }),
    ).toMatchObject({
      status: 'not_implemented',
      missing_modules: ['hydraulics', 'fixed_membrane_charge'],
    });
    expect(
      resolveCaseSpatialComposition(normalized, { ...request, dimension: 3 }),
    ).toMatchObject({
      status: 'not_implemented',
      unsupported_configuration: [
        'input_identity_differs_from_requested_case_fidelity',
      ],
    });
    normalized.stack_blocks.reactor_architecture.architecture_type = 'unknown';
    expect(resolveCaseSpatialComposition(normalized, request).status).toBe(
      'insufficient_data',
    );
    normalized.stack_blocks.reactor_architecture.architecture_type = 'tubular';
    expect(resolveCaseSpatialComposition(normalized, request).status).toBe(
      'not_implemented',
    );
  });
  it('requires explicit compatible separator declaration and complete component mapping', () => {
    const { normalized, request } = caseSpatialFixture();
    normalized.stack_blocks.reactor_architecture.membrane_presence = 'unknown';
    expect(resolveCaseSpatialComposition(normalized, request).status).toBe(
      'insufficient_data',
    );
    normalized.stack_blocks.reactor_architecture.membrane_presence = 'absent';
    expect(resolveCaseSpatialComposition(normalized, request).status).toBe(
      'not_implemented',
    );
    normalized.stack_blocks.reactor_architecture.membrane_presence = 'present';
    request.component_domains![1].stack_block = 'reactor_architecture';
    expect(() => resolveCaseSpatialComposition(normalized, request)).toThrow(
      'mapping',
    );
  });
  it('fails on absent provenance and wrong units before a plan can be admitted', () => {
    const { normalized, request } = caseSpatialFixture();
    request.input!.temperature.unit = 'C';
    expect(() => resolveCaseSpatialComposition(normalized, request)).toThrow();
    request.input!.temperature.unit = 'K';
    request.input!.temperature.source_ref = '';
    expect(() => resolveCaseSpatialComposition(normalized, request)).toThrow();
  });
  it('keeps declared homogeneous sources in the equation graph with input paths', () => {
    const { request } = caseSpatialFixture();
    const input = request.input!;
    const neutral = structuredClone(input.species[0]);
    neutral.id = 'neutral';
    input.species.push(neutral);
    for (const layer of input.geometry.layers)
      layer.diffusivity.neutral = structuredClone(layer.diffusivity.reduced!);
    const sourced = (value: number, unit: string) => ({
      ...input.temperature,
      value,
      unit,
    });
    input.reactions = [
      {
        id: 'conversion',
        domain_tag: 'membrane',
        equation_ref: 'synthetic:neutral-conversion',
        stoichiometry: { reduced: sourced(-1, '1'), neutral: sourced(1, '1') },
        law: {
          kind: 'mass_action',
          rate: sourced(1e-6, 'mol/(m3*s)'),
          orders: { reduced: sourced(1, '1') },
        },
      },
    ];
    const graph = compileStructuredCellEquationGraph(input);
    expect(
      graph.nodes.find((n) => n.id === 'reaction_conversion'),
    ).toMatchObject({
      equation_id: 'cell-homogeneous-reactions-v1',
      domain_tags: ['membrane'],
      parameter_paths: ['reactions.0'],
    });
    expect(graph.interfaces).toHaveLength(2);
  });
});
