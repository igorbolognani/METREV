'use client';

import * as React from 'react';

import type { CaseFormStep } from '@/lib/case-form-query-state';
import type { CaseIntakeFormValues } from '@/lib/case-intake';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WorkspaceDataCard } from '@/components/workspace-chrome';

void React;

type StackDetailStep = Extract<
  CaseFormStep,
  | 'reactor-architecture'
  | 'anode-biofilm'
  | 'cathode-catalyst'
  | 'membrane-separator'
  | 'balance-of-plant'
  | 'sensors-analytics'
  | 'biology-startup'
>;

type FieldConfig =
  | {
      field: keyof CaseIntakeFormValues;
      hint?: string;
      kind: 'input';
      label: string;
      placeholder?: string;
      wide?: boolean;
    }
  | {
      field: keyof CaseIntakeFormValues;
      kind: 'select';
      label: string;
      options: Array<{ label: string; value: string }>;
      wide?: boolean;
    }
  | {
      field: keyof CaseIntakeFormValues;
      hint?: string;
      kind: 'textarea';
      label: string;
      placeholder?: string;
      wide?: boolean;
    };

const lowMediumHighOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Unknown', value: 'unknown' },
] as const;

const membranePresenceOptions = [
  { label: 'Present', value: 'present' },
  { label: 'Absent', value: 'absent' },
  { label: 'Unknown', value: 'unknown' },
] as const;

const stackDetailStepConfigs: Record<
  StackDetailStep,
  {
    description: string;
    fields: FieldConfig[];
    guidance: string;
    guidanceTitle: string;
    stepLabel: string;
    title: string;
  }
> = {
  'reactor-architecture': {
    description:
      'Describe the current topology and maintenance posture before judging component changes.',
    fields: [
      {
        field: 'architectureFamily',
        hint: 'Single chamber, dual chamber, modular stack, or the current runtime label.',
        kind: 'input',
        label: 'Architecture family',
        placeholder: 'single_chamber_air_cathode',
      },
      {
        field: 'reactorArchitectureType',
        hint: 'Use the stack-block architecture term when it differs from the top-level family label.',
        kind: 'input',
        label: 'Reactor architecture type',
        placeholder: 'single_chamber_air_cathode',
      },
      {
        field: 'reactorSolidsTolerance',
        kind: 'select',
        label: 'Solids tolerance',
        options: [...lowMediumHighOptions],
      },
      {
        field: 'reactorServiceabilityLevel',
        kind: 'select',
        label: 'Serviceability level',
        options: [...lowMediumHighOptions],
      },
      {
        field: 'membranePresence',
        kind: 'select',
        label: 'Membrane presence',
        options: [...membranePresenceOptions],
      },
    ],
    guidance:
      'This step anchors the rest of the cockpit. If the topology is vague, downstream evidence, suppliers, and recommendations become harder to interpret defensibly.',
    guidanceTitle: 'Anchor the hardware posture',
    stepLabel: 'Step 2',
    title: 'Reactor architecture',
  },
  'anode-biofilm': {
    description:
      'Capture the anode-side materials and the conditions that support stable electroactive biofilms.',
    fields: [
      {
        field: 'anodeMaterialFamily',
        kind: 'input',
        label: 'Anode material family',
        placeholder: 'carbon felt',
      },
      {
        field: 'anodeSurfaceTreatment',
        kind: 'input',
        label: 'Surface treatment',
        placeholder: 'heat-treated',
      },
      {
        field: 'anodeBiofilmSupportLevel',
        kind: 'select',
        label: 'Biofilm support level',
        options: [...lowMediumHighOptions],
      },
    ],
    guidance:
      'Keep the anode description concrete enough that the rule engine can distinguish material, startup, and observability problems from general system uncertainty.',
    guidanceTitle: 'Separate material from maturity',
    stepLabel: 'Step 3',
    title: 'Anode & biofilm support',
  },
  'cathode-catalyst': {
    description:
      'Define the cathode target and the transport limitations that constrain the current stack.',
    fields: [
      {
        field: 'cathodeReactionTarget',
        kind: 'input',
        label: 'Reaction target',
        placeholder: 'ORR',
      },
      {
        field: 'cathodeCatalystFamily',
        kind: 'input',
        label: 'Catalyst family',
        placeholder: 'activated carbon',
      },
      {
        field: 'cathodeMassTransportLimitationRisk',
        kind: 'select',
        label: 'Mass-transport limitation risk',
        options: [...lowMediumHighOptions],
      },
      {
        field: 'cathodeGasHandlingInterface',
        hint: 'Describe gas handling, flooding, passive air interfaces, or other cathode-side constraints.',
        kind: 'textarea',
        label: 'Gas-handling interface',
        placeholder: 'Passive air cathode with intermittent fouling',
        wide: true,
      },
    ],
    guidance:
      'Cathode-side failure modes are frequently overgeneralized. Make transport and gas-interface posture explicit so later recommendations stay grounded.',
    guidanceTitle: 'Name the limiting mechanism',
    stepLabel: 'Step 4',
    title: 'Cathode & catalyst support',
  },
  'membrane-separator': {
    description:
      'Record the separator or membrane posture instead of burying it in generic supplier or note fields.',
    fields: [
      {
        field: 'membraneSeparatorType',
        kind: 'input',
        label: 'Separator or membrane type',
        placeholder: 'cation_exchange_membrane',
      },
      {
        field: 'membraneFoulingRisk',
        kind: 'select',
        label: 'Fouling risk',
        options: [...lowMediumHighOptions],
      },
      {
        field: 'membraneCrossoverControlLevel',
        kind: 'select',
        label: 'Crossover control level',
        options: [...lowMediumHighOptions],
      },
    ],
    guidance:
      'Separator assumptions materially change confidence and shortlist logic. If it is present or absent, say so explicitly here instead of leaving it implicit.',
    guidanceTitle: 'Keep separator posture explicit',
    stepLabel: 'Step 5',
    title: 'Membrane / separator',
  },
  'balance-of-plant': {
    description:
      'Capture the non-electrode hardware that can block deployment even when electrochemical performance looks promising.',
    fields: [
      {
        field: 'balanceFlowControl',
        kind: 'input',
        label: 'Flow control',
        placeholder: 'manual recirculation balancing',
      },
      {
        field: 'balanceGasHandlingReadiness',
        kind: 'select',
        label: 'Gas-handling readiness',
        options: [...lowMediumHighOptions],
      },
      {
        field: 'balanceDosingCapability',
        kind: 'input',
        label: 'Dosing capability',
        placeholder: 'manual',
      },
      {
        field: 'balanceSummary',
        hint: 'Describe the integration layer in one short auditable note.',
        kind: 'textarea',
        label: 'Balance-of-plant summary',
        placeholder:
          'Recirculation loop with manual nutrient and antifoam dosing',
        wide: true,
      },
    ],
    guidance:
      'Balance-of-plant detail is where promising concepts often fail practical review. Capture enough operator reality to keep the roadmap honest.',
    guidanceTitle: 'Treat integration as first-class',
    stepLabel: 'Step 6',
    title: 'Balance of plant',
  },
  'sensors-analytics': {
    description:
      'State how well the current stack is observed rather than treating data quality as a hidden assumption.',
    fields: [
      {
        field: 'sensorsDataQuality',
        kind: 'select',
        label: 'Data quality',
        options: [...lowMediumHighOptions],
      },
      {
        field: 'sensorsVoltageCurrentLogging',
        kind: 'textarea',
        label: 'Voltage / current logging',
        placeholder: 'Manual spot checks',
      },
      {
        field: 'sensorsWaterQualityCoverage',
        kind: 'textarea',
        label: 'Water-quality coverage',
        placeholder: 'Weekly COD only',
      },
    ],
    guidance:
      'Instrumentation gaps directly affect confidence, audit posture, and next-test recommendations. Prefer explicit incompleteness over optimistic shorthand.',
    guidanceTitle: 'Expose observability limits',
    stepLabel: 'Step 7',
    title: 'Sensors & analytics',
  },
  'biology-startup': {
    description:
      'Capture the maturity and startup conditions that shape early-phase performance and uncertainty.',
    fields: [
      {
        field: 'biologyBiofilmMaturity',
        kind: 'input',
        label: 'Biofilm maturity',
        placeholder: 'early',
      },
      {
        field: 'biologyContaminationRisk',
        kind: 'select',
        label: 'Contamination risk',
        options: [...lowMediumHighOptions],
      },
      {
        field: 'biologyInoculumSource',
        kind: 'input',
        label: 'Inoculum source',
        placeholder: 'anaerobic digester sludge',
      },
      {
        field: 'biologyStartupProtocol',
        kind: 'textarea',
        label: 'Startup protocol',
        placeholder: 'Single-pass startup with limited acclimation',
        wide: true,
      },
    ],
    guidance:
      'Startup and biology detail matter most when evidence is sparse or performance is unstable. Keep this explicit so confidence framing remains justified.',
    guidanceTitle: 'Make startup assumptions visible',
    stepLabel: 'Step 8',
    title: 'Biology & startup',
  },
};

