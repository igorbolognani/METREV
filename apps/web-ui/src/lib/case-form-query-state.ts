'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';

export const caseFormStepValues = [
  'context-objective',
  'reactor-architecture',
  'anode-biofilm',
  'cathode-catalyst',
  'membrane-separator',
  'balance-of-plant',
  'sensors-analytics',
  'biology-startup',
  'operating-envelope',
  'suppliers-constraints',
  'review-submit',
] as const;

export type CaseFormStep = (typeof caseFormStepValues)[number];

export const caseFormSteps = [
  {
    description: 'Decision frame, objective, deployment posture, and maturity.',
    label: 'Context & Objective',
    value: 'context-objective',
  },
  {
    description:
      'Topology, serviceability, solids tolerance, and membrane posture.',
    label: 'Reactor Architecture',
    value: 'reactor-architecture',
  },
  {
    description: 'Anode material, surface treatment, and biofilm support.',
    label: 'Anode & Biofilm',
    value: 'anode-biofilm',
  },
  {
    description:
      'Reaction target, catalyst family, transport, and gas interface.',
    label: 'Cathode & Catalyst',
    value: 'cathode-catalyst',
  },
  {
    description: 'Separator type, fouling exposure, and crossover control.',
    label: 'Membrane / Separator',
    value: 'membrane-separator',
  },
  {
    description: 'Flow control, gas handling, dosing, and integration detail.',
    label: 'Balance Of Plant',
    value: 'balance-of-plant',
  },
  {
    description:
      'Data quality, electrical logging, and water-quality coverage.',
    label: 'Sensors & Analytics',
    value: 'sensors-analytics',
  },
  {
    description:
      'Biofilm maturity, contamination risk, inoculum, and startup protocol.',
    label: 'Biology & Startup',
    value: 'biology-startup',
  },
  {
    description:
      'Pain points, operating regime, feed profile, and numeric envelope.',
    label: 'Operating Envelope',
    value: 'operating-envelope',
  },
  {
    description: 'Supplier posture, explicit constraints, and evidence intake.',
    label: 'Suppliers & Constraints',
    value: 'suppliers-constraints',
  },
  {
    description: 'Final review, assumptions, autosave status, and submit.',
    label: 'Review & Submit',
    value: 'review-submit',
  },
] as const satisfies ReadonlyArray<{
  description: string;
  label: string;
  value: CaseFormStep;
}>;

const caseFormStepParser = parseAsStringLiteral(caseFormStepValues)
  .withDefault('context-objective')
  .withOptions({ history: 'push' });

export function getCaseFormStepIndex(step: CaseFormStep): number {
  return caseFormStepValues.indexOf(step);
}

export function useCaseFormStep() {
  return useQueryState('step', caseFormStepParser);
}
