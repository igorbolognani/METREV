'use client';

import * as React from 'react';
import { useMemo, useState, type KeyboardEvent } from 'react';

import type {
  EvaluationResponse,
  RawCaseInput,
} from '@metrev/domain-contracts';
import type { CaseIntakeFormValues } from '@/lib/case-intake';

void React;

type Simulation = NonNullable<EvaluationResponse['simulation_enrichment']>;
export type StackAssemblySection =
  | 'reactor-architecture'
  | 'anode-biofilm'
  | 'cathode-catalyst'
  | 'membrane-separator'
  | 'electrical-interconnect'
  | 'balance-of-plant'
  | 'sensors-analytics'
  | 'biology-startup';

export interface StackAssemblySelection {
  system: 'MFC' | 'MEC' | 'biosensor' | 'unspecified';
  modelFidelityId: string;
  architecture: string;
  anodeMaterial: string;
  anodeTreatment: string;
  biofilmSupport: string;
  biofilmMaturity: string;
  biofilmInoculum: string;
  biofilmStartup: string;
  cathodeReaction: string;
  cathodeCatalyst: string;
  cathodeGasHandling: string;
  membranePresence: 'present' | 'absent' | 'unknown';
  separatorType: string;
  currentCollection: string;
  sealing: string;
  flowControl: string;
  gasHandling: string;
  sensorLogging: string;
  waterQualityCoverage: string;
  biosensorPresent: boolean;
  biosensorWorkingElectrode: string;
  biosensorReferenceElectrode: string;
  biosensorCounterElectrode: string;
  biosensorRecognitionElement: string;
  biosensorTransduction: string;
  componentModelParameters: Record<string, Record<string, unknown>>;
}

type Part = {
  id: string;
  title: string;
  value: string;
  section: StackAssemblySection;
  fill: string;
  kind:
    | 'reactor'
    | 'electrode'
    | 'membrane'
    | 'wire'
    | 'pipe'
    | 'sensor'
    | 'biofilm'
    | 'gas';
  selected: boolean;
  detail: string;
};

const sectionLabels: Record<StackAssemblySection, string> = {
  'reactor-architecture': 'Reactor architecture',
  'anode-biofilm': 'Anode & biofilm',
  'cathode-catalyst': 'Cathode & catalyst',
  'membrane-separator': 'Membrane / separator',
  'electrical-interconnect': 'Electrical interconnect',
  'balance-of-plant': 'Balance of plant',
  'sensors-analytics': 'Sensors & analytics',
  'biology-startup': 'Biology & startup',
};

function trimValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseJsonRecord(value: string): Record<string, unknown> {
  if (!value.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function readComponentParameters(
  value: unknown,
): Record<string, Record<string, unknown>> {
  const groups = readRecord(value);
  return Object.fromEntries(
    Object.entries(groups).map(([groupId, entries]) => [
      groupId,
      readRecord(entries),
    ]),
  );
}

function componentParameterDetails(
  selection: StackAssemblySelection,
  groupIds: string[],
): string[] {
  return groupIds.flatMap((groupId) =>
    Object.entries(selection.componentModelParameters[groupId] ?? {}).flatMap(
      ([parameterId, rawValue]) => {
        const parameter = readRecord(rawValue);
        if (typeof parameter.value !== 'number') return [];
        const unit = trimValue(parameter.unit);
        const source = trimValue(parameter.source_ref);
        const displayValue = `${parameterId}: ${parameter.value}${unit ? ` ${unit}` : ''}`;
        return [source ? `${displayValue} · source ${source}` : displayValue];
      },
    ),
  );
}

export function stackAssemblySelectionFromForm(
  values: CaseIntakeFormValues,
): StackAssemblySelection {
  const biosensor = parseJsonRecord(values.biosensorConfigurationJson);
  const model = parseJsonRecord(values.mechanisticModelJson);
  return {
    system:
      values.technologyFamily === 'microbial_fuel_cell'
        ? 'MFC'
        : values.technologyFamily === 'microbial_electrolysis_cell'
          ? 'MEC'
          : 'biosensor',
    modelFidelityId: trimValue(model.model_fidelity_id),
    architecture: values.reactorArchitectureType || values.architectureFamily,
    anodeMaterial: values.anodeMaterialFamily ?? '',
    anodeTreatment: values.anodeSurfaceTreatment ?? '',
    biofilmSupport: values.anodeBiofilmSupportLevel ?? '',
    biofilmMaturity: values.biologyBiofilmMaturity ?? '',
    biofilmInoculum: values.biologyInoculumSource ?? '',
    biofilmStartup: values.biologyStartupProtocol ?? '',
    cathodeReaction: values.cathodeReactionTarget ?? '',
    cathodeCatalyst: values.cathodeCatalystFamily ?? '',
    cathodeGasHandling: values.cathodeGasHandlingInterface ?? '',
    membranePresence:
      values.membranePresence === 'present' ||
      values.membranePresence === 'absent'
        ? values.membranePresence
        : 'unknown',
    separatorType: values.membraneSeparatorType ?? '',
    currentCollection: values.electricalCurrentCollectionStrategy ?? '',
    sealing: values.electricalSealingStrategy ?? '',
    flowControl: values.balanceFlowControl ?? '',
    gasHandling: values.balanceGasHandlingReadiness ?? '',
    sensorLogging: values.sensorsVoltageCurrentLogging ?? '',
    waterQualityCoverage: values.sensorsWaterQualityCoverage ?? '',
    biosensorPresent: values.primaryObjective === 'biosensing',
    biosensorWorkingElectrode: trimValue(biosensor.working_electrode_material),
    biosensorReferenceElectrode: trimValue(
      biosensor.reference_electrode_material,
    ),
    biosensorCounterElectrode: trimValue(biosensor.counter_electrode_material),
    biosensorRecognitionElement: trimValue(biosensor.recognition_element),
    biosensorTransduction: trimValue(biosensor.transduction_mode),
    componentModelParameters: readComponentParameters(
      parseJsonRecord(values.componentModelParametersJson),
    ),
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readPath(raw: RawCaseInput, ...path: string[]): unknown {
  let current: unknown = raw;
  for (const segment of path) current = readRecord(current)[segment];
  return current;
}

export function stackAssemblySelectionFromRawInput(
  raw: RawCaseInput,
): StackAssemblySelection {
  const technology = raw.technology_family;
  const membraneValue = trimValue(
    readPath(
      raw,
      'stack_blocks',
      'reactor_architecture',
      'membrane_presence',
    ) ?? readPath(raw, 'technology_context', 'membrane_presence'),
  );
  const objective = trimValue(raw.primary_objective);
  const mechanisticModel = readRecord(raw.mechanistic_model);
  const componentModelParameters = readPath(
    raw,
    'stack_blocks',
    'component_model_parameters',
  );
  const biosensor = readPath(
    raw,
    'stack_blocks',
    'sensors_and_analytics',
    'biosensor',
  );
  const biosensorRecord = readRecord(biosensor);
  return {
    system:
      technology === 'microbial_fuel_cell'
        ? 'MFC'
        : technology === 'microbial_electrolysis_cell'
          ? 'MEC'
          : technology === 'electrochemical_biosensor'
            ? 'biosensor'
            : 'unspecified',
    modelFidelityId: trimValue(mechanisticModel.model_fidelity_id),
    architecture:
      trimValue(raw.architecture_family) ||
      trimValue(
        readPath(
          raw,
          'stack_blocks',
          'reactor_architecture',
          'architecture_type',
        ),
      ),
    anodeMaterial: trimValue(
      readPath(raw, 'stack_blocks', 'anode_biofilm_support', 'material_family'),
    ),
    anodeTreatment: trimValue(
      readPath(
        raw,
        'stack_blocks',
        'anode_biofilm_support',
        'surface_treatment',
      ),
    ),
    biofilmSupport: trimValue(
      readPath(
        raw,
        'stack_blocks',
        'anode_biofilm_support',
        'biofilm_support_level',
      ),
    ),
    biofilmMaturity: trimValue(
      readPath(raw, 'stack_blocks', 'operational_biology', 'biofilm_maturity'),
    ),
    biofilmInoculum: trimValue(
      readPath(raw, 'stack_blocks', 'operational_biology', 'inoculum_source'),
    ),
    biofilmStartup: trimValue(
      readPath(raw, 'stack_blocks', 'operational_biology', 'startup_protocol'),
    ),
    cathodeReaction: trimValue(
      readPath(
        raw,
        'stack_blocks',
        'cathode_catalyst_support',
        'reaction_target',
      ),
    ),
    cathodeCatalyst: trimValue(
      readPath(
        raw,
        'stack_blocks',
        'cathode_catalyst_support',
        'catalyst_family',
      ),
    ),
    cathodeGasHandling: trimValue(
      readPath(
        raw,
        'stack_blocks',
        'cathode_catalyst_support',
        'gas_handling_interface',
      ),
    ),
    membranePresence:
      membraneValue === 'present' || membraneValue === 'absent'
        ? membraneValue
        : 'unknown',
    separatorType: trimValue(
      readPath(raw, 'stack_blocks', 'membrane_or_separator', 'type'),
    ),
    currentCollection: trimValue(
      readPath(
        raw,
        'stack_blocks',
        'electrical_interconnect_and_sealing',
        'current_collection_strategy',
      ),
    ),
    sealing: trimValue(
      readPath(
        raw,
        'stack_blocks',
        'electrical_interconnect_and_sealing',
        'sealing_strategy',
      ),
    ),
    flowControl: trimValue(
      readPath(raw, 'stack_blocks', 'balance_of_plant', 'flow_control'),
    ),
    gasHandling: trimValue(
      readPath(
        raw,
        'stack_blocks',
        'balance_of_plant',
        'gas_handling_readiness',
      ),
    ),
    sensorLogging: trimValue(
      readPath(
        raw,
        'stack_blocks',
        'sensors_and_analytics',
        'voltage_current_logging',
      ),
    ),
    waterQualityCoverage: trimValue(
      readPath(
        raw,
        'stack_blocks',
        'sensors_and_analytics',
        'water_quality_coverage',
      ),
    ),
    biosensorPresent: Boolean(biosensor) || objective === 'biosensing',
    biosensorWorkingElectrode: trimValue(
      biosensorRecord.working_electrode_material,
    ),
    biosensorReferenceElectrode: trimValue(
      biosensorRecord.reference_electrode_material,
    ),
    biosensorCounterElectrode: trimValue(
      biosensorRecord.counter_electrode_material,
    ),
    biosensorRecognitionElement: trimValue(biosensorRecord.recognition_element),
    biosensorTransduction: trimValue(biosensorRecord.transduction_mode),
    componentModelParameters: readComponentParameters(componentModelParameters),
  };
}

function activateOnKeyDown(
  event: KeyboardEvent<SVGGElement>,
  activate: () => void,
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate();
  }
}

function shorten(value: string, maxLength = 20): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function getModeLabel(system: StackAssemblySelection['system']) {
  if (system === 'MFC') return 'Microbial fuel cell';
  if (system === 'MEC') return 'Microbial electrolysis cell';
  if (system === 'biosensor') return 'Electrochemical biosensor';
  return 'Technology not classified';
}

function makeParts(selection: StackAssemblySelection): Part[] {
  const membraneSelected =
    selection.membranePresence === 'present' ||
    (selection.membranePresence === 'unknown' &&
      Boolean(selection.separatorType));
  const biofilmValue = [
    selection.biofilmSupport,
    selection.biofilmMaturity,
    selection.biofilmInoculum,
    selection.biofilmStartup,
  ]
    .filter(Boolean)
    .join(' · ');
  const parts: Part[] = [
    {
      id: 'reactor',
      title: 'Reactor body',
      value: selection.architecture || 'Architecture not specified',
      section: 'reactor-architecture',
      fill: '#dbeafe',
      kind: 'reactor',
      selected: Boolean(selection.architecture),
      detail: selection.architecture
        ? [
            `Configured architecture: ${selection.architecture}.`,
            ...componentParameterDetails(selection, ['reactor_architecture']),
          ].join(' ')
        : [
            'Chamber geometry and reactor topology have not been specified.',
            ...componentParameterDetails(selection, ['reactor_architecture']),
          ].join(' '),
    },
  ];
  if (selection.anodeMaterial) {
    parts.push({
      id: 'anode',
      title: 'Anode',
      value: selection.anodeMaterial,
      section: 'anode-biofilm',
      fill: '#334155',
      kind: 'electrode',
      selected: true,
      detail: [
        `Material: ${selection.anodeMaterial}.`,
        selection.anodeTreatment
          ? `Surface treatment: ${selection.anodeTreatment}.`
          : '',
        ...componentParameterDetails(selection, ['anode_biofilm_support']),
      ]
        .filter(Boolean)
        .join(' '),
    });
  }
  if (biofilmValue) {
    parts.push({
      id: 'biofilm',
      title: 'Electroactive biofilm',
      value: biofilmValue,
      section: 'biology-startup',
      fill: '#86efac',
      kind: 'biofilm',
      selected: true,
      detail: [
        selection.biofilmSupport
          ? `Biofilm support: ${selection.biofilmSupport}.`
          : '',
        selection.biofilmMaturity
          ? `Biofilm maturity: ${selection.biofilmMaturity}.`
          : '',
        selection.biofilmInoculum
          ? `Inoculum source: ${selection.biofilmInoculum}.`
          : '',
        selection.biofilmStartup
          ? `Startup protocol: ${selection.biofilmStartup}.`
          : '',
        ...componentParameterDetails(selection, ['operational_biology']),
        'These labels do not set biomass concentration or local biofilm properties.',
      ]
        .filter(Boolean)
        .join(' '),
    });
  }
  if (selection.cathodeReaction || selection.cathodeCatalyst) {
    parts.push({
      id: 'cathode',
      title: 'Cathode',
      value: [selection.cathodeReaction, selection.cathodeCatalyst]
        .filter(Boolean)
        .join(' · '),
      section: 'cathode-catalyst',
      fill: '#0f766e',
      kind: 'electrode',
      selected: true,
      detail: [
        selection.cathodeReaction
          ? `Target reaction: ${selection.cathodeReaction}.`
          : '',
        selection.cathodeCatalyst
          ? `Catalyst family: ${selection.cathodeCatalyst}.`
          : '',
        selection.cathodeGasHandling
          ? `Cathode gas interface: ${selection.cathodeGasHandling}.`
          : '',
        ...componentParameterDetails(selection, ['cathode_catalyst_support']),
      ]
        .filter(Boolean)
        .join(' '),
    });
  }
  if (membraneSelected) {
    parts.push({
      id: 'separator',
      title: 'Membrane / separator',
      value: selection.separatorType || 'Presence selected; type unspecified',
      section: 'membrane-separator',
      fill: '#f0abfc',
      kind: 'membrane',
      selected: selection.membranePresence === 'present',
      detail: [
        selection.membranePresence === 'present'
          ? `Separator present${selection.separatorType ? `: ${selection.separatorType}` : ', type not specified'}.`
          : `Presence is unknown; a candidate type is recorded as ${selection.separatorType}.`,
        ...componentParameterDetails(selection, ['membrane_or_separator']),
      ].join(' '),
    });
  }
  if (selection.currentCollection || selection.sealing) {
    parts.push({
      id: 'interconnect',
      title: 'Current path and sealing',
      value: selection.currentCollection || selection.sealing,
      section: 'electrical-interconnect',
      fill: '#f59e0b',
      kind: 'wire',
      selected: true,
      detail: [
        selection.currentCollection
          ? `Current collection: ${selection.currentCollection}.`
          : '',
        selection.sealing ? `Sealing: ${selection.sealing}.` : '',
        ...componentParameterDetails(selection, [
          'electrical_interconnect_and_sealing',
        ]),
      ]
        .filter(Boolean)
        .join(' '),
    });
  }
  if (selection.flowControl) {
    parts.push({
      id: 'bop',
      title: 'Balance of plant',
      value: selection.flowControl,
      section: 'balance-of-plant',
      fill: '#38bdf8',
      kind: 'pipe',
      selected: true,
      detail: [
        selection.flowControl ? `Flow control: ${selection.flowControl}.` : '',
        ...componentParameterDetails(selection, ['balance_of_plant']),
      ]
        .filter(Boolean)
        .join(' '),
    });
  }
  if (
    selection.system === 'MEC' ||
    selection.gasHandling ||
    selection.cathodeGasHandling
  ) {
    const gasValue = [selection.gasHandling, selection.cathodeGasHandling]
      .filter(Boolean)
      .join(' · ');
    parts.push({
      id: 'gas',
      title:
        selection.system === 'MEC'
          ? 'Hydrogen product boundary'
          : 'Gas interface',
      value: gasValue || 'Collection hardware not specified',
      section: 'balance-of-plant',
      fill: '#38bdf8',
      kind: 'gas',
      selected: Boolean(gasValue),
      detail: gasValue
        ? [
            `Configured gas interface: ${gasValue}.`,
            ...componentParameterDetails(selection, ['balance_of_plant']),
          ].join(' ')
        : [
            'The MEC model reports gross and captured hydrogen from an explicit capture input; collection hardware is not described in the stack configuration.',
            ...componentParameterDetails(selection, ['balance_of_plant']),
          ].join(' '),
    });
  }
  const sensorDetails = [
    selection.sensorLogging,
    selection.waterQualityCoverage,
    selection.biosensorWorkingElectrode &&
      `WE ${selection.biosensorWorkingElectrode}`,
    selection.biosensorReferenceElectrode &&
      `RE ${selection.biosensorReferenceElectrode}`,
    selection.biosensorCounterElectrode &&
      `CE ${selection.biosensorCounterElectrode}`,
    selection.biosensorRecognitionElement &&
      `Recognition ${selection.biosensorRecognitionElement}`,
    selection.biosensorTransduction,
  ].filter(Boolean);
  if (sensorDetails.length > 0 || selection.biosensorPresent) {
    parts.push({
      id: 'sensors',
      title: selection.biosensorPresent
        ? 'Biosensor / instrumentation'
        : 'Instrumentation',
      value: sensorDetails.join(' · ') || 'Sensor design not specified',
      section: 'sensors-analytics',
      fill: '#a78bfa',
      kind: 'sensor',
      selected: sensorDetails.length > 0,
      detail: [
        selection.sensorLogging
          ? `Voltage/current logging: ${selection.sensorLogging}.`
          : '',
        selection.waterQualityCoverage
          ? `Water-quality coverage: ${selection.waterQualityCoverage}.`
          : '',
        selection.biosensorWorkingElectrode
          ? `Working electrode: ${selection.biosensorWorkingElectrode}.`
          : '',
        selection.biosensorReferenceElectrode
          ? `Reference electrode: ${selection.biosensorReferenceElectrode}.`
          : '',
        selection.biosensorCounterElectrode
          ? `Counter electrode: ${selection.biosensorCounterElectrode}.`
          : '',
        selection.biosensorRecognitionElement
          ? `Recognition element: ${selection.biosensorRecognitionElement}.`
          : '',
        selection.biosensorTransduction
          ? `Transduction: ${selection.biosensorTransduction}.`
          : '',
        ...componentParameterDetails(selection, ['sensors_and_analytics']),
        selection.biosensorPresent && sensorDetails.length === 0
          ? 'Biosensing is selected; its design details are not specified.'
          : '',
      ]
        .filter(Boolean)
        .join(' '),
    });
  }
  return parts;
}

function getObservation(simulation: Simulation | undefined, key: string) {
  return simulation?.derived_observations.find((entry) => entry.key === key);
}

function formatObservation(
  simulation: Simulation | undefined,
  key: string,
): string | null {
  const output = getObservation(simulation, key);
  if (!output || output.value === null || output.value === undefined)
    return null;
  const value =
    typeof output.value === 'number'
      ? new Intl.NumberFormat('en', { maximumSignificantDigits: 4 }).format(
          output.value,
        )
      : String(output.value);
  return output.unit ? `${value} ${output.unit}` : value;
}

function metricsForPart(
  id: string,
  simulation?: Simulation,
): Array<{ label: string; value: string }> {
  if (!simulation || simulation.status !== 'completed') return [];
  const keys =
    id === 'anode'
      ? [
          ['Current density', 'current_density_a_m2'],
          ['Anode pH', 'ph_anode_final'],
        ]
      : id === 'biofilm'
        ? [['COD removal', 'cod_removal_pct']]
        : id === 'separator'
          ? [['Ohmic voltage drop', 'ohmic_voltage_drop_v']]
          : id === 'interconnect'
            ? [
                ['Net power', 'net_power_w'],
                ['MEC electrical input', 'mec_cell_electrical_input_w'],
              ]
            : id === 'bop'
              ? [['Auxiliary power', 'auxiliary_power_w']]
              : id === 'gas'
                ? [
                    ['Gross hydrogen', 'hydrogen_gross_production_mol_s'],
                    ['Captured hydrogen', 'hydrogen_captured_production_mol_s'],
                    [
                      'Uncaptured hydrogen',
                      'hydrogen_uncaptured_production_mol_s',
                    ],
                  ]
                : id === 'sensors'
                  ? [
                      ['Signal current', 'biosensor_signal_current_a'],
                      ['Signal / noise', 'biosensor_signal_to_noise_ratio'],
                      ['Detection status', 'biosensor_detection_status'],
                      ['Sensor power', 'biosensor_net_power_w'],
                    ]
                  : id === 'cathode'
                    ? [['Cathode pH', 'ph_cathode_final']]
                    : [];
  return keys.flatMap(([label, key]) => {
    const value = formatObservation(simulation, key);
    return value ? [{ label, value }] : [];
  });
}

function SvgPart({
  part,
  active,
  onActivate,
}: {
  part: Part;
  active: boolean;
  onActivate: (id: string) => void;
}) {
  const activate = () => onActivate(part.id);
  const common = {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': `${part.title}: ${part.value}`,
    'aria-pressed': active,
    onClick: activate,
    onKeyDown: (event: KeyboardEvent<SVGGElement>) =>
      activateOnKeyDown(event, activate),
    className: `stack-assembly__svg-part${active ? ' is-active' : ''}${part.selected ? '' : ' is-unresolved'}`,
  };
  if (part.kind === 'reactor') {
    return (
      <g {...common}>
        <rect
          x="198"
          y="94"
          width="356"
          height="225"
          rx="20"
          fill="#eff6ff"
          stroke="#475569"
          strokeWidth="4"
        />
        <rect
          x="209"
          y="105"
          width="334"
          height="203"
          rx="14"
          fill="none"
          stroke="#94a3b8"
          strokeDasharray="7 5"
        />
        <text
          x="376"
          y="292"
          textAnchor="middle"
          className="stack-assembly__svg-label"
        >
          {shorten(part.value, 34)}
        </text>
      </g>
    );
  }
  if (part.kind === 'electrode') {
    const isAnode = part.id === 'anode';
    const x = isAnode ? 270 : 466;
    return (
      <g {...common}>
        <rect
          x={x}
          y="143"
          width="24"
          height="116"
          rx="3"
          fill={part.fill}
          stroke={active ? '#f97316' : '#0f172a'}
          strokeWidth={active ? 4 : 2}
        />
        <text
          x={x + 12}
          y="278"
          textAnchor="middle"
          className="stack-assembly__svg-label"
        >
          {shorten(part.value, 15)}
        </text>
        {part.id === 'cathode' && (
          <text
            x={x + 12}
            y="128"
            textAnchor="middle"
            className="stack-assembly__svg-tiny"
          >
            Cathode
          </text>
        )}
        {part.id === 'anode' && (
          <text
            x={x + 12}
            y="128"
            textAnchor="middle"
            className="stack-assembly__svg-tiny"
          >
            Anode
          </text>
        )}
      </g>
    );
  }
  if (part.kind === 'biofilm') {
    return (
      <g {...common}>
        <rect
          x="296"
          y="151"
          width="10"
          height="100"
          rx="5"
          fill={part.fill}
          stroke={active ? '#f97316' : '#15803d'}
          strokeWidth={active ? 3 : 1}
        />
        <text
          x="301"
          y="267"
          textAnchor="middle"
          className="stack-assembly__svg-tiny"
        >
          Biofilm
        </text>
      </g>
    );
  }
  if (part.kind === 'membrane') {
    return (
      <g {...common}>
        <path
          d="M388 119 V272"
          stroke={part.fill}
          strokeWidth="9"
          strokeDasharray={part.selected ? undefined : '3 7'}
        />
        <path
          d="M380 119 V272"
          stroke={active ? '#f97316' : '#a21caf'}
          strokeWidth="2"
        />
        <text
          x="384"
          y="292"
          textAnchor="middle"
          className="stack-assembly__svg-tiny"
        >
          Separator
        </text>
      </g>
    );
  }
  if (part.kind === 'wire') {
    return (
      <g {...common}>
        <path
          d="M282 143 V74 H449 V143"
          fill="none"
          stroke={active ? '#f97316' : part.fill}
          strokeWidth="5"
        />
        <path
          d="M348 74 l8 -8 l8 16 l8 -16 l8 16 l8 -8"
          fill="none"
          stroke="#854d0e"
          strokeWidth="3"
        />
        <text
          x="370"
          y="59"
          textAnchor="middle"
          className="stack-assembly__svg-tiny"
        >
          Circuit / collector
        </text>
      </g>
    );
  }
  if (part.kind === 'pipe') {
    return (
      <g {...common}>
        <path
          d="M89 189 H198 M554 189 H647"
          fill="none"
          stroke={active ? '#f97316' : part.fill}
          strokeWidth="5"
        />
        <path
          d="M89 189 l13 -8 v16 z M647 189 l-13 -8 v16 z"
          fill={part.fill}
        />
        <text
          x="368"
          y="338"
          textAnchor="middle"
          className="stack-assembly__svg-tiny"
        >
          Hydraulic flow path
        </text>
      </g>
    );
  }
  if (part.kind === 'gas') {
    return (
      <g {...common}>
        <path
          d="M490 143 V113 H620"
          fill="none"
          stroke={active ? '#f97316' : part.fill}
          strokeWidth="4"
        />
        <path
          d="M620 99 Q638 112 620 125 Q602 112 620 99 Z"
          fill="#bae6fd"
          stroke="#0369a1"
          strokeWidth="2"
        />
        <text
          x="613"
          y="145"
          textAnchor="middle"
          className="stack-assembly__svg-tiny"
        >
          Gas boundary
        </text>
      </g>
    );
  }
  return (
    <g {...common}>
      <rect
        x="605"
        y="223"
        width="86"
        height="46"
        rx="10"
        fill={part.fill}
        stroke={active ? '#f97316' : '#6d28d9'}
        strokeWidth={active ? 4 : 2}
      />
      <circle cx="624" cy="246" r="6" fill="#fff" />
      <text
        x="651"
        y="241"
        textAnchor="middle"
        className="stack-assembly__svg-tiny"
      >
        Sensor
      </text>
      <text
        x="625"
        y="260"
        textAnchor="middle"
        className="stack-assembly__svg-tiny"
      >
        W
      </text>
      <text
        x="642"
        y="260"
        textAnchor="middle"
        className="stack-assembly__svg-tiny"
      >
        R
      </text>
      <text
        x="660"
        y="260"
        textAnchor="middle"
        className="stack-assembly__svg-tiny"
      >
        C
      </text>
    </g>
  );
}

export function StackAssemblySvg({
  selection,
  simulation,
  onNavigate,
  presentation = 'configuration',
}: {
  selection: StackAssemblySelection;
  simulation?: Simulation;
  onNavigate?: (section: StackAssemblySection) => void;
  presentation?: 'configuration' | 'modeled_run';
}) {
  const parts = useMemo(() => makeParts(selection), [selection]);
  const [activePartId, setActivePartId] = useState('reactor');
  const activePart = parts.find((part) => part.id === activePartId) ?? parts[0];
  const allSections = [
    'reactor-architecture',
    'anode-biofilm',
    'cathode-catalyst',
    'membrane-separator',
    'electrical-interconnect',
    'balance-of-plant',
    'sensors-analytics',
    'biology-startup',
  ] as const satisfies StackAssemblySection[];
  const partForSection = (section: StackAssemblySection) =>
    parts.find((part) => part.section === section);
  const namedOutputs = [
    ['Current density', 'current_density_a_m2'],
    ['COD removal', 'cod_removal_pct'],
    ['Net electrical output', 'net_power_w'],
    ['MEC electrical input', 'mec_cell_electrical_input_w'],
    ['Captured hydrogen', 'hydrogen_captured_production_mol_s'],
  ].flatMap(([label, key]) => {
    const value = formatObservation(simulation, key);
    return value ? [{ label, value }] : [];
  });

  return (
    <section
      className={`stack-assembly stack-assembly--${presentation}`}
      aria-label="Interactive fuel-cell stack assembly"
    >
      <header className="stack-assembly__header">
        <div>
          <span className="badge subtle">
            {presentation === 'modeled_run'
              ? 'Configured stack and model outputs'
              : 'Live stack assembly'}
          </span>
          <h3>{getModeLabel(selection.system)}</h3>
          <p>
            {presentation === 'modeled_run'
              ? 'The diagram reflects the submitted component choices. Values marked as modeled are outputs from this run.'
              : 'Choose stack properties in each section. The drawing adds, removes, and relabels the matching parts as the draft changes.'}
          </p>
        </div>
        <div className="stack-assembly__dimension-tag">
          <strong>
            {selection.modelFidelityId || 'Model fidelity not selected'}
          </strong>
          <span>{selection.architecture || 'Architecture not classified'}</span>
        </div>
      </header>

      <div className="stack-assembly__grid">
        <div className="stack-assembly__canvas-wrap">
          <svg
            className="stack-assembly__canvas"
            viewBox="0 0 720 370"
            role="img"
            aria-labelledby="stack-assembly-title stack-assembly-description"
          >
            <title id="stack-assembly-title">
              {`Configurable ${getModeLabel(selection.system)} cross-section`}
            </title>
            <desc id="stack-assembly-description">
              An interactive schematic. Select a drawn component or a component
              card to inspect its configured description. The drawing is
              conceptual and not to scale.
            </desc>
            <defs>
              <linearGradient
                id="stack-liquid-gradient"
                x1="0"
                x2="1"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="100%" stopColor="#bfdbfe" />
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="712" height="362" rx="18" fill="#f8fafc" />
            {parts.map((part) => (
              <SvgPart
                active={activePart?.id === part.id}
                key={part.id}
                onActivate={setActivePartId}
                part={part}
              />
            ))}
            <text
              x="368"
              y="29"
              textAnchor="middle"
              className="stack-assembly__svg-overline"
            >
              CONCEPTUAL CUTAWAY · NOT TO SCALE
            </text>
            <text
              x="143"
              y="174"
              textAnchor="middle"
              className="stack-assembly__svg-tiny"
            >
              Influent
            </text>
            <text
              x="604"
              y="174"
              textAnchor="middle"
              className="stack-assembly__svg-tiny"
            >
              Effluent / product
            </text>
            <text
              x="376"
              y="357"
              textAnchor="middle"
              className="stack-assembly__svg-label"
            >
              {selection.system === 'MEC'
                ? 'External electrical input · hydrogen captured only when configured'
                : selection.system === 'MFC'
                  ? 'External load boundary · auxiliary demand remains separate'
                  : 'Sensor power source must be declared'}
            </text>
          </svg>
          <p className="stack-assembly__scale-note">
            Parts are a navigation and configuration aid; their drawn dimensions
            are not the model geometry.
          </p>
        </div>

        <aside
          className="stack-assembly__inspector"
          aria-label="Stack components"
        >
          <div className="stack-assembly__inspector-heading">
            <strong>Stack components</strong>
            <span>
              {parts.filter((part) => part.selected).length} configured
            </span>
          </div>
          <div className="stack-assembly__part-list">
            {allSections.map((section) => {
              const part = partForSection(section);
              const active = activePart?.section === section;
              return (
                <div
                  className={`stack-assembly__part-row${active ? ' is-active' : ''}`}
                  key={section}
                >
                  <button
                    type="button"
                    className="stack-assembly__part-select"
                    onClick={() => setActivePartId(part?.id ?? 'reactor')}
                    aria-pressed={active}
                  >
                    <span
                      className={`stack-assembly__part-dot${part ? ' is-configured' : ''}`}
                    />
                    <span>
                      <strong>{sectionLabels[section]}</strong>
                      <small>{part?.value || 'Not specified'}</small>
                    </span>
                  </button>
                  {onNavigate ? (
                    <button
                      className="stack-assembly__edit-link"
                      type="button"
                      onClick={() => onNavigate(section)}
                      aria-label={`Configure ${sectionLabels[section]}`}
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="stack-assembly__active-detail" aria-live="polite">
            <strong>{activePart?.title ?? 'Component'}</strong>
            <p>{activePart?.detail ?? 'No component details.'}</p>
            {activePart
              ? metricsForPart(activePart.id, simulation).map((metric) => (
                  <div
                    className="stack-assembly__modeled-metric"
                    key={metric.label}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))
              : null}
          </div>
        </aside>
      </div>

      {presentation === 'modeled_run' ? (
        <div
          className="stack-assembly__outputs"
          aria-label="Modeled run values"
        >
          <span className="badge subtle">Modeled outputs</span>
          {namedOutputs.length > 0 ? (
            namedOutputs.map((output) => (
              <span className="stack-assembly__output-chip" key={output.label}>
                <small>{output.label}</small>
                <strong>{output.value}</strong>
              </span>
            ))
          ) : (
            <p className="muted">
              This run has no modeled values to attach to the assembly.
            </p>
          )}
        </div>
      ) : (
        <div className="stack-assembly__outputs">
          <span className="badge subtle">Configuration state</span>
          <p className="muted">
            {selection.membranePresence === 'absent'
              ? 'The separator layer is removed because membrane presence is explicitly set to absent.'
              : selection.membranePresence === 'present'
                ? 'The separator layer is shown because membrane presence is explicitly set to present.'
                : 'Membrane presence remains unknown; the view does not infer one.'}
          </p>
        </div>
      )}
    </section>
  );
}