export interface CaseFormStackDetailStepProps {
  formValues: CaseIntakeFormValues;
  onFieldChange: (field: keyof CaseIntakeFormValues, value: string) => void;
  step: StackDetailStep;
}

export function CaseFormStackDetailStep({
  formValues,
  onFieldChange,
  step,
}: CaseFormStackDetailStepProps) {
  const config = stackDetailStepConfigs[step];

  return (
    <div className="workspace-form-layout">
      <WorkspaceDataCard>
        <span className="badge subtle">{config.stepLabel}</span>
        <h3>{config.title}</h3>
        <p className="muted">{config.description}</p>
        <div className="workspace-form-grid workspace-form-grid--two">
          {config.fields.map((field) => {
            const className = field.wide
              ? 'workspace-form-field--wide'
              : undefined;
            const value = formValues[field.field] ?? '';

            if (field.kind === 'textarea') {
              return (
                <Textarea
                  className={className}
                  hint={field.hint}
                  key={field.field}
                  label={field.label}
                  onChange={(event) =>
                    onFieldChange(field.field, event.target.value)
                  }
                  placeholder={field.placeholder}
                  value={value}
                />
              );
            }

            if (field.kind === 'select') {
              return (
                <Select
                  key={field.field}
                  label={field.label}
                  onValueChange={(nextValue) =>
                    onFieldChange(field.field, nextValue)
                  }
                  options={field.options}
                  value={value}
                />
              );
            }

            return (
              <Input
                className={className}
                hint={field.hint}
                key={field.field}
                label={field.label}
                onChange={(event) =>
                  onFieldChange(field.field, event.target.value)
                }
                placeholder={field.placeholder}
                value={value}
              />
            );
          })}
        </div>
      </WorkspaceDataCard>

      <WorkspaceDataCard tone="success">
        <span className="badge subtle">Cockpit guidance</span>
        <h3>{config.guidanceTitle}</h3>
        <p>{config.guidance}</p>
      </WorkspaceDataCard>
    </div>
  );
}
