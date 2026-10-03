import { describe, expect, it } from 'vitest';

import {
  PHYSICS_MODULES,
  composeModules,
  resolvePhysicsComposition,
} from '@metrev/electrochem-models';

describe('physics composition mapping gates', () => {
  it('fails closed for modules without a dimension or equation mapping', () => {
    const oneDimensionalSensor = composeModules(['sensor'], 1);
    expect(
      oneDimensionalSensor.find((module) => module.id === 'sensor')
        ?.executableAtFidelity,
    ).toBe(false);

    const unmappedHydraulics = composeModules(['hydraulics'], 0);
    expect(
      unmappedHydraulics.find((module) => module.id === 'hydraulics')
        ?.executableAtFidelity,
    ).toBe(false);
  });

  it('reports unsupported module mappings in the stack resolution', () => {
    const composition = resolvePhysicsComposition({
      modelId: 'coupled-0d-dae-v1',
      system: 'MFC',
      architecture: 'flow-through',
    });

    expect(composition.status).toBe('not_implemented');
    expect(composition.missingModules).toEqual(
      expect.arrayContaining([
        'configuration_specific_mapping',
        'module_mapping:hydraulics',
      ]),
    );
    expect(composition.unsupportedConfiguration).toEqual(
      expect.arrayContaining([
        'module:hydraulics:unsupported_dimension_0d',
        'module:hydraulics:missing_equation_mapping',
      ]),
    );
    expect(
      composition.modulePlan.every((module) => !module.executableAtFidelity),
    ).toBe(true);
  });

  it('marks dependents non-executable when a dependency has no dimension mapping', () => {
    const supportedDimensions = [
      ...PHYSICS_MODULES.reactor.supportedDimensions,
    ];
    PHYSICS_MODULES.reactor.supportedDimensions.splice(0);

    try {
      const plan = composeModules(['circuit'], 0);
      const circuit = plan.find((module) => module.id === 'circuit');
      expect(
        plan.find((module) => module.id === 'reactor')?.executableAtFidelity,
      ).toBe(false);
      expect(circuit?.executableAtFidelity).toBe(false);
    } finally {
      PHYSICS_MODULES.reactor.supportedDimensions.splice(
        0,
        PHYSICS_MODULES.reactor.supportedDimensions.length,
        ...supportedDimensions,
      );
    }
  });

  it('returns a blocked resolution when a dependency mapping is absent', () => {
    PHYSICS_MODULES.hydraulics.requires.push('unmapped_dependency');

    try {
      const composition = resolvePhysicsComposition({
        modelId: 'coupled-0d-dae-v1',
        system: 'MFC',
        architecture: 'flow-through',
      });
      expect(composition.status).toBe('not_implemented');
      expect(composition.missingModules).toEqual(
        expect.arrayContaining([
          'configuration_specific_mapping',
          'unresolved_module_dependency',
        ]),
      );
      expect(composition.unsupportedConfiguration).toContain(
        'module_graph:Unknown physics module in composition: unmapped_dependency',
      );
      expect(composition.modulePlan).toEqual([]);
    } finally {
      PHYSICS_MODULES.hydraulics.requires.pop();
    }
  });
});
