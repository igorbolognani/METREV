'use client';

import type { EvaluationResponse } from '@metrev/domain-contracts';
import * as React from 'react';
import { useMemo, useState, type KeyboardEvent } from 'react';

void React;

type Simulation = NonNullable<EvaluationResponse['simulation_enrichment']>;
type Mode = 'MFC' | 'MEC' | 'biosensor';
type Section = 'process' | 'losses' | 'biosensor' | 'limits';
type ComponentId =
  | 'influent'
  | 'anode'
  | 'separator'
  | 'cathode'
  | 'circuit'
  | 'gas'
  | 'sensor';

const componentCopy: Record<ComponentId, { title: string; detail: string }> = {
  influent: {
    title: 'Wastewater boundary',
    detail:
      'Influent COD, flow, temperature and pH are explicit boundary inputs. Other wastewater measurements stay recorded but are not automatically treated as solver states.',
  },
  anode: {
    title: 'Anode and electroactive biomass',
    detail:
      'The anode balance couples soluble COD uptake, biomass growth/decay/washout, proton balance and anodic Butler–Volmer charge transfer.',
  },
  separator: {
    title: 'Electrolyte and separator',
    detail:
      'The model converts electrolyte gap/conductivity, optional separator properties and contact resistance into one internal ohmic resistance.',
  },
  cathode: {
    title: 'Cathode boundary',
    detail:
      'MFC mode couples dissolved oxygen transfer and oxygen reduction. MEC mode uses the applied-voltage boundary and hydrogen-evolution Faradaic balance.',
  },
  circuit: {
    title: 'Electrical boundary',
    detail:
      'MFC current closes against an external load. MEC current closes against externally applied voltage; electrical input is not electricity generated.',
  },
  gas: {
    title: 'Hydrogen handling',
    detail:
      'MEC gross Faradaic H₂, captured H₂ and the configured difference remain separate. Crossover, dissolution, leakage and purification are not resolved.',
  },
  sensor: {
    title: 'Electrochemical biosensor',
    detail:
      'Standalone and integrated configurations use a supplied static amperometric calibration, analytical range, LOD/LOQ and explicit power budget.',
  },
};

const sectionLabels: Record<Section, string> = {
  process: 'Process and outputs',
  losses: 'Losses and balances',
  biosensor: 'Biosensor',
  limits: 'Model limits',
};

function getValue(simulation: Simulation, key: string) {
  return simulation.derived_observations.find((item) => item.key === key);
}

function formatValue(
  value: number | string | boolean | null | undefined,
  unit: string | null,
) {
  if (typeof value === 'number') {
    const formatted = new Intl.NumberFormat('en', {
      maximumSignificantDigits: 5,
    }).format(value);
    return unit ? `${formatted} ${unit}` : formatted;
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return 'Not supplied';
  return String(value);
}

function inferRunMode(simulation: Simulation): Mode {
  if (
    simulation.series.some(
      (series) => series.y_axis.key === 'hydrogen_gross_production_mol',
    )
  ) {
    return 'MEC';
  }
  if (simulation.series.some((series) => series.y_axis.key === 'current_a')) {
    return 'MFC';
  }
  return 'biosensor';
}

function metricsForSection(
  simulation: Simulation,
  mode: Mode,
  section: Section,
): Array<{ label: string; value: string; key: string }> {
  const metricKeys: Record<Section, string[]> = {
    process:
      mode === 'MFC'
        ? [
            'current_density_a_m2',
            'ph_anode_final',
            'cod_removal_pct',
            'effluent_cod_kg_m3',
            'gross_power_w',
            'net_power_w',
          ]
        : mode === 'MEC'
          ? [
              'current_density_a_m2',
              'ph_anode_final',
              'cod_removal_pct',
              'effluent_cod_kg_m3',
              'mec_cell_electrical_input_w',
              'hydrogen_gross_production_mol_s',
              'hydrogen_captured_production_mol_s',
              'hydrogen_uncaptured_production_mol_s',
            ]
          : ['biosensor_signal_current_a', 'biosensor_detection_status'],
    losses: [
      'anode_activation_overpotential_v',
      'cathode_activation_overpotential_v',
      'ohmic_voltage_drop_v',
      'activation_polarization_work_j',
      'ohmic_polarization_work_j',
      'supply_limitation_voltage_loss_v',
      'cod_mass_balance_residual_kg',
      'biomass_decay_loss_kg',
      'biomass_washout_loss_kg',
      mode === 'MFC'
        ? 'auxiliary_energy_demand_j'
        : 'mec_total_electrical_demand_energy_j',
      'biosensor_net_power_w',
    ],
    biosensor: [
      'biosensor_signal_current_a',
      'biosensor_detection_status',
      'biosensor_signal_to_noise_ratio',
      'biosensor_net_power_w',
    ],
    limits: [],
  };

  return metricKeys[section].flatMap((key) => {
    const output = getValue(simulation, key);
    if (!output) return [];
    return [
      {
        key,
        label: output.label,
        value: formatValue(output.value, output.unit),
      },
    ];
  });
}

function activateByKeyboard(
  event: KeyboardEvent<SVGGElement>,
  activate: () => void,
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate();
  }
}

