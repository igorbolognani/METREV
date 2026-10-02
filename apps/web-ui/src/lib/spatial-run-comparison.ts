import type { StructuredCellRunView } from '@metrev/domain-contracts/browser';

export type SpatialRunComparisonMetric = {
  fieldId: string;
  unit: string;
  integralUnit: string;
  integrationMeasure: 'domain_area' | 'domain_volume';
  runA: {
    sampleCount: number;
    minimum: number;
    maximum: number;
    mean: number;
    integral: number;
  };
  runB: {
    sampleCount: number;
    minimum: number;
    maximum: number;
    mean: number;
    integral: number;
  };
  deltaBMinusA: {
    minimum: number;
    maximum: number;
    mean: number;
    integral: number;
  };
};

export type SpatialRunComparison =
  | { eligible: false; reasons: string[] }
  | {
      eligible: true;
      runA: { id: string; meshCellCount: number };
      runB: { id: string; meshCellCount: number };
      metrics: SpatialRunComparisonMetric[];
    };

function physicalGeometry(run: StructuredCellRunView) {
  const geometry = run.input_snapshot.geometry;
  return JSON.stringify({
    coordinate_system: run.input_snapshot.coordinate_system,
    geometry_version: geometry.geometry_version,
    lengths_m: geometry.lengths_m.map(({ value, unit }) => ({ value, unit })),
    out_of_plane_depth: geometry.out_of_plane_depth
      ? {
          value: geometry.out_of_plane_depth.value,
          unit: geometry.out_of_plane_depth.unit,
        }
      : null,
    layers: geometry.layers.map((layer) => ({
      tag: layer.tag,
      kind: layer.kind,
      width_m: { value: layer.width_m.value, unit: layer.width_m.unit },
    })),
  });
}

export function compareSpatialRunSummaries(
  runA: StructuredCellRunView,
  runB: StructuredCellRunView,
): SpatialRunComparison {
  const reasons: string[] = [];
  if (runA.id === runB.id) reasons.push('Selecione duas execuções diferentes.');
  if (runA.status !== 'completed' || !runA.result)
    reasons.push(`Execução A (${runA.id}) não está concluída com resultado.`);
  if (runB.status !== 'completed' || !runB.result)
    reasons.push(`Execução B (${runB.id}) não está concluída com resultado.`);
  if (runA.model_id !== runB.model_id)
    reasons.push('As execuções usam model_id diferentes.');
  if (runA.dimension !== runB.dimension)
    reasons.push('As dimensões das execuções são diferentes.');
  if (runA.system !== runB.system)
    reasons.push('Os sistemas das execuções são diferentes (MFC/MEC).');
  if (physicalGeometry(runA) !== physicalGeometry(runB))
    reasons.push('A geometria física das execuções é diferente.');

  if (!runA.result || !runB.result) return { eligible: false, reasons };

  const fieldsA = new Map(
    runA.result.fields.map((field) => [field.field_id, field]),
  );
  const fieldsB = new Map(
    runB.result.fields.map((field) => [field.field_id, field]),
  );
  const idsA = [...fieldsA.keys()].sort();
  const idsB = [...fieldsB.keys()].sort();
  for (const fieldId of idsA.filter((id) => !fieldsB.has(id)))
    reasons.push(`Campo ${fieldId} existe apenas na execução A.`);
  for (const fieldId of idsB.filter((id) => !fieldsA.has(id)))
    reasons.push(`Campo ${fieldId} existe apenas na execução B.`);

  const common = idsA.filter((id) => fieldsB.has(id));
  for (const fieldId of common) {
    const a = fieldsA.get(fieldId)!;
    const b = fieldsB.get(fieldId)!;
    if (
      a.value_type !== b.value_type ||
      a.association !== b.association ||
      [...a.domain_tags].sort().join('\u0000') !==
        [...b.domain_tags].sort().join('\u0000')
    )
      reasons.push(
        `Campo ${fieldId} tem tipo, associação ou domínios incompatíveis.`,
      );
    if (a.unit !== b.unit)
      reasons.push(
        `Campo ${fieldId} tem unidades incompatíveis (${a.unit} e ${b.unit}).`,
      );
    if (
      a.summary.integral_unit !== b.summary.integral_unit ||
      a.summary.integration_measure !== b.summary.integration_measure
    )
      reasons.push(
        `Campo ${fieldId} usa medida de integração ou unidade integral incompatível.`,
      );
  }

  if (reasons.length) return { eligible: false, reasons };

  const metrics = idsA.map((fieldId) => {
    const a = fieldsA.get(fieldId)!;
    const b = fieldsB.get(fieldId)!;
    return {
      fieldId,
      unit: a.unit,
      integralUnit: a.summary.integral_unit,
      integrationMeasure: a.summary.integration_measure,
      runA: {
        sampleCount: a.summary.sample_count,
        minimum: a.summary.minimum,
        maximum: a.summary.maximum,
        mean: a.summary.mean,
        integral: a.summary.integral,
      },
      runB: {
        sampleCount: b.summary.sample_count,
        minimum: b.summary.minimum,
        maximum: b.summary.maximum,
        mean: b.summary.mean,
        integral: b.summary.integral,
      },
      deltaBMinusA: {
        minimum: b.summary.minimum - a.summary.minimum,
        maximum: b.summary.maximum - a.summary.maximum,
        mean: b.summary.mean - a.summary.mean,
        integral: b.summary.integral - a.summary.integral,
      },
    } satisfies SpatialRunComparisonMetric;
  });

  return {
    eligible: true,
    runA: {
      id: runA.id,
      meshCellCount: runA.result.mesh.mesh_quality.cell_count,
    },
    runB: {
      id: runB.id,
      meshCellCount: runB.result.mesh.mesh_quality.cell_count,
    },
    metrics,
  };
}
