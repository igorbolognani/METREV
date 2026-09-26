import React from 'react';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';
import { describe, expect, it, vi } from 'vitest';

import type { EvaluationResponse } from '@metrev/domain-contracts';

vi.mock('next/navigation', () => ({ usePathname: () => '/modeling' }));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

import { ModelingWorkbench } from '@/components/modeling/modeling-workbench';
import {
  StackAssemblySvg,
  stackAssemblySelectionFromForm,
} from '@/components/modeling/stack-assembly-svg';
import { defaultCaseIntakeFormValues } from '@/lib/case-intake';

describe('modeling workbench', () => {
  it('renders the interactive assembly, research-only fidelity register, and full component property catalog', () => {
    const html = renderToStaticMarkup(React.createElement(ModelingWorkbench));

    expect(html).toContain('Assemble the cell as you specify it');
    expect(html).toContain('Interactive fuel-cell stack assembly');
    expect(html).toContain('0D transient coupled reactor');
    expect(html).toContain('biofilm-1d-direct-transfer-research-v1');
    expect(html).toContain('cell-3d-multiphysics-research-v1');
    expect(html).toContain('electrode-interface-nano-research-v1');
    expect(html).toContain('reactor_architecture');
    expect(html).toContain('maximum_specific_cod_uptake_kg_cod_kg_biomass_s');
    expect(html).toContain(
      'A rigorous register cannot stand in for a validated solver',
    );
  });

  it('adds configured components and modeled hydrogen to the same assembly, and removes an explicitly absent separator', () => {
    const selection = stackAssemblySelectionFromForm({
      ...defaultCaseIntakeFormValues,
      technologyFamily: 'microbial_electrolysis_cell',
      reactorArchitectureType: 'dual chamber',
      anodeMaterialFamily: 'carbon felt',
      anodeBiofilmSupportLevel: 'attached biofilm',
      biologyBiofilmMaturity: 'mature',
      cathodeReactionTarget: 'hydrogen evolution',
      cathodeCatalystFamily: 'activated carbon',
      membranePresence: 'present',
      membraneSeparatorType: 'cation exchange membrane',
      mechanisticModelJson: JSON.stringify({
        model_fidelity_id: 'coupled-0d-dae-v1',
      }),
      componentModelParametersJson: JSON.stringify({
        reactor_architecture: {
          reactor_length_m: {
            value: 0.2,
            unit: 'm',
            source_kind: 'measured',
            source_ref: 'dataset://cell-17',
          },
        },
      }),
    });
    const simulation = {
      status: 'completed',
      derived_observations: [
        {
          observation_id: 'modeled-h2-captured',
          key: 'hydrogen_captured_production_mol_s',
          label: 'Captured MEC hydrogen rate',
          value: 0.0004,
          unit: 'mol/s',
          source_kind: 'modeled',
          confidence_level: 'medium',
          decision_relevance: 'informational',
          provenance_note: 'Fixture output for assembly mapping.',
          assumptions: [],
          missing_dependencies: [],
        },
      ],
    } as NonNullable<EvaluationResponse['simulation_enrichment']>;

    const configuredHtml = renderToStaticMarkup(
      React.createElement(StackAssemblySvg, {
        selection,
        simulation,
        presentation: 'modeled_run',
      }),
    );
    const separatorRemovedHtml = renderToStaticMarkup(
      React.createElement(StackAssemblySvg, {
        selection: { ...selection, membranePresence: 'absent' },
      }),
    );

    expect(configuredHtml).toContain('aria-label="Anode: carbon felt"');
    expect(configuredHtml).toContain(
      'aria-label="Electroactive biofilm: attached biofilm',
    );
    expect(configuredHtml).toContain(
      'aria-label="Cathode: hydrogen evolution · activated carbon"',
    );
    expect(configuredHtml).toContain(
      'aria-label="Membrane / separator: cation exchange membrane"',
    );
    expect(configuredHtml).toContain('Captured hydrogen');
    expect(configuredHtml).toContain('0.0004 mol/s');
    expect(separatorRemovedHtml).not.toContain(
      'aria-label="Membrane / separator:',
    );
    expect(separatorRemovedHtml).toContain('The separator layer is removed');
  });
});
