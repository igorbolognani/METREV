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

  return (
    <section className="case-form-stepper" aria-label="Input deck wizard steps">
      <div className="case-form-stepper__summary">
        <span className="badge subtle">Wizard flow</span>
        <strong>
          Step {currentIndex + 1} of {caseFormSteps.length}
        </strong>
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
              type="button"
            >
              <span className="case-form-stepper__marker">{index + 1}</span>
              <span className="case-form-stepper__copy">
                <strong>{step.label}</strong>
                <span>{step.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