export function SimulationSvgExplorer({
  simulation,
  presentation = 'modeled_run',
}: {
  simulation: Simulation;
  presentation?: 'modeled_run' | 'topology_preview';
}) {
  const actualMode = useMemo(() => inferRunMode(simulation), [simulation]);
  const [selectedMode, setSelectedMode] = useState<Mode>(
    presentation === 'topology_preview' ? 'MFC' : actualMode,
  );
  const [section, setSection] = useState<Section>('process');
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentId>('anode');
  const hasBiosensor = Boolean(
    getValue(simulation, 'biosensor_signal_current_a'),
  );
  const outputsMatchMode =
    presentation === 'modeled_run' && selectedMode === actualMode;
  const rows = outputsMatchMode
    ? metricsForSection(simulation, actualMode, section)
    : [];
  const selectedCopy = componentCopy[selectedComponent];
  const showingMec = selectedMode === 'MEC';
  const showingSensorOnly = selectedMode === 'biosensor';
  const currentSeries = simulation.series.find(
    (series) => series.y_axis.key === 'current_a',
  );
  const currentValue = currentSeries?.points.at(-1)?.y;
  const cellVoltage =
    simulation.series
      .find((series) => series.y_axis.key === 'cell_voltage_v')
      ?.points.at(-1)?.y ?? null;

  return (
    <section
      className="workspace-data-card simulation-svg-explorer"
      aria-labelledby="simulation-svg-title"
    >
      <header className="workspace-data-card__header simulation-svg-explorer__header">
        <div>
          <span className="badge subtle">
            {presentation === 'topology_preview'
              ? 'Interactive SVG · topology preview'
              : 'Interactive SVG · modeled outputs'}
          </span>
          <h3 id="simulation-svg-title">Cell and process explorer</h3>
          <p>
            Select a boundary or component in the diagram, then move through
            process, loss accounting, sensor outputs and model limits.
          </p>
        </div>
        <span className="simulation-svg-explorer__run-mode">
          {presentation === 'topology_preview' ? (
            <strong>No solver run attached</strong>
          ) : (
            <>
              This run:{' '}
              <strong>
                {actualMode === 'biosensor'
                  ? 'Standalone biosensor'
                  : actualMode}
              </strong>
            </>
          )}
        </span>
      </header>

      <div className="simulation-svg-explorer__controls">
        <div
          role="group"
          aria-label="Diagram mode"
          className="simulation-svg-explorer__button-group"
        >
          {(['MFC', 'MEC', 'biosensor'] as const).map((mode) => (
            <button
              aria-pressed={selectedMode === mode}
              className="simulation-svg-explorer__button"
              key={mode}
              onClick={() => setSelectedMode(mode)}
              type="button"
            >
              {mode === 'biosensor' ? 'Biosensor' : mode}
            </button>
          ))}
        </div>
        <nav
          aria-label="Simulation diagram sections"
          className="simulation-svg-explorer__button-group"
        >
          {(Object.keys(sectionLabels) as Section[]).map((item) => (
            <button
              aria-pressed={section === item}
              className="simulation-svg-explorer__button simulation-svg-explorer__button--section"
              key={item}
              onClick={() => setSection(item)}
              type="button"
            >
              {sectionLabels[item]}
            </button>
          ))}
        </nav>
      </div>

      <div className="simulation-svg-explorer__canvas-wrap">
        <svg
          aria-describedby="simulation-svg-description"
          aria-labelledby="simulation-svg-title simulation-svg-description"
          className="simulation-svg-explorer__canvas"
          role="group"
          viewBox="0 0 1240 650"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>
            Interactive MFC, MEC and electrochemical biosensor process diagram
          </title>
          <desc id="simulation-svg-description">
            A selectable reactor diagram links anode, separator, cathode,
            circuit, hydrogen handling and biosensor to modeled outputs and
            explicit model limits.
          </desc>
          <defs>
            <linearGradient id="metrev-anode-fluid" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#e3f5f2" />
              <stop offset="100%" stopColor="#c9e8e2" />
            </linearGradient>
            <linearGradient
              id="metrev-cathode-fluid"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#edf1ff" />
              <stop offset="100%" stopColor="#dce3fb" />
            </linearGradient>
            <marker
              id="metrev-arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="6"
              refY="4"
            >
              <path d="M0,0 L8,4 L0,8 z" fill="#516071" />
            </marker>
            <marker
              id="metrev-arrow-active"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="6"
              refY="4"
            >
              <path
                d="M0,0 L8,4 L0,8 z"
                fill={showingMec ? '#a64b6f' : '#13836e'}
              />
            </marker>
          </defs>
          <rect fill="#f5f7fa" height="650" rx="18" width="1240" />
          <text fill="#152235" fontSize="22" fontWeight="700" x="36" y="42">
            {showingSensorOnly
              ? 'Standalone electrochemical biosensor'
              : `${selectedMode} wastewater cell`}
          </text>
          <text fill="#596778" fontSize="13" x="36" y="67">
            {presentation === 'topology_preview'
              ? 'Interactive topology preview · no solver result or field measurement is attached'
              : outputsMatchMode
                ? `Current evaluation · ${simulation.model_version} · all displayed observations are modeled`
                : `Concept view only · this evaluation contains ${actualMode === 'biosensor' ? 'biosensor' : actualMode} outputs`}
          </text>

          {!showingSensorOnly ? (
            <>
              <text fill="#596778" fontSize="12" x="42" y="125">
                Wastewater feed
              </text>
              <path
                d="M40 165 H87"
                fill="none"
                markerEnd="url(#metrev-arrow)"
                stroke="#516071"
                strokeWidth="2"
              />

              <g
                aria-label="Anode component. Select for its modeled balances."
                className="simulation-svg-explorer__svg-button"
                onClick={() => setSelectedComponent('anode')}
                onKeyDown={(event) =>
                  activateByKeyboard(event, () => setSelectedComponent('anode'))
                }
                role="button"
                tabIndex={0}
              >
                <rect
                  fill="url(#metrev-anode-fluid)"
                  height="300"
                  rx="18"
                  stroke={selectedComponent === 'anode' ? '#13836e' : '#91aaa7'}
                  strokeWidth={selectedComponent === 'anode' ? 4 : 2}
                  width="235"
                  x="88"
                  y="145"
                />
                <text
                  fill="#173c37"
                  fontSize="17"
                  fontWeight="700"
                  textAnchor="middle"
                  x="205"
                  y="178"
                >
                  Anode chamber
                </text>
                <rect
                  fill="#344b59"
                  height="190"
                  rx="7"
                  width="24"
                  x="126"
                  y="205"
                />
                <path
                  d="M151 220 C168 205 177 235 193 218 C207 204 216 236 231 218 V374 H151 Z"
                  fill="#4b9a64"
                  opacity="0.9"
                />
                <text
                  fill="#21352e"
                  fontSize="12"
                  textAnchor="middle"
                  x="194"
                  y="402"
                >
                  electrode + attached biomass
                </text>
                <text
                  fill="#29433d"
                  fontSize="13"
                  textAnchor="middle"
                  x="205"
                  y="435"
                >
                  COD uptake · biomass · anode pH
                </text>
              </g>

              <g
                aria-label="Electrolyte and optional separator. Select for the modeled resistance."
                className="simulation-svg-explorer__svg-button"
                onClick={() => setSelectedComponent('separator')}
                onKeyDown={(event) =>
                  activateByKeyboard(event, () =>
                    setSelectedComponent('separator'),
                  )
                }
                role="button"
                tabIndex={0}
              >
                <rect
                  fill="#b6d9ef"
                  height="300"
                  rx="7"
                  stroke={
                    selectedComponent === 'separator' ? '#246b9d' : '#6b9dbc'
                  }
                  strokeWidth={selectedComponent === 'separator' ? 4 : 2}
                  width="24"
                  x="354"
                  y="145"
                />
                <text
                  fill="#285d7d"
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="middle"
                  transform="rotate(-90 366 300)"
                  x="366"
                  y="300"
                >
                  Electrolyte / separator
                </text>
              </g>

              <g
                aria-label="Cathode boundary. Select to inspect oxygen reduction or hydrogen evolution."
                className="simulation-svg-explorer__svg-button"
                onClick={() => setSelectedComponent('cathode')}
                onKeyDown={(event) =>
                  activateByKeyboard(event, () =>
                    setSelectedComponent('cathode'),
                  )
                }
                role="button"
                tabIndex={0}
              >
                <rect
                  fill="url(#metrev-cathode-fluid)"
                  height="300"
                  rx="18"
                  stroke={
                    selectedComponent === 'cathode' ? '#526bb5' : '#9ba7c8'
                  }
                  strokeWidth={selectedComponent === 'cathode' ? 4 : 2}
                  width="235"
                  x="390"
                  y="145"
                />
                <text
                  fill="#2c3c69"
                  fontSize="17"
                  fontWeight="700"
                  textAnchor="middle"
                  x="507"
                  y="178"
                >
                  Cathode chamber
                </text>
                <rect
                  fill="#667488"
                  height="190"
                  rx="7"
                  width="24"
                  x="558"
                  y="205"
                />
                <text
                  fill="#303d57"
                  fontSize="13"
                  textAnchor="middle"
                  x="507"
                  y="426"
                >
                  {showingMec
                    ? 'H₂ evolution boundary'
                    : 'oxygen-transfer boundary'}
                </text>
                <text
                  fill="#596778"
                  fontSize="11"
                  textAnchor="middle"
                  x="507"
                  y="449"
                >
                  {showingMec
                    ? 'gross and captured H₂ stay separate'
                    : 'oxygen transfer limits modeled current'}
                </text>
              </g>

              <g
                aria-label="External electrical circuit. Select for the MFC load or MEC voltage boundary."
                className="simulation-svg-explorer__svg-button"
                onClick={() => setSelectedComponent('circuit')}
                onKeyDown={(event) =>
                  activateByKeyboard(event, () =>
                    setSelectedComponent('circuit'),
                  )
                }
                role="button"
                tabIndex={0}
              >
                <path
                  d="M138 205 V105 H570 V205"
                  fill="none"
                  stroke={
                    selectedComponent === 'circuit' ? '#13836e' : '#667488'
                  }
                  strokeWidth="4"
                />
                {showingMec ? (
                  <>
                    <rect
                      fill="#a64b6f"
                      height="48"
                      rx="7"
                      width="102"
                      x="303"
                      y="82"
                    />
                    <text
                      fill="white"
                      fontSize="13"
                      fontWeight="700"
                      textAnchor="middle"
                      x="354"
                      y="111"
                    >
                      Applied voltage
                    </text>
                    <path
                      d="M145 104 H294 M415 104 H566"
                      fill="none"
                      markerEnd="url(#metrev-arrow-active)"
                      stroke="#a64b6f"
                      strokeDasharray="8 6"
                      strokeWidth="2"
                    />
                  </>
                ) : (
                  <>
                    <rect
                      fill="#e7bd59"
                      height="48"
                      rx="24"
                      stroke="#9f7b24"
                      strokeWidth="2"
                      width="90"
                      x="309"
                      y="82"
                    />
                    <text
                      fill="#3b331d"
                      fontSize="13"
                      fontWeight="700"
                      textAnchor="middle"
                      x="354"
                      y="111"
                    >
                      External load
                    </text>
                    <path
                      d="M145 104 H300 M408 104 H566"
                      fill="none"
                      markerEnd="url(#metrev-arrow-active)"
                      stroke="#13836e"
                      strokeDasharray="8 6"
                      strokeWidth="2"
                    />
                  </>
                )}
                <text
                  fill="#435162"
                  fontSize="11"
                  textAnchor="middle"
                  x="354"
                  y="67"
                >
                  {typeof currentValue === 'number'
                    ? `modeled current ${formatValue(currentValue, currentSeries?.y_axis.unit ?? 'A')}`
                    : 'electrical boundary'}
                </text>
                {cellVoltage !== null ? (
                  <text
                    fill="#435162"
                    fontSize="11"
                    textAnchor="middle"
                    x="354"
                    y="465"
                  >
                    modeled cell voltage {formatValue(cellVoltage, 'V')}
                  </text>
                ) : null}
              </g>

              {showingMec ? (
                <g
                  aria-label="Hydrogen product handling. Select for gross and captured output."
                  className="simulation-svg-explorer__svg-button"
                  onClick={() => setSelectedComponent('gas')}
                  onKeyDown={(event) =>
                    activateByKeyboard(event, () => setSelectedComponent('gas'))
                  }
                  role="button"
                  tabIndex={0}
                >
                  <path
                    d="M625 230 H676"
                    fill="none"
                    markerEnd="url(#metrev-arrow-active)"
                    stroke="#a64b6f"
                    strokeWidth="2"
                  />
                  <rect
                    fill="#fff5f7"
                    height="112"
                    rx="14"
                    stroke={selectedComponent === 'gas' ? '#a64b6f' : '#ca96a8'}
                    strokeWidth={selectedComponent === 'gas' ? 4 : 2}
                    width="78"
                    x="684"
                    y="190"
                  />
                  <text
                    fill="#7f3351"
                    fontSize="15"
                    fontWeight="700"
                    textAnchor="middle"
                    x="723"
                    y="225"
                  >
                    H₂
                  </text>
                  <text
                    fill="#7f3351"
                    fontSize="10"
                    textAnchor="middle"
                    x="723"
                    y="248"
                  >
                    gas handling
                  </text>
                  <text
                    fill="#7f3351"
                    fontSize="9"
                    textAnchor="middle"
                    x="723"
                    y="271"
                  >
                    gross ≠ captured
                  </text>
                </g>
              ) : (
                <>
                  <path
                    d="M580 230 H632"
                    fill="none"
                    markerEnd="url(#metrev-arrow)"
                    stroke="#6985bd"
                    strokeDasharray="5 5"
                    strokeWidth="2"
                  />
                  <text
                    fill="#50668d"
                    fontSize="10"
                    textAnchor="middle"
                    x="655"
                    y="215"
                  >
                    O₂ transfer
                  </text>
                </>
              )}
              <text fill="#46576a" fontSize="11" x="88" y="486">
                Influent COD and flow
              </text>
              <path
                d="M88 494 H270"
                fill="none"
                markerEnd="url(#metrev-arrow)"
                stroke="#516071"
                strokeWidth="2"
              />
              <text fill="#46576a" fontSize="11" x="390" y="486">
                Modeled effluent COD
              </text>
              <path
                d="M390 494 H570"
                fill="none"
                markerEnd="url(#metrev-arrow)"
                stroke="#516071"
                strokeWidth="2"
              />
            </>
          ) : (
            <g
              aria-label="Standalone biosensor. Select for calibration and detection outputs."
              className="simulation-svg-explorer__svg-button"
              onClick={() => setSelectedComponent('sensor')}
              onKeyDown={(event) =>
                activateByKeyboard(event, () => setSelectedComponent('sensor'))
              }
              role="button"
              tabIndex={0}
            >
              <rect
                fill="#edf8f4"
                height="220"
                rx="30"
                stroke={selectedComponent === 'sensor' ? '#13836e' : '#7eaaa0'}
                strokeWidth={selectedComponent === 'sensor' ? 4 : 2}
                width="390"
                x="180"
                y="205"
              />
              <rect
                fill="#3d5262"
                height="115"
                rx="10"
                width="40"
                x="235"
                y="258"
              />
              <rect
                fill="#628c79"
                height="115"
                rx="10"
                width="40"
                x="470"
                y="258"
              />
              <path
                d="M275 280 C325 235 380 330 430 280 C445 266 457 267 470 278"
                fill="none"
                stroke="#13836e"
                strokeWidth="5"
              />
              <text
                fill="#21483e"
                fontSize="18"
                fontWeight="700"
                textAnchor="middle"
                x="375"
                y="240"
              >
                Working / reference / counter electrodes
              </text>
              <text
                fill="#3e5e53"
                fontSize="13"
                textAnchor="middle"
                x="375"
                y="410"
              >
                Calibration + range + LOD/LOQ + energy budget
              </text>
            </g>
          )}

          {hasBiosensor && !showingSensorOnly ? (
            <g
              aria-label="Integrated biosensor. Select to inspect the sensor response and energy budget."
              className="simulation-svg-explorer__svg-button"
              onClick={() => setSelectedComponent('sensor')}
              onKeyDown={(event) =>
                activateByKeyboard(event, () => setSelectedComponent('sensor'))
              }
              role="button"
              tabIndex={0}
            >
              <path
                d="M205 445 V535 H628"
                fill="none"
                stroke={selectedComponent === 'sensor' ? '#8f5c19' : '#8c794f'}
                strokeDasharray="5 5"
                strokeWidth="2"
              />
              <rect
                fill="#fff8e8"
                height="63"
                rx="10"
                stroke={selectedComponent === 'sensor' ? '#8f5c19' : '#b9a36f'}
                strokeWidth={selectedComponent === 'sensor' ? 4 : 2}
                width="160"
                x="628"
                y="505"
              />
              <text
                fill="#69501d"
                fontSize="12"
                fontWeight="700"
                textAnchor="middle"
                x="708"
                y="530"
              >
                Integrated biosensor
              </text>
              <text
                fill="#69501d"
                fontSize="10"
                textAnchor="middle"
                x="708"
                y="549"
              >
                signal and load are separate
              </text>
            </g>
          ) : null}

          <line
            stroke="#d2d9e2"
            strokeWidth="2"
            x1="810"
            x2="810"
            y1="88"
            y2="610"
          />
          <rect
            fill="white"
            height="510"
            rx="16"
            stroke="#d8dee7"
            width="390"
            x="830"
            y="88"
          />
          <text fill="#152235" fontSize="16" fontWeight="700" x="855" y="121">
            {section === 'limits'
              ? 'What this run cannot claim'
              : selectedCopy.title}
          </text>
          <text fill="#586778" fontSize="11" x="855" y="145">
            {section === 'limits'
              ? 'Scientific boundary'
              : 'Select another SVG component to navigate'}
          </text>

          {section === 'limits' ? (
            <g fill="#354456" fontSize="12">
              <text x="855" y="190">
                • Lumped, isothermal and 0D reactor states
              </text>
              <text x="855" y="222">
                • Fixed-step RK4; no spatial gradients or CFD
              </text>
              <text x="855" y="254">
                • No independent parameter calibration
              </text>
              <text x="855" y="286">
                • No external validation implied by this run
              </text>
              <text x="855" y="318">
                • No propagated parameter uncertainty
              </text>
              <text x="855" y="350">
                • No membrane fouling or gas crossover model
              </text>
              <text x="855" y="382">
                • No matrix interference, drift or sensor noise
              </text>
              <text x="855" y="424" fontWeight="700">
                Any evaluation curves and values are modeled outputs.
              </text>
              <text x="855" y="456">
                A test of balance closure checks arithmetic only.
              </text>
              <text x="855" y="488">
                It does not establish predictive accuracy.
              </text>
            </g>
          ) : section === 'losses' ? (
            <g fill="#354456" fontSize="11">
              <text x="855" y="180" fontWeight="700">
                Modeled terms
              </text>
              <text x="855" y="202">
                Activation and ohmic polarization work
              </text>
              <text x="855" y="224">
                Biomass decay and washout terms
              </text>
              <text x="855" y="246">
                Auxiliary and biosensor power budgets
              </text>
              <text x="855" y="268">
                COD/biomass balance closure residuals
              </text>
              <text x="855" y="310" fontWeight="700">
                Not quantified as physical losses
              </text>
              <text x="855" y="332">
                • Gas crossover, dissolution and leakage
              </text>
              <text x="855" y="354">
                • Unmodeled side reactions and aging
              </text>
              <text x="855" y="376">
                • Fouling, drift and matrix interference
              </text>
              <text x="855" y="420">
                Electrical-equivalent work is not measured heat.
              </text>
              <text x="855" y="442">
                Boundary residual is not assigned to a cause.
              </text>
            </g>
          ) : (
            <>
              <text fill="#46576a" fontSize="11" x="855" y="174">
                {section === 'biosensor'
                  ? 'Static amperometric outputs and supplied calibration checks'
                  : selectedCopy.detail}
              </text>
              {section === 'biosensor' && !hasBiosensor ? (
                <text
                  fill="#8b3d41"
                  fontSize="12"
                  fontWeight="700"
                  x="855"
                  y="223"
                >
                  No complete biosensor result is attached to this evaluation.
                </text>
              ) : null}
              {outputsMatchMode ? (
                rows.slice(0, 9).map((row, index) => (
                  <g key={row.key}>
                    <line
                      stroke="#e7ebf0"
                      x1="855"
                      x2="1193"
                      y1={218 + index * 39}
                      y2={218 + index * 39}
                    />
                    <text
                      fill="#5b6877"
                      fontSize="10"
                      x="855"
                      y={237 + index * 39}
                    >
                      {row.label}
                    </text>
                    <text
                      fill="#14263b"
                      fontSize="12"
                      fontWeight="700"
                      x="855"
                      y={253 + index * 39}
                    >
                      {row.value}
                    </text>
                  </g>
                ))
              ) : (
                <g fill="#7a4c21" fontSize="12">
                  {presentation === 'topology_preview' ? (
                    <>
                      <text x="855" y="222">
                        This topology preview has no simulation payload.
                      </text>
                      <text x="855" y="246">
                        Run a complete case in METREV to view modeled outputs.
                      </text>
                    </>
                  ) : (
                    <>
                      <text x="855" y="222">
                        This view has no result payload for the selected mode.
                      </text>
                      <text x="855" y="246">
                        Switch back to{' '}
                        {actualMode === 'biosensor' ? 'Biosensor' : actualMode}
                      </text>
                      <text x="855" y="270">
                        to inspect values from this evaluation.
                      </text>
                    </>
                  )}
                </g>
              )}
            </>
          )}
          <text fill="#586778" fontSize="10" x="855" y="579">
            {presentation === 'topology_preview'
              ? 'Source: no simulation output is connected to this preview'
              : section === 'losses' && outputsMatchMode
                ? 'No claim that the unmodeled pathways are zero.'
                : `Source: ${simulation.provenance.provider} · ${simulation.provenance.source_version}`}
          </text>
          <text fill="#586778" fontSize="10" x="855" y="597">
            Modeled data are distinct from wastewater measurements and
            independent observations.
          </text>
        </svg>
      </div>

      <p className="simulation-svg-explorer__footnote">
        {presentation === 'topology_preview'
          ? 'This is a navigable process diagram only. It is not a simulation, an experimental result or a scientific validation.'
          : outputsMatchMode
            ? `Showing ${actualMode === 'biosensor' ? 'biosensor' : actualMode} data from this evaluation. ${section === 'losses' ? 'Residuals and electrical-equivalent work are model diagnostics, not measured loss mechanisms.' : ''}`
            : `The ${selectedMode} diagram is conceptual for this view; this evaluation has no ${selectedMode} result attached.`}
      </p>
    </section>
  );
}
