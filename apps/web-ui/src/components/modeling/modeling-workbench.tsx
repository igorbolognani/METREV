'use client';

import Link from 'next/link';
import * as React from 'react';
import { useMemo, useState } from 'react';

import {
  COMPONENT_MODEL_PARAMETER_GROUPS,
  MODEL_FIDELITY_PROFILES,
} from '@metrev/electrochem-models/model-fidelity-catalog';

import { PublicTopicNav } from '@/components/public-topic-nav';
import {
  StackAssemblySvg,
  type StackAssemblySelection,
} from '@/components/modeling/stack-assembly-svg';

void React;

const modelOptions = [
  { value: 'coupled-0d-dae-v1', label: '0D transient coupled reactor' },
  {
    value: 'biofilm-1d-direct-transfer-research-v1',
    label: '1D biofilm and electron transfer',
  },
  {
    value: 'biofilm-2d-electrode-research-v1',
    label: '2D electrode and biofilm',
  },
  { value: 'cell-3d-multiphysics-research-v1', label: '3D cell multiphysics' },
  {
    value: 'stack-network-macro-research-v1',
    label: 'Cell network and stack manifolds',
  },
  {
    value: 'porous-electrode-micro-3d-research-v1',
    label: '3D porous electrode, micro scale',
  },
  {
    value: 'electrode-interface-nano-research-v1',
    label: 'Nano-informed electrode interface',
  },
];

const defaultSelection: StackAssemblySelection = {
  system: 'unspecified',
  modelFidelityId: '',
  architecture: '',
  anodeMaterial: '',
  anodeTreatment: '',
  biofilmSupport: '',
  biofilmMaturity: '',
  biofilmInoculum: '',
  biofilmStartup: '',
  cathodeReaction: '',
  cathodeCatalyst: '',
  cathodeGasHandling: '',
  membranePresence: 'unknown',
  separatorType: '',
  currentCollection: '',
  sealing: '',
  flowControl: '',
  gasHandling: '',
  sensorLogging: '',
  waterQualityCoverage: '',
  biosensorPresent: false,
  biosensorWorkingElectrode: '',
  biosensorReferenceElectrode: '',
  biosensorCounterElectrode: '',
  biosensorRecognitionElement: '',
  biosensorTransduction: '',
  componentModelParameters: {},
};

