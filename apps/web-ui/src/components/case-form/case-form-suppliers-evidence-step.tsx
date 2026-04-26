'use client';

import * as React from 'react';

import type { ExternalEvidenceCatalogItemSummary } from '@metrev/domain-contracts';

import type { CaseIntakeFormValues } from '@/lib/case-intake';

import { AcceptedEvidenceSelector } from '@/components/accepted-evidence-selector';
import { ChipInput } from '@/components/ui/chip-input';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WorkspaceDataCard } from '@/components/workspace-chrome';

void React;

const supplierSuggestions = [
  'Econic',
  'OpenCell Systems',
  'BioVolt Process',
  'DuPont Water Solutions',
  'Veolia Water Technologies',
  'Evoqua Water Technologies',
];

const evidenceTypeOptions = [
  { label: 'Internal benchmark', value: 'internal_benchmark' },
  { label: 'Literature evidence', value: 'literature_evidence' },
  { label: 'Supplier claim', value: 'supplier_claim' },
  { label: 'Engineering assumption', value: 'engineering_assumption' },
  { label: 'Derived heuristic', value: 'derived_heuristic' },
] as const;

const evidenceStrengthOptions = [
  { label: 'Weak', value: 'weak' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Strong', value: 'strong' },
] as const;

export interface CaseFormSuppliersEvidenceStepProps {
  formValues: CaseIntakeFormValues;
  onFieldChange: (field: keyof CaseIntakeFormValues, value: string) => void;
  onSelectionChange: (items: ExternalEvidenceCatalogItemSummary[]) => void;
  selectedCatalogEvidence: ExternalEvidenceCatalogItemSummary[];
}

export function CaseFormSuppliersEvidenceStep({
  formValues,
  onFieldChange,
  onSelectionChange,
  selectedCatalogEvidence,
}: CaseFormSuppliersEvidenceStepProps) {
  return (
    <div className="workspace-form-layout">
      <WorkspaceDataCard>
        <span className="badge subtle">Step 10</span>
        <h3>Suppliers & constraints</h3>
        <div className="workspace-form-grid workspace-form-grid--two">
          <ChipInput
            hint="Preferred vendors that should remain explicit in the shortlist logic."
            label="Preferred suppliers"
            onValueChange={(value) =>
              onFieldChange('preferredSuppliers', value)
            }
            placeholder="Add a preferred supplier"
            suggestions={supplierSuggestions}
            value={formValues.preferredSuppliers}
          />
          <ChipInput
            hint="Incumbent or currently installed suppliers."
            label="Current suppliers"
            onValueChange={(value) => onFieldChange('currentSuppliers', value)}
            placeholder="Add a current supplier"
            suggestions={supplierSuggestions}
            value={formValues.currentSuppliers}
          />
          <ChipInput
            hint="Suppliers that should remain out of shortlist consideration for this run."
            label="Excluded suppliers"
            onValueChange={(value) => onFieldChange('excludedSuppliers', value)}
            placeholder="Add an excluded supplier"
            suggestions={supplierSuggestions}
            value={formValues.excludedSuppliers ?? ''}
          />
          <Textarea
            className="workspace-form-field--wide"
            hint="Explain supplier fit, install constraints, service expectations, or sourcing boundaries that matter to the shortlist."
            label="Supplier preference notes"
            onChange={(event) =>
              onFieldChange('supplierPreferenceNotes', event.target.value)
            }
            placeholder="Prefer retrofit-friendly vendors with wastewater references and maintainable cathode assemblies."
            value={formValues.supplierPreferenceNotes ?? ''}
          />
          <Textarea
            className="workspace-form-field--wide"
            hint="Separate hard constraints with commas when you want them carried as distinct rule-facing items."
            label="Hard constraints"
            onChange={(event) =>
              onFieldChange('hardConstraints', event.target.value)
            }
            placeholder="Retrofit must fit the current skid envelope, no chlorinated catalyst handling on site"
            value={formValues.hardConstraints ?? ''}
          />
        </div>
      </WorkspaceDataCard>

      <AcceptedEvidenceSelector
        selectedEvidence={selectedCatalogEvidence}
        onSelectionChange={onSelectionChange}
      />

      <WorkspaceDataCard tone="warning">
        <span className="badge subtle">Manual typed evidence</span>
        <div className="workspace-form-grid workspace-form-grid--two">
          <Select
            label="Evidence type"
            onValueChange={(value) => onFieldChange('evidenceType', value)}
            options={[...evidenceTypeOptions]}
            value={formValues.evidenceType}
          />
          <Select
            label="Strength level"
            onValueChange={(value) => onFieldChange('evidenceStrength', value)}
            options={[...evidenceStrengthOptions]}
            value={formValues.evidenceStrength}
          />
          <Input
            className="workspace-form-field--wide"
            label="Evidence title"
            onChange={(event) =>
              onFieldChange('evidenceTitle', event.target.value)
            }
            placeholder="Pilot baseline, supplier datasheet, internal trial..."
            value={formValues.evidenceTitle}
          />
          <Textarea
            className="workspace-form-field--wide"
            label="Evidence summary"
            onChange={(event) =>
              onFieldChange('evidenceSummary', event.target.value)
            }
            placeholder="Short description of the evidence and why it matters to this run."
            value={formValues.evidenceSummary}
          />
        </div>
      </WorkspaceDataCard>
    </div>
  );
}
