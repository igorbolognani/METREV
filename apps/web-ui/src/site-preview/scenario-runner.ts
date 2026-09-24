import type {
  NormalizedCaseInput,
  ScientificModelParameter,
} from '@metrev/domain-contracts';

export type SiteScenarioId =
  | 'mfc_wastewater'
  | 'mec_wastewater'
  | 'biosensor_standalone'
  | 'mfc_integrated_biosensor'
  | 'mec_integrated_biosensor';

export type CodUnit = 'kgCOD/m3' | 'mgCOD/L' | 'gCOD/m3' | 'mgBOD/L';

export type SiteRunPreparation =
  | {
      status: 'ready';
      normalizedCase: NormalizedCaseInput;
      enteredAssumptions: string[];
    }
  | {
      status: 'insufficient_data';
      missingInputs: string[];
    };

const ASSUMPTION_SOURCE_REF = 'site-user-entry://unverified-assumption';

function parseNonnegative(value: string, label: string): number | string {
  if (!value.trim()) return `${label} is required.`;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return `${label} must be a finite nonnegative number.`;
  }
  return parsed;
}

function assignAssumption(parameter: ScientificModelParameter, value: number) {
  return {
    ...parameter,
    value,
    source_kind: 'assumption' as const,
    source_ref: ASSUMPTION_SOURCE_REF,
  };
}

export function prepareSiteScenarioRun(input: {
  scenarioId: SiteScenarioId;
  normalizedCase: NormalizedCaseInput;
  codValue: string;
  codUnit: CodUnit;
  phValue: string;
  biosensorConcentration: string;
}): SiteRunPreparation {
  const nextCase = structuredClone(input.normalizedCase);
  const missingInputs: string[] = [];
  const enteredAssumptions: string[] = [];
  const hasWastewaterCell = input.scenarioId !== 'biosensor_standalone';
  const hasSensor = input.scenarioId.includes('biosensor');

  if (hasWastewaterCell) {
    if (input.codUnit === 'mgBOD/L') {
      missingInputs.push(
        'COD cannot be supplied in a BOD unit; select a COD unit or provide COD data.',
      );
    } else {
      const enteredCod = parseNonnegative(input.codValue, 'Influent COD');
      if (typeof enteredCod === 'string') {
        missingInputs.push(enteredCod);
      } else if (!nextCase.mechanistic_model?.operation?.influent_cod_kg_m3) {
        missingInputs.push('mechanistic_model.operation.influent_cod_kg_m3');
      } else {
        const multiplier =
          input.codUnit === 'kgCOD/m3'
            ? 1
            : input.codUnit === 'mgCOD/L'
              ? 1e-3
              : 1e-3;
        nextCase.mechanistic_model.operation.influent_cod_kg_m3 =
          assignAssumption(
            nextCase.mechanistic_model.operation.influent_cod_kg_m3,
            enteredCod * multiplier,
          );
        enteredAssumptions.push(
          `Influent COD entered as ${enteredCod} ${input.codUnit}; normalized to kgCOD/m3.`,
        );
      }
    }

    const enteredPh = parseNonnegative(input.phValue, 'Influent pH');
    const operation = nextCase.mechanistic_model?.operation;
    const influentPh = operation?.influent_ph;
    const initialAnodePh = operation?.initial_ph_anode;
    const initialCathodePh = operation?.initial_ph_cathode;
    if (typeof enteredPh === 'string') {
      missingInputs.push(enteredPh);
    } else if (enteredPh > 14) {
      missingInputs.push('Influent pH must be between 0 and 14.');
    } else if (
      !operation ||
      !influentPh ||
      !initialAnodePh ||
      !initialCathodePh
    ) {
      missingInputs.push('mechanistic_model.operation.influent_ph');
    } else {
      operation.influent_ph = assignAssumption(influentPh, enteredPh);
      operation.initial_ph_anode = assignAssumption(initialAnodePh, enteredPh);
      operation.initial_ph_cathode = assignAssumption(
        initialCathodePh,
        enteredPh,
      );
      enteredAssumptions.push(
        `Influent and initial chamber pH set to ${enteredPh}.`,
      );
    }
  }

  if (hasSensor) {
    const enteredConcentration = parseNonnegative(
      input.biosensorConcentration,
      'Biosensor analyte concentration',
    );
    const sensor = nextCase.stack_blocks.sensors_and_analytics.biosensor;
    if (typeof enteredConcentration === 'string') {
      missingInputs.push(enteredConcentration);
    } else if (
      !sensor?.concentration ||
      !sensor.calibration?.range_min ||
      !sensor.calibration.range_max
    ) {
      missingInputs.push(
        'stack_blocks.sensors_and_analytics.biosensor concentration and calibration range',
      );
    } else if (
      enteredConcentration < sensor.calibration.range_min.value ||
      enteredConcentration > sensor.calibration.range_max.value
    ) {
      missingInputs.push(
        `Biosensor concentration must be within its supplied calibration interval (${sensor.calibration.range_min.value}–${sensor.calibration.range_max.value} ${sensor.concentration_unit}).`,
      );
    } else {
      sensor.concentration = assignAssumption(
        sensor.concentration,
        enteredConcentration,
      );
      enteredAssumptions.push(
        `Biosensor concentration entered as ${enteredConcentration} ${sensor.concentration_unit}.`,
      );
    }
  }

  if (missingInputs.length > 0) {
    return { status: 'insufficient_data', missingInputs };
  }

  return {
    status: 'ready',
    normalizedCase: nextCase,
    enteredAssumptions,
  };
}