const optionSets = {
  system: [
    ['', 'Select a system'],
    ['MFC', 'Microbial fuel cell (MFC)'],
    ['MEC', 'Microbial electrolysis cell (MEC)'],
    ['biosensor', 'Electrochemical biosensor'],
  ],
  architecture: [
    ['', 'Not specified'],
    ['single-chamber', 'Single chamber'],
    ['dual-chamber', 'Dual chamber'],
    ['flow-through', 'Flow through'],
    ['upflow', 'Upflow'],
    ['stacked-cell', 'Multi-cell assembly'],
  ],
  anodeMaterial: [
    ['', 'Not specified'],
    ['carbon felt', 'Carbon felt'],
    ['carbon cloth', 'Carbon cloth'],
    ['graphite brush', 'Graphite brush'],
    ['graphite plate', 'Graphite plate'],
    ['carbon paper', 'Carbon paper'],
  ],
  cathodeCatalyst: [
    ['', 'Not specified'],
    ['platinum', 'Platinum based'],
    ['activated carbon', 'Activated carbon'],
    ['manganese oxide', 'Manganese oxide'],
    ['iron nitrogen carbon', 'Fe–N–C'],
    ['no catalyst stated', 'No catalyst stated'],
  ],
  separatorType: [
    ['', 'Not specified'],
    ['cation exchange membrane', 'Cation exchange membrane'],
    ['anion exchange membrane', 'Anion exchange membrane'],
    ['proton exchange membrane', 'Proton exchange membrane'],
    ['porous separator', 'Porous separator'],
    ['membrane-free', 'Membrane free'],
  ],
} as const;

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="modeling-workbench__field">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || 'unspecified'} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ModelingWorkbench() {
  const [selection, setSelection] =
    useState<StackAssemblySelection>(defaultSelection);
  const [modelFidelityId, setModelFidelityId] = useState('');
  const [separatorType, setSeparatorType] = useState('');
  const [membranePresence, setMembranePresence] =
    useState<StackAssemblySelection['membranePresence']>('unknown');
  const profile = MODEL_FIDELITY_PROFILES.find(
    (candidate) => candidate.id === modelFidelityId,
  );
  const assembly = useMemo(
    () => ({
      ...selection,
      modelFidelityId,
      separatorType,
      membranePresence,
    }),
    [selection, modelFidelityId, separatorType, membranePresence],
  );

  const update = <K extends keyof StackAssemblySelection>(
    key: K,
    value: StackAssemblySelection[K],
  ) => setSelection((current) => ({ ...current, [key]: value }));

  return (
    <main
      className="landing-main modeling-workbench"
      data-testid="modeling-workbench"
    >
      <PublicTopicNav />
      <header className="modeling-workbench__hero">
        <p className="modeling-workbench__eyebrow">
          METREV · model register and assembly
        </p>
        <h1>Model the configured system at its declared scale.</h1>
        <p>
          Select a system and stack components to assemble a navigable
          schematic. Then inspect which physical model is executable, what a
          higher fidelity would require, and which properties need traceable
          values and units.
        </p>
        <div className="modeling-workbench__hero-meta">
          <span>One component-linked SVG</span>
          <span>Macro · micro · nano properties</span>
          <span>0D runnable boundary stated</span>
        </div>
      </header>

      <section
        className="modeling-workbench__section"
        aria-labelledby="assembly-title"
      >
        <div className="modeling-workbench__section-heading">
          <div>
            <p className="modeling-workbench__eyebrow">01 · Configure</p>
            <h2 id="assembly-title">Assemble the cell as you specify it</h2>
            <p>
              These selectors change the conceptual view only. They do not
              supply kinetic constants, operating conditions, or model defaults.
              The signed-in case workflow records the complete configuration and
              source-backed numerical parameters.
            </p>
          </div>
          <Link className="modeling-workbench__primary-link" href="/cases/new">
            Configure a case
          </Link>
        </div>

        <div className="modeling-workbench__assembly-layout">
          <div className="modeling-workbench__controls">
            <SelectField
              label="Technology"
              onChange={(value) => {
                const system = (value ||
                  'unspecified') as StackAssemblySelection['system'];
                setSelection((current) => ({
                  ...current,
                  system,
                  biosensorPresent: system === 'biosensor',
                }));
              }}
              options={optionSets.system}
              value={selection.system === 'unspecified' ? '' : selection.system}
            />
            <SelectField
              label="Cell / reactor architecture"
              onChange={(value) => update('architecture', value)}
              options={optionSets.architecture}
              value={selection.architecture}
            />
            <SelectField
              label="Anode material"
              onChange={(value) => update('anodeMaterial', value)}
              options={optionSets.anodeMaterial}
              value={selection.anodeMaterial}
            />
            <SelectField
              label="Cathode catalyst family"
              onChange={(value) => update('cathodeCatalyst', value)}
              options={optionSets.cathodeCatalyst}
              value={selection.cathodeCatalyst}
            />
            <SelectField
              label="Membrane / separator"
              onChange={(value) => {
                setSeparatorType(value);
                setMembranePresence(
                  value === 'membrane-free'
                    ? 'absent'
                    : value
                      ? 'present'
                      : 'unknown',
                );
              }}
              options={optionSets.separatorType}
              value={separatorType}
            />
            <SelectField
              label="Model fidelity requested"
              onChange={setModelFidelityId}
              options={[
                ['', 'Select model fidelity'],
                ...modelOptions.map(
                  ({ value, label }) => [value, label] as const,
                ),
              ]}
              value={modelFidelityId}
            />
            {profile ? (
              <div
                className="modeling-workbench__profile-summary"
                data-testid="selected-model-profile"
              >
                <span
                  className={
                    profile.status === 'executable'
                      ? 'is-runnable'
                      : 'is-research'
                  }
                >
                  {profile.status === 'executable'
                    ? 'Executable in METREV'
                    : 'Research profile · not executable'}
                </span>
                <strong>{profile.title}</strong>
                <p>
                  {profile.spatialDimension}D spatial ·{' '}
                  {profile.temporal ? 'transient' : 'steady'} ·{' '}
                  {profile.scales.join(' / ')} scale
                </p>
                <p>{profile.boundaryNote}</p>
                <p>{profile.limitation}</p>
                <div className="modeling-workbench__doi-list">
                  {profile.referenceDois.map((doi) => (
                    <a
                      href={`https://doi.org/${doi}`}
                      key={doi}
                      rel="noreferrer"
                      target="_blank"
                    >
                      DOI {doi} ↗
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <StackAssemblySvg selection={assembly} />
        </div>
      </section>

      <section
        className="modeling-workbench__section"
        aria-labelledby="fidelity-title"
      >
        <div className="modeling-workbench__section-heading">
          <div>
            <p className="modeling-workbench__eyebrow">02 · Fidelity</p>
            <h2 id="fidelity-title">
              Spatial dimension and physical scale are different axes
            </h2>
            <p>
              A 1D profile can resolve biofilm depth, a 2D profile can resolve
              an electrode cross-section, and a 3D profile can resolve reactor
              geometry. Macro, micro, and nano describe the feature or domain
              being represented; they do not imply a particular spatial
              dimension or predictive accuracy.
            </p>
          </div>
        </div>
        <div className="modeling-workbench__fidelity-grid">
          {MODEL_FIDELITY_PROFILES.map((candidate) => (
            <article
              className="modeling-workbench__fidelity-card"
              key={candidate.id}
            >
              <header>
                <span>
                  {candidate.spatialDimension}D · {candidate.scales.join(' / ')}
                </span>
                <span
                  className={
                    candidate.status === 'executable'
                      ? 'is-runnable'
                      : 'is-research'
                  }
                >
                  {candidate.status === 'executable'
                    ? 'Runnable'
                    : 'Not executable'}
                </span>
              </header>
              <h3>{candidate.title}</h3>
              <code>{candidate.id}</code>
              <p>{candidate.boundaryNote}</p>
              <details>
                <summary>Required inputs and model phenomena</summary>
                <div className="modeling-workbench__details-content">
                  <strong>Phenomena represented</strong>
                  <ul>
                    {candidate.phenomena.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <strong>Source-backed component properties</strong>
                  {candidate.requiredComponentParameters.length ? (
                    <ul>
                      {candidate.requiredComponentParameters.map((item) => (
                        <li key={item}>
                          <code>{item}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      No scale-resolved component properties are required by
                      this lumped profile.
                    </p>
                  )}
                  <strong>Spatial and experimental prerequisites</strong>
                  <ul>
                    {candidate.requiredSpatialInputs.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p>{candidate.limitation}</p>
                  <div className="modeling-workbench__doi-list">
                    {candidate.referenceDois.map((doi) => (
                      <a
                        href={`https://doi.org/${doi}`}
                        key={doi}
                        rel="noreferrer"
                        target="_blank"
                      >
                        DOI {doi} ↗
                      </a>
                    ))}
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section
        className="modeling-workbench__section"
        aria-labelledby="parameters-title"
      >
        <div className="modeling-workbench__section-heading">
          <div>
            <p className="modeling-workbench__eyebrow">
              03 · Component registry
            </p>
            <h2 id="parameters-title">
              Parameters attach to the part and to a source
            </h2>
            <p>
              Each numeric entry is recorded with a unit, source kind, and
              source reference; uncertainty is optional but must carry a
              matching unit. A literature value is not automatically
              transferable to a different material batch, wastewater, or
              operating regime. Entries in this register document requirements:
              only fields explicitly consumed by the executable 0D equations
              affect current results.
            </p>
          </div>
        </div>
        <div className="modeling-workbench__parameter-groups">
          {COMPONENT_MODEL_PARAMETER_GROUPS.map((group) => (
            <details
              className="modeling-workbench__parameter-group"
              key={group.id}
            >
              <summary>
                <span>{group.title}</span>
                <code>{group.id}</code>
                <span>{group.parameters.length} properties</span>
              </summary>
              <div className="modeling-workbench__table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Unit</th>
                      <th>Scale</th>
                      <th>Spatial / physical role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.parameters.map((parameter) => (
                      <tr key={parameter.id}>
                        <th scope="row">
                          <code>{parameter.id}</code>
                        </th>
                        <td>{parameter.unit}</td>
                        <td>{parameter.scales.join(' · ')}</td>
                        <td>{parameter.spatialRole}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section
        className="modeling-workbench__section modeling-workbench__boundary"
        aria-labelledby="boundary-title"
      >
        <p className="modeling-workbench__eyebrow">
          04 · Current runtime boundary
        </p>
        <h2 id="boundary-title">
          A rigorous register cannot stand in for a validated solver
        </h2>
        <p>
          The executable model is a transient, isothermal, well-mixed 0D MFC/MEC
          model. It accounts for COD and electroactive biomass inventories,
          compartment pH, electrode kinetics and lumped ohmic losses, MFC
          oxygen-transfer limitation, and MEC electrical input with gross,
          captured, and uncaptured hydrogen kept separate. It does not calculate
          spatial concentration or potential fields, resolved biofilm profiles,
          pore-scale flow, a cell-to-cell stack network, heat transfer, gas
          crossover, or nanoscale surface chemistry.
        </p>
        <p>
          Selecting a research profile records the intended equations,
          properties, geometry, boundary conditions, and validation obligations.
          METREV blocks execution for that profile and returns the missing
          prerequisites; it never substitutes the 0D result. A spatial solver
          should become executable only after numerical verification,
          mesh/refinement checks where relevant, and condition-matched
          independent data.
        </p>
        <div className="modeling-workbench__boundary-links">
          <Link href="/learn/stack#model-configurations">
            Read the stack theory and literature register
          </Link>
          <Link href="/cases/new">Open the case configurator</Link>
        </div>
      </section>
    </main>
  );
}
