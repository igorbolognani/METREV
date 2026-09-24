import {
  reportModelingSectionSchema,
  type ReportModelingSection,
  type SimulationEnrichment,
} from './schemas';

export function buildReportModelingSection(
  simulation: SimulationEnrichment | null | undefined,
): ReportModelingSection | null {
  if (!simulation) {
    return null;
  }

  return reportModelingSectionSchema.parse({
    status: simulation.status,
    model_version: simulation.model_version,
    derived_observations:
      simulation.status === 'completed'
        ? simulation.derived_observations.filter(
            (observation) => observation.source_kind === 'modeled',
          )
        : [],
    assumptions: simulation.assumptions,
    confidence: simulation.confidence,
    provenance: simulation.provenance,
    failure_detail: simulation.failure_detail,
  });
}
