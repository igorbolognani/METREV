'use client';

import * as React from 'react';

import {
    caseFormSteps,
    getCaseFormStepIndex,
    type CaseFormStep,
} from '@/lib/case-form-query-state';

void React;

export interface CaseFormStepperProps {
  completedSteps: CaseFormStep[];
  currentStep: CaseFormStep;
  onStepChange: (step: CaseFormStep) => void;
}

export function CaseFormStepper({
  completedSteps,
  currentStep,
  onStepChange,
}: CaseFormStepperProps) {
  const currentIndex = getCaseFormStepIndex(currentStep);
  const currentStepMeta = caseFormSteps[currentIndex] ?? caseFormSteps[0];

  return (
    <section
      className="case-form-stepper"
      aria-label="Stack cockpit wizard steps"
    >
      <div className="case-form-stepper__summary">
        <div className="case-form-stepper__summary-copy">
          <span className="badge subtle">Input navigator</span>
          <strong>
            Step {currentIndex + 1} of {caseFormSteps.length}
          </strong>
          <p>{currentStepMeta.description}</p>
        </div>
        <span className="meta-chip">Jump between stack blocks</span>
      </div>
      <div className="case-form-stepper__items">
        {caseFormSteps.map((step, index) => {
          const isActive = currentStep === step.value;
          const isDone = completedSteps.includes(step.value);

          return (
            <button
              className={`case-form-stepper__item${isActive ? ' case-form-stepper__item--active' : ''}${isDone ? ' case-form-stepper__item--done' : ''}`}
              key={step.value}
              onClick={() => onStepChange(step.value)}
              aria-current={isActive ? 'step' : undefined}
              type="button"
              title={step.description}
            >
              <span className="case-form-stepper__marker">{index + 1}</span>
              <span className="case-form-stepper__label">{step.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
