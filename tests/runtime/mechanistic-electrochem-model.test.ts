import fixture from '../fixtures/raw-case-input.json';

import { describe, expect, it } from 'vitest';

import {
  normalizeCaseInput,
  rawCaseInputSchema,
  type RawCaseInput,
} from '@metrev/domain-contracts';
import {
  evaluateSimulationEnrichment,
  simulateMechanisticCase,
} from '@metrev/electrochem-models';

function evaluate(raw: RawCaseInput) {
  return evaluateSimulationEnrichment({
    normalizedCase: normalizeCaseInput(rawCaseInputSchema.parse(raw)),
  });
}

function valueFor(
  result: ReturnType<typeof evaluate>,
  key: string,
): number | string | null {
  const found = result.derived_observations.find((entry) => entry.key === key);
  return (found?.value as number | string | null | undefined) ?? null;
}

function integrateSeries(
  points: Array<{ x: number; y: number }>,
  rate: (value: number) => number = (value) => value,
): number {
  return points.slice(1).reduce((total, point, index) => {
    const previous = points[index];
    const width = point.x - previous.x;
    return total + (width * (rate(previous.y) + rate(point.y))) / 2;
  }, 0);
}

describe('coupled electrochemical mechanistic model', () => {
  it('refuses to fabricate MFC/MEC outputs when source-backed parameters are absent', () => {
    const raw = { ...fixture } as RawCaseInput;
    delete raw.mechanistic_model;

    const result = evaluate(raw);

    expect(result.status).toBe('insufficient_data');
    expect(result.series).toHaveLength(0);
    expect(result.failure_detail?.missing_inputs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('mechanistic_model.geometry'),
        expect.stringContaining('mechanistic_model.biology'),
      ]),
    );
    expect(valueFor(result, 'cod_removal_pct')).toBeNull();
  });

  it('runs deterministic one-at-a-time scenarios for supplied input uncertainty', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    const influentCod = raw.mechanistic_model!.operation
      .influent_cod_kg_m3! as {
      value: number;
      unit: string;
      uncertainty?: number;
      uncertainty_unit?: string;
    };
    influentCod.uncertainty = 0.01;
    influentCod.uncertainty_unit = influentCod.unit;

    const result = evaluate(raw);
    const analysis = result.sensitivity_analysis;

    expect(result.status).toBe('completed');
    expect(analysis?.method).toBe('one_at_a_time_reported_uncertainty_v1');
    expect(analysis?.status).toBe('completed');
    expect(analysis?.evaluated_parameter_count).toBe(1);
    const effect = analysis?.effects[0];
    expect(effect).toMatchObject({
      parameter_path: 'mechanistic_model.operation.influent_cod_kg_m3',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
      unit: 'kgCOD/m3',
      nominal_value: 0.8,
      reported_uncertainty: 0.01,
      status: 'completed',
    });
    expect(effect?.lower_input_scenario.input_value).toBeCloseTo(0.79, 12);
    expect(effect?.upper_input_scenario.input_value).toBeCloseTo(0.81, 12);
    const codRemoval = effect?.metrics.find(
      (metric) => metric.key === 'cod_removal_pct',
    );
    expect(codRemoval?.lower_input_value).not.toBeNull();
    expect(codRemoval?.upper_input_value).not.toBeNull();
    expect(codRemoval?.lower_change_from_nominal).not.toBe(0);
    expect(analysis?.interpretation).toContain(
      'do not assign a probability distribution',
    );
  });

  it('does not infer or silently clip an uncertainty scenario outside the input domain', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    const influentCod = raw.mechanistic_model!.operation
      .influent_cod_kg_m3! as {
      value: number;
      unit: string;
      uncertainty?: number;
      uncertainty_unit?: string;
    };
    influentCod.uncertainty = 1;
    influentCod.uncertainty_unit = influentCod.unit;

    const result = evaluate(raw);
    const effect = result.sensitivity_analysis?.effects[0];

    expect(result.status).toBe('completed');
    expect(result.sensitivity_analysis?.status).toBe('partial');
    expect(effect?.status).toBe('partial');
    expect(effect?.lower_input_scenario.input_value).toBeCloseTo(-0.2, 12);
    expect(effect?.lower_input_scenario.status).toBe('insufficient_data');
    expect(effect?.upper_input_scenario.status).toBe('completed');
    expect(
      effect?.metrics.find((metric) => metric.key === 'cod_removal_pct')
        ?.lower_input_value,
    ).toBeNull();
  });

  it('requires uncertainty units to match the parameter unit', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    const influentCod = raw.mechanistic_model!.operation
      .influent_cod_kg_m3! as {
      value: number;
      unit: string;
      uncertainty?: number;
      uncertainty_unit?: string;
    };
    influentCod.uncertainty = 0.1;
    influentCod.uncertainty_unit = 'mgCOD/L';

    const result = rawCaseInputSchema.safeParse(raw);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected the invalid input to fail.');
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: [
            'mechanistic_model',
            'operation',
            'influent_cod_kg_m3',
            'uncertainty_unit',
          ],
          message: 'uncertainty_unit must match the parameter unit',
        }),
      ]),
    );
  });

  it('returns a structured insufficient-data result for incremental model drafts', () => {
    const raw = {
      ...fixture,
      mechanistic_model: {
        model_version: 'coupled-0d-dae-v1',
        system_type: 'MFC',
        geometry: {
          anode_area_m2: {
            value: 0.01,
            unit: 'm2',
            source_kind: 'test_fixture',
            source_ref: 'test-fixture://partial-model',
          },
        },
      },
    } as RawCaseInput;

    const result = evaluate(raw);

    expect(result.status).toBe('insufficient_data');
    expect(result.failure_detail?.missing_inputs).toEqual(
      expect.arrayContaining([
        'mechanistic_model.materials',
        expect.stringContaining('mechanistic_model.operation'),
      ]),
    );
    expect(valueFor(result, 'power_density_w_m2')).toBeNull();
  });

  it('does not run an MFC or MEC model for a legacy or unclassified family', () => {
    for (const technologyFamily of [
      'microbial_electrochemical_technology',
      'unclassified',
    ]) {
      const raw = structuredClone(fixture) as RawCaseInput;
      raw.technology_family = technologyFamily;
      raw.mechanistic_model!.system_type = 'MEC';

      const result = evaluate(raw);

      expect(result.status).toBe('insufficient_data');
      expect(result.series).toHaveLength(0);
      expect(result.failure_detail?.missing_inputs).toContain(
        'technology_family must be explicitly classified as MFC, MEC, or biosensor',
      );
    }
  });

  it('does not choose a mechanistic model from the domain-template family default', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    delete raw.technology_family;

    const result = evaluate(raw);

    expect(result.status).toBe('insufficient_data');
    expect(result.series).toHaveLength(0);
    expect(result.failure_detail?.missing_inputs).toContain(
      'technology_family must be explicitly supplied before model execution',
    );
  });

  it('solves a source-referenced MFC case and an MFC-integrated biosensor', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    const result = evaluate(raw);
    const currentDensity = valueFor(result, 'current_density_a_m2');
    const codRemoval = valueFor(result, 'cod_removal_pct');
    const anodePh = valueFor(result, 'ph_anode_final');
    const sensorPower = valueFor(result, 'biosensor_net_power_w');

    expect(result.status).toBe('completed');
    expect(result.series.length).toBeGreaterThanOrEqual(5);
    expect(typeof currentDensity).toBe('number');
    expect(currentDensity as number).toBeGreaterThan(0);
    expect(typeof codRemoval).toBe('number');
    expect(codRemoval as number).toBeGreaterThanOrEqual(0);
    expect(codRemoval as number).toBeLessThanOrEqual(100);
    expect(anodePh as number).toBeGreaterThanOrEqual(0);
    expect(anodePh as number).toBeLessThanOrEqual(14);
    expect(sensorPower as number).toBeGreaterThan(0);
    const current = valueFor(result, 'current_density_a_m2') as number;
    const currentA = current * 0.01;
    expect(valueFor(result, 'gross_power_w') as number).toBeCloseTo(
      currentA ** 2 * 100,
      12,
    );
    const finalCellVoltage = result.series
      .find((entry) => entry.y_axis.key === 'cell_voltage_v')
      ?.points.at(-1)?.y;
    expect(finalCellVoltage).toBeCloseTo(currentA * 100, 10);
    expect(valueFor(result, 'gross_power_w') as number).toBeCloseTo(
      currentA * (finalCellVoltage as number),
      12,
    );
    expect(valueFor(result, 'net_power_w') as number).toBeCloseTo(
      (valueFor(result, 'gross_power_w') as number) - 0.001,
      12,
    );
    expect(valueFor(result, 'biosensor_net_power_w') as number).toBeCloseTo(
      (valueFor(result, 'gross_power_w') as number) - 0.001 - 1e-7,
      12,
    );
    const duration = raw.mechanistic_model!.operation.duration_s.value;
    const auxiliaryPower =
      raw.mechanistic_model!.operation.auxiliary_power_w.value;
    const grossEnergy = valueFor(
      result,
      'gross_electrical_output_energy_j',
    ) as number;
    const auxiliaryEnergy = valueFor(
      result,
      'auxiliary_energy_demand_j',
    ) as number;
    expect(grossEnergy).toBeGreaterThan(0);
    expect(auxiliaryEnergy).toBeCloseTo(auxiliaryPower * duration, 12);
    expect(valueFor(result, 'net_electrical_energy_j') as number).toBeCloseTo(
      grossEnergy - auxiliaryEnergy,
      12,
    );
    const mfcCurrentSeries = result.series.find(
      (entry) => entry.y_axis.key === 'current_a',
    )!.points;
    const endpointIntegratedMfcEnergy = integrateSeries(
      mfcCurrentSeries,
      (current) =>
        current ** 2 *
        raw.mechanistic_model!.electrochemistry.external_load_ohm!.value,
    );
    expect(
      Math.abs(grossEnergy - endpointIntegratedMfcEnergy) / grossEnergy,
    ).toBeLessThan(0.05);
    expect(
      result.series
        .find(
          (entry) => entry.y_axis.key === 'gross_electrical_output_energy_j',
        )
        ?.points.at(-1)?.y,
    ).toBeCloseTo(grossEnergy, 12);
    for (const key of [
      'cod_kg_m3',
      'biomass_kg_m3',
      'dissolved_oxygen_kg_m3',
      'ph_anode',
      'ph_cathode',
    ]) {
      const series = result.series.find((entry) => entry.y_axis.key === key);
      expect(series).toBeDefined();
      expect(
        series!.points.every(
          (point) =>
            Number.isFinite(point.y) &&
            point.y >= 0 &&
            (key.startsWith('ph_') ? point.y <= 14 : true),
        ),
      ).toBe(true);
    }
    expect(result.input_snapshot?.model_inputs).toBeDefined();
    expect(result.provenance.source_refs).toContain(
      'test-fixture://coupled-mfc-biosensor-v1',
    );
  });

  it('damps a cathode-to-anode pH gradient through inter-chamber exchange', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    const model = raw.mechanistic_model!;
    delete raw.stack_blocks!.sensors_and_analytics!.biosensor;
    model.operation.initial_biomass_kg_m3.value = 0;
    model.operation.influent_ph.value = 6;
    model.operation.initial_ph_anode.value = 6;
    model.operation.initial_ph_cathode.value = 8;
    model.operation.flow_m3_s.value = 1e-12;
    model.operation.duration_s.value = 100;
    model.operation.time_step_s.value = 100;
    model.biology.proton_transfer_coefficient_mol_s_ph.value = 1e-5;

    const result = evaluate(raw);
    expect(result.status).toBe('completed');
    const anodeSeries = result.series.find(
      (entry) => entry.y_axis.key === 'ph_anode',
    );
    const cathodeSeries = result.series.find(
      (entry) => entry.y_axis.key === 'ph_cathode',
    );
    expect(anodeSeries).toBeDefined();
    expect(cathodeSeries).toBeDefined();
    const anodePh = anodeSeries!.points;
    const cathodePh = cathodeSeries!.points;
    const initialGap = Math.abs(anodePh[0].y - cathodePh[0].y);
    const nextGap = Math.abs(anodePh[1].y - cathodePh[1].y);

    expect(anodePh[1].y).toBeGreaterThan(anodePh[0].y);
    expect(cathodePh[1].y).toBeLessThan(cathodePh[0].y);
    expect(nextGap).toBeLessThan(initialGap);
  });

  it('solves wastewater MFC outputs without requiring an optional biosensor', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    delete raw.stack_blocks!.sensors_and_analytics!.biosensor;

    const result = evaluate(raw);

    expect(result.status).toBe('completed');
    expect(valueFor(result, 'cod_removal_pct')).toEqual(expect.any(Number));
    expect(valueFor(result, 'gross_power_w') as number).toBeGreaterThan(0);
    expect(valueFor(result, 'biosensor_signal_current_a')).toBeNull();
    expect(
      result.derived_observations.every(
        (observation) => observation.source_kind === 'modeled',
      ),
    ).toBe(true);
  });

  it('accounts for modeled COD, biomass, polarization, and boundary residuals', () => {
    const mfcRaw = structuredClone(fixture) as RawCaseInput;
    delete mfcRaw.stack_blocks!.sensors_and_analytics!.biosensor;
    const mfc = evaluate(mfcRaw);
    const mfcValue = (key: string) => valueFor(mfc, key) as number;

    expect(mfc.status).toBe('completed');
    expect(mfcValue('cod_mass_balance_residual_kg')).toBeCloseTo(0, 12);
    expect(mfcValue('biomass_mass_balance_residual_kg')).toBeCloseTo(0, 12);
    expect(mfcValue('electrochemical_reversible_potential_work_j')).toBeCloseTo(
      mfcValue('gross_electrical_output_energy_j') +
        mfcValue('activation_polarization_work_j') +
        mfcValue('ohmic_polarization_work_j') +
        mfcValue('electrochemical_boundary_residual_energy_j'),
      10,
    );

    const mecRaw = structuredClone(fixture) as RawCaseInput;
    mecRaw.technology_family = 'microbial_electrolysis_cell';
    mecRaw.mechanistic_model!.system_type = 'MEC';
    delete mecRaw.mechanistic_model!.electrochemistry.external_load_ohm;
    mecRaw.mechanistic_model!.electrochemistry.cathode_reaction =
      'hydrogen_evolution';
    mecRaw.mechanistic_model!.electrochemistry.applied_voltage_v = {
      value: 1.2,
      unit: 'V',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://mec-loss-accounting',
    };
    mecRaw.mechanistic_model!.electrochemistry.hydrogen_faraday_efficiency = {
      value: 0.7,
      unit: '1',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://mec-loss-accounting',
    };
    mecRaw.mechanistic_model!.electrochemistry.hydrogen_capture_fraction = {
      value: 0.8,
      unit: '1',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://mec-loss-accounting',
    };
    delete mecRaw.stack_blocks!.sensors_and_analytics!.biosensor;
    const mec = evaluate(mecRaw);
    const mecValue = (key: string) => valueFor(mec, key) as number;

    expect(mec.status).toBe('completed');
    expect(mecValue('cod_mass_balance_residual_kg')).toBeCloseTo(0, 12);
    expect(mecValue('biomass_mass_balance_residual_kg')).toBeCloseTo(0, 12);
    expect(mecValue('mec_cell_electrical_input_energy_j')).toBeCloseTo(
      mecValue('electrochemical_reversible_potential_work_j') +
        mecValue('activation_polarization_work_j') +
        mecValue('ohmic_polarization_work_j') +
        mecValue('electrochemical_boundary_residual_energy_j'),
      8,
    );
    expect(mecValue('hydrogen_gross_production_mol')).toBeCloseTo(
      mecValue('hydrogen_captured_production_mol') +
        mecValue('hydrogen_uncaptured_production_mol'),
      14,
    );
    expect(
      mfc.derived_observations.every((item) => item.source_kind === 'modeled'),
    ).toBe(true);
    expect(
      mec.derived_observations.every((item) => item.source_kind === 'modeled'),
    ).toBe(true);
  });

  it('lowers integrated biosensor confidence when sensor inputs are assumptions', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    const markSourceKind = (
      value: unknown,
      sourceKind: 'measured' | 'assumption',
    ) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => markSourceKind(entry, sourceKind));
        return;
      }
      if (!value || typeof value !== 'object') return;
      const record = value as Record<string, unknown>;
      if ('source_kind' in record) record.source_kind = sourceKind;
      Object.values(record).forEach((entry) =>
        markSourceKind(entry, sourceKind),
      );
    };

    markSourceKind(raw.mechanistic_model, 'measured');
    markSourceKind(
      raw.stack_blocks!.sensors_and_analytics!.biosensor,
      'assumption',
    );

    const result = evaluate(raw);

    expect(result.status).toBe('completed');
    expect(result.confidence.level).toBe('low');
    expect(result.confidence.score).toBe(20);
  });

  it('solves the MEC voltage boundary and derives hydrogen from Faraday balance', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    raw.technology_family = 'microbial_electrolysis_cell';
    raw.mechanistic_model!.system_type = 'MEC';
    delete raw.mechanistic_model!.electrochemistry.external_load_ohm;
    raw.mechanistic_model!.electrochemistry.cathode_reaction =
      'hydrogen_evolution';
    raw.mechanistic_model!.electrochemistry.applied_voltage_v = {
      value: 1.2,
      unit: 'V',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
    };
    raw.mechanistic_model!.electrochemistry.hydrogen_faraday_efficiency = {
      value: 0.7,
      unit: '1',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
    };
    raw.mechanistic_model!.electrochemistry.hydrogen_capture_fraction = {
      value: 0.8,
      unit: '1',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
    };
    const mecBiosensor = raw.stack_blocks!.sensors_and_analytics![
      'biosensor'
    ] as Record<string, unknown>;
    mecBiosensor.deployment_mode = 'mec_integrated';
    mecBiosensor.power_source = 'mec_power_bus';
    mecBiosensor.power_available_w = {
      value: 2,
      unit: 'W',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
    };

    const result = evaluate(raw);

    expect(result.status).toBe('completed');
    expect(
      valueFor(result, 'hydrogen_captured_production_mol_s') as number,
    ).toBeGreaterThan(0);
    const mecCurrentDensity = valueFor(
      result,
      'current_density_a_m2',
    ) as number;
    const mecCurrentA = mecCurrentDensity * 0.01;
    expect(
      valueFor(result, 'mec_cell_electrical_input_w') as number,
    ).toBeCloseTo(mecCurrentA * 1.2, 12);
    expect(
      valueFor(result, 'mec_total_electrical_demand_w') as number,
    ).toBeCloseTo(
      (valueFor(result, 'mec_cell_electrical_input_w') as number) +
        raw.mechanistic_model!.operation.auxiliary_power_w.value,
      12,
    );
    expect(
      valueFor(result, 'hydrogen_gross_production_mol_s') as number,
    ).toBeCloseTo((mecCurrentA * 0.7) / (2 * 96485.33212), 15);
    expect(
      valueFor(result, 'hydrogen_captured_production_mol_s') as number,
    ).toBeCloseTo(
      (valueFor(result, 'hydrogen_gross_production_mol_s') as number) * 0.8,
      12,
    );
    const duration = raw.mechanistic_model!.operation.duration_s.value;
    const auxiliaryPower =
      raw.mechanistic_model!.operation.auxiliary_power_w.value;
    const cellInputEnergy = valueFor(
      result,
      'mec_cell_electrical_input_energy_j',
    ) as number;
    const auxiliaryEnergy = valueFor(
      result,
      'mec_auxiliary_energy_demand_j',
    ) as number;
    const totalDemandEnergy = valueFor(
      result,
      'mec_total_electrical_demand_energy_j',
    ) as number;
    const grossHydrogen = valueFor(
      result,
      'hydrogen_gross_production_mol',
    ) as number;
    const capturedHydrogen = valueFor(
      result,
      'hydrogen_captured_production_mol',
    ) as number;
    expect(cellInputEnergy).toBeGreaterThan(0);
    expect(auxiliaryEnergy).toBeCloseTo(auxiliaryPower * duration, 12);
    expect(totalDemandEnergy).toBeCloseTo(
      cellInputEnergy + auxiliaryEnergy,
      12,
    );
    expect(grossHydrogen).toBeGreaterThan(0);
    expect(capturedHydrogen).toBeCloseTo(grossHydrogen * 0.8, 12);
    const mecCurrentSeries = result.series.find(
      (entry) => entry.y_axis.key === 'current_a',
    )!.points;
    const endpointIntegratedCharge = integrateSeries(mecCurrentSeries);
    const endpointIntegratedHydrogen =
      (endpointIntegratedCharge *
        raw.mechanistic_model!.electrochemistry.hydrogen_faraday_efficiency!
          .value) /
      (2 * 96485.33212);
    const endpointIntegratedMecEnergy =
      endpointIntegratedCharge *
      raw.mechanistic_model!.electrochemistry.applied_voltage_v!.value;
    expect(
      Math.abs(grossHydrogen - endpointIntegratedHydrogen) / grossHydrogen,
    ).toBeLessThan(0.05);
    expect(
      Math.abs(cellInputEnergy - endpointIntegratedMecEnergy) / cellInputEnergy,
    ).toBeLessThan(0.05);
    expect(
      result.series
        .find(
          (entry) => entry.y_axis.key === 'mec_cell_electrical_input_energy_j',
        )
        ?.points.at(-1)?.y,
    ).toBeCloseTo(cellInputEnergy, 12);
    expect(
      result.series
        .find(
          (entry) => entry.y_axis.key === 'hydrogen_captured_production_mol',
        )
        ?.points.at(-1)?.y,
    ).toBeCloseTo(capturedHydrogen, 12);
    expect(valueFor(result, 'biosensor_net_power_w') as number).toBeGreaterThan(
      0,
    );
    expect(
      result.derived_observations.find(
        (entry) => entry.key === 'mec_electrical_input_density_w_m2',
      )?.provenance_note,
    ).toContain('electrical input');
  });

  it('runs a standalone biosensor with a calibration and quantitative detection limits', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    delete raw.mechanistic_model;
    raw.technology_family = 'electrochemical_biosensor';
    raw.primary_objective = 'biosensing';
    const standaloneBiosensor = raw.stack_blocks!.sensors_and_analytics![
      'biosensor'
    ] as Record<string, unknown>;
    standaloneBiosensor.deployment_mode = 'standalone';
    standaloneBiosensor.power_source = 'external';

    const result = evaluate(raw);

    expect(result.status).toBe('completed');
    expect(
      valueFor(result, 'biosensor_signal_current_a') as number,
    ).toBeCloseTo(4.01e-6, 10);
    expect(valueFor(result, 'biosensor_detection_status')).toBe('quantifiable');
    expect(valueFor(result, 'biosensor_net_power_w')).toBeCloseTo(0.01, 6);
  });

  it('conserves the influent COD state when no electroactive biomass is present', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    delete raw.stack_blocks!.sensors_and_analytics!.biosensor;
    const model = raw.mechanistic_model!;
    model.operation.initial_biomass_kg_m3.value = 0;
    model.operation.initial_cod_kg_m3.value =
      model.operation.influent_cod_kg_m3.value;

    const result = simulateMechanisticCase(
      normalizeCaseInput(rawCaseInputSchema.parse(raw)),
    );
    const codSeries = result.series.find(
      (entry) => entry.y_axis.key === 'cod_kg_m3',
    );

    expect(result.status).toBe('completed');
    expect(
      codSeries?.points.every(
        (point) => point.y === model.operation.influent_cod_kg_m3.value,
      ),
    ).toBe(true);
    expect(
      result.observations.find((entry) => entry.key === 'cod_removal_pct')
        ?.value,
    ).toBe(0);
    expect(
      result.observations.find((entry) => entry.key === 'current_density_a_m2')
        ?.value,
    ).toBe(0);
  });

  it('blocks standalone sensor output when the stated external supply is inadequate', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    delete raw.mechanistic_model;
    raw.technology_family = 'electrochemical_biosensor';
    raw.primary_objective = 'biosensing';
    const sensor = raw.stack_blocks!.sensors_and_analytics![
      'biosensor'
    ] as Record<string, unknown>;
    sensor.deployment_mode = 'standalone';
    sensor.power_source = 'external';
    sensor.power_available_w = {
      value: 0,
      unit: 'W',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://insufficient-sensor-supply',
    };

    const result = evaluate(raw);

    expect(result.status).toBe('insufficient_data');
    expect(result.failure_detail?.missing_inputs).toContain(
      'biosensor.power_available_w is below power_consumption_w',
    );
    expect(valueFor(result, 'biosensor_signal_current_a')).toBeNull();
  });

  it('checks an integrated external sensor supply independently of reactor auxiliaries', () => {
    const enoughExternalPower = structuredClone(fixture) as RawCaseInput;
    const enoughSensor = enoughExternalPower.stack_blocks!
      .sensors_and_analytics!['biosensor'] as Record<string, unknown>;
    enoughSensor.power_source = 'external';
    enoughSensor.power_available_w = {
      value: 0.000001,
      unit: 'W',
      source_kind: 'test_fixture',
      source_ref: 'test-fixture://external-integrated-sensor-power',
    };

    const enoughResult = evaluate(enoughExternalPower);
    expect(enoughResult.status).toBe('completed');
    expect(valueFor(enoughResult, 'biosensor_net_power_w')).toBeCloseTo(
      0.0000009,
      12,
    );

    const inadequateExternalPower = structuredClone(enoughExternalPower);
    const inadequateSensor = inadequateExternalPower.stack_blocks!
      .sensors_and_analytics!['biosensor'] as Record<string, unknown>;
    inadequateSensor.power_available_w = {
      value: 0,
      unit: 'W',
      source_kind: 'test_fixture',
      source_ref:
        'test-fixture://insufficient-external-integrated-sensor-power',
    };

    const inadequateResult = evaluate(inadequateExternalPower);
    expect(inadequateResult.status).toBe('insufficient_data');
    expect(inadequateResult.failure_detail?.missing_inputs).toContain(
      'biosensor.power_consumption_w exceeds available process power',
    );
  });

  it('requires separator transport properties whenever a membrane is present', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    raw.mechanistic_model!.geometry.membrane_present = true;

    const result = evaluate(raw);

    expect(result.status).toBe('insufficient_data');
    expect(result.failure_detail?.missing_inputs).toEqual(
      expect.arrayContaining([
        'mechanistic_model.geometry.membrane_thickness_m',
        'mechanistic_model.geometry.membrane_conductivity_s_m',
      ]),
    );
  });

  it('rejects zero flow for the continuous-flow reactor and physically impossible decay inputs', () => {
    const zeroFlow = structuredClone(fixture) as RawCaseInput;
    zeroFlow.mechanistic_model!.operation.flow_m3_s.value = 0;
    const zeroFlowResult = evaluate(zeroFlow);
    expect(zeroFlowResult.status).toBe('insufficient_data');
    expect(zeroFlowResult.failure_detail?.missing_inputs).toContain(
      'mechanistic_model.operation.flow_m3_s.value must be > 0',
    );

    const negativeDecay = structuredClone(fixture) as RawCaseInput;
    negativeDecay.mechanistic_model!.biology.decay_rate_s_inv.value = -1e-6;
    const decayResult = evaluate(negativeDecay);
    expect(decayResult.status).toBe('insufficient_data');
    expect(decayResult.failure_detail?.missing_inputs).toContain(
      'mechanistic_model.biology.decay_rate_s_inv.value must be >= 0',
    );
  });

  it('rejects model parameters with incompatible units or no source reference', () => {
    const incompatibleUnit = structuredClone(fixture) as RawCaseInput;
    incompatibleUnit.mechanistic_model!.operation.influent_cod_kg_m3.unit =
      'mgCOD/L';
    const unitResult = evaluate(incompatibleUnit);
    expect(unitResult.status).toBe('insufficient_data');
    expect(unitResult.failure_detail?.missing_inputs).toContain(
      'mechanistic_model.operation.influent_cod_kg_m3.unit (expected kgCOD/m3)',
    );

    const missingSource = structuredClone(fixture) as RawCaseInput;
    missingSource.mechanistic_model!.operation.temperature_k.source_ref = '';
    expect(() => rawCaseInputSchema.parse(missingSource)).toThrow();
  });

  it('rejects biosensor analytical percentages outside their defined range', () => {
    const raw = structuredClone(fixture) as RawCaseInput;
    const sensor = raw.stack_blocks!.sensors_and_analytics!.biosensor!;
    sensor.analytical_performance.selectivity_pct.value = 101;
    const result = evaluate(raw);

    expect(result.status).toBe('insufficient_data');
    expect(result.failure_detail?.missing_inputs).toContain(
      'biosensor.analytical_performance.selectivity_pct.value must be in [0, 100]',
    );
  });

  it.each(['standalone', 'mfc_integrated', 'mec_integrated'] as const)(
    'blocks $0 biosensor inputs when required fields, units, or ranges are invalid',
    (deploymentMode) => {
      const makeCase = () => {
        const raw = structuredClone(fixture) as RawCaseInput;
        const sensor = raw.stack_blocks!.sensors_and_analytics!.biosensor!;
        sensor.deployment_mode = deploymentMode;

        if (deploymentMode === 'standalone') {
          delete raw.mechanistic_model;
          raw.technology_family = 'electrochemical_biosensor';
          raw.primary_objective = 'biosensing';
          sensor.power_source = 'external';
        } else if (deploymentMode === 'mec_integrated') {
          raw.technology_family = 'microbial_electrolysis_cell';
          raw.mechanistic_model!.system_type = 'MEC';
          delete raw.mechanistic_model!.electrochemistry.external_load_ohm;
          raw.mechanistic_model!.electrochemistry.cathode_reaction =
            'hydrogen_evolution';
          raw.mechanistic_model!.electrochemistry.applied_voltage_v = {
            value: 1.2,
            unit: 'V',
            source_kind: 'test_fixture',
            source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
          };
          raw.mechanistic_model!.electrochemistry.hydrogen_faraday_efficiency =
            {
              value: 0.7,
              unit: '1',
              source_kind: 'test_fixture',
              source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
            };
          raw.mechanistic_model!.electrochemistry.hydrogen_capture_fraction = {
            value: 0.8,
            unit: '1',
            source_kind: 'test_fixture',
            source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
          };
          sensor.power_source = 'mec_power_bus';
          sensor.power_available_w = {
            value: 2,
            unit: 'W',
            source_kind: 'test_fixture',
            source_ref: 'test-fixture://coupled-mfc-biosensor-v1',
          };
        }

        return raw;
      };

      const missing = makeCase();
      delete missing.stack_blocks!.sensors_and_analytics!.biosensor!
        .concentration;
      const missingResult = evaluate(missing);
      expect(missingResult.status).toBe('insufficient_data');
      expect(valueFor(missingResult, 'biosensor_signal_current_a')).toBeNull();

      const incompatibleUnit = makeCase();
      incompatibleUnit.stack_blocks!.sensors_and_analytics!.biosensor!.concentration!.unit =
        'g/L';
      const unitResult = evaluate(incompatibleUnit);
      expect(unitResult.status).toBe('insufficient_data');
      expect(unitResult.failure_detail?.missing_inputs).toContain(
        'biosensor.concentration.unit (expected mg/L)',
      );

      const outOfRange = makeCase();
      outOfRange.stack_blocks!.sensors_and_analytics!.biosensor!.concentration!.value = 101;
      const rangeResult = evaluate(outOfRange);
      expect(rangeResult.status).toBe('insufficient_data');
      expect(rangeResult.failure_detail?.missing_inputs).toContain(
        'biosensor.concentration is outside the calibration range',
      );
    },
  );
});
