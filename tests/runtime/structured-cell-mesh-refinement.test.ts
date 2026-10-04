import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  spatialRuntimeInputSha256,
  structuredCellGeometrySha256,
  deriveStructuredCellMeshRefinementEvidence,
  structuredCellInputSchema,
} from '@metrev/domain-contracts';
import { structuredCellFixture } from '../fixtures/structured-cell';

function refinementRun(
  runId: string,
  factorX: number,
  factorY: number,
  current: number,
) {
  const input = structuredCellFixture(2);
  for (const layer of input.geometry.layers) layer.cells *= factorX;
  input.geometry.transverse_cells = input.geometry.transverse_cells.map(
    (cells) => cells * factorY,
  );
  const parsed = structuredCellInputSchema.parse(input);
  const inputSha = spatialRuntimeInputSha256(parsed);
  return {
    run_id: runId,
    status: 'completed' as const,
    input_sha256: inputSha,
    solver_version: 'structured-cell-fv-v1',
    runtime_version: 'structured-cell-process-v5',
    input: parsed,
    result: {
      model_id: parsed.model_id,
      system: parsed.system,
      dimension: parsed.dimension,
      coordinate_system: parsed.coordinate_system,
      input_sha256: inputSha,
      solver_version: 'structured-cell-fv-v1',
      runtime_version: 'structured-cell-process-v5',
      mesh: {
        artifact: {
          sha256: createHash('sha256').update(`mesh:${runId}`).digest('hex'),
        },
        request_sha256: structuredCellGeometrySha256(parsed),
        mesh_quality: {
          cell_count:
            parsed.geometry.layers.reduce(
              (sum, layer) => sum + layer.cells,
              0,
            ) *
            parsed.geometry.transverse_cells.reduce(
              (product, cells) => product * cells,
              1,
            ),
        },
      },
      convergence: [{ status: 'converged' }],
      conservation_residuals: [{ passed: true }],
      cell_circuit: { collector_voltage_V: 0.2, anodic_current_A: current },
    },
  };
}

describe('structured-cell mesh-refinement evidence', () => {
  it('binds persisted identities and estimates differences to the finest computed run', () => {
    const runs = [
      refinementRun('coarse', 1, 1, 1.75),
      refinementRun('medium', 2, 2, 1.25),
      refinementRun('fine', 4, 4, 1),
    ];
    const evidence = deriveStructuredCellMeshRefinementEvidence('medium', runs);

    expect(evidence.status).toBe('assessed');
    if (evidence.status !== 'assessed') return;
    expect(evidence.refinement_ratio).toBeCloseTo(2);
    const current = evidence.observables.find(
      (entry) => entry.observable_id === 'anodic_current',
    )!;
    expect(current.estimated_discretization_error.coarse_absolute).toBeCloseTo(
      0.75,
    );
    expect(current.estimated_discretization_error.medium_absolute).toBeCloseTo(
      0.25,
    );
    expect(current.observed_order).toBeCloseTo(1);
  });

  it('withholds evidence when global cell-count ratios hide anisotropic refinement', () => {
    const runs = [
      refinementRun('coarse', 1, 1, 1.75),
      refinementRun('medium', 4, 2, 1.25),
      refinementRun('fine', 16, 4, 1),
    ];
    const evidence = deriveStructuredCellMeshRefinementEvidence('fine', runs);

    expect(evidence).toMatchObject({
      status: 'unavailable',
      unavailable_reason: 'uniform_characteristic_refinement_ratio_required',
      decision_eligible: false,
    });
  });

  it('withholds evidence for stale input, geometry or solver identities', () => {
    const staleInput = [
      refinementRun('coarse', 1, 1, 1.75),
      refinementRun('medium', 2, 2, 1.25),
      refinementRun('fine', 4, 4, 1),
    ];
    staleInput[1].input_sha256 = 'a'.repeat(64);
    expect(
      deriveStructuredCellMeshRefinementEvidence('medium', staleInput),
    ).toMatchObject({ status: 'unavailable' });

    const staleSolver = [
      refinementRun('coarse', 1, 1, 1.75),
      refinementRun('medium', 2, 2, 1.25),
      refinementRun('fine', 4, 4, 1),
    ];
    staleSolver[1].solver_version = 'different-solver';
    expect(
      deriveStructuredCellMeshRefinementEvidence('medium', staleSolver),
    ).toMatchObject({
      status: 'unavailable',
      unavailable_reason: 'solver_identity_mismatch',
    });
  });
});
