import Link from 'next/link';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';

void React;

function loginHref(callbackPath: string) {
  return `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
}

const technologyPrimer = [
  {
    title: 'MFC',
    subtitle: 'Microbial fuel cells',
    detail:
      'Electroactive biofilms convert organic matter into electrical current while treating wastewater or sidestreams.',
  },
  {
    title: 'MEC',
    subtitle: 'Microbial electrolysis cells',
    detail:
      'A small applied voltage can steer microbial electrochemical reactions toward hydrogen, methane, or product recovery.',
  },
  {
    title: 'MET',
    subtitle: 'Microbial electrochemical technologies',
    detail:
      'The broader family includes recovery, remediation, sensing, and biofilm-driven electrochemical process control.',
  },
  {
    title: 'Monitoring',
    subtitle: 'Electroactive signals',
    detail:
      'Voltage, current, COD, conductivity, pH, temperature, flow, and sensor data help explain where a system is drifting.',
  },
];

const stackBlocks = [
  'Reactor',
  'Anode',
  'Biofilm',
  'Cathode',
  'Membrane',
  'Balance of plant',
  'Sensors',
];

const variableGroups = [
  {
    label: 'Materials',
    values: ['carbon felt', 'graphite', 'stainless steel', 'catalyst'],
  },
  {
    label: 'Geometry',
    values: ['surface area', 'spacing', 'volume', 'separator path'],
  },
  {
    label: 'Operation',
    values: ['pH', 'temperature', 'conductivity', 'current density'],
  },
  {
    label: 'Feed',
    values: ['COD', 'substrate', 'flow', 'HRT'],
  },
];

const comparisonRows = [
  {
    name: 'Conventional treatment',
    recovery: 28,
    maturity: 92,
    insight: 'Mature baseline, usually lower direct resource recovery.',
  },
  {
    name: 'Anaerobic digestion',
    recovery: 64,
    maturity: 82,
    insight: 'Strong biogas route, sensitive to feed and scale economics.',
  },
  {
    name: 'MFC / MEC / MET',
    recovery: 78,
    maturity: 46,
    insight:
      'High upside for recovery and sensing, but stack choices and scale-up remain hard.',
  },
];

const impactItems = [
  {
    ods: 'ODS 6',
    title: 'Clean water and sanitation',
    detail:
      'Better treatment visibility can help wastewater teams reduce uncontrolled operating risk.',
  },
  {
    ods: 'ODS 7',
    title: 'Affordable and clean energy',
    detail:
      'Energy recovery is possible in selected stacks, but METREV keeps performance claims evidence-scoped.',
  },
  {
    ods: 'ODS 9',
    title: 'Industry and innovation',
    detail:
      'Structured stack comparison helps teams move from scattered papers to testable engineering decisions.',
  },
  {
    ods: 'ODS 12/13',
    title: 'Circularity and climate',
    detail:
      'Nutrient recovery, lower waste, and avoided emissions depend on case-specific validation.',
  },
];

const jtbdItems = [
  'Diagnose which part of the stack is limiting the result.',
  'Compare materials, architecture, and operating envelopes against treated evidence.',
  'Separate measured inputs, defaults, missing data, and uncertainty.',
  'Generate a report-ready recommendation with traceable rationale.',
  'Find the next measurements that would reduce decision risk.',
];

const flowSteps = [
  'Configure stack',
  'Compare treated data',
  'Inspect outputs',
  'Review recommendations',
  'Generate report',
  'Ask this report',
];

function ComparisonVisual() {
  return (
    <div
      aria-label="Conservative comparison between treatment routes"
      className="landing-comparison-chart"
    >
      {comparisonRows.map((row) => (
        <article className="landing-comparison-row" key={row.name}>
          <div>
            <h3>{row.name}</h3>
            <p>{row.insight}</p>
          </div>
          <div className="landing-comparison-bars">
            <span>Recovery potential</span>
            <div className="landing-bar" data-label={`${row.recovery}%`}>
              <i style={{ width: `${row.recovery}%` }} />
            </div>
            <span>Commercial maturity</span>
            <div className="landing-bar landing-bar--maturity">
              <i style={{ width: `${row.maturity}%` }} />
            </div>
          </div>
        </article>
      ))}
      <p className="landing-chart-note">
        Visual is qualitative and directional. Real feasibility depends on
        stack configuration, wastewater chemistry, operating envelope, and
        validated site data.
      </p>
    </div>
  );
}

function StackMap() {
  return (
    <div aria-label="Bioelectrochemical system stack map" className="landing-stack-map">
      {stackBlocks.map((block, index) => (
        <div className="landing-stack-node" key={block}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{block}</strong>
        </div>
      ))}
    </div>
  );
}

function VariablesMap() {
  return (
    <div className="landing-variable-map">
      {variableGroups.map((group) => (
        <article className="landing-variable-group" key={group.label}>
          <h3>{group.label}</h3>
          <div>
            {group.values.map((value) => (
              <span key={value}>{value}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function PublicLandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__content">
          <Badge variant="info">METREV</Badge>
          <p className="landing-kicker">Bioelectrochemical decision support</p>
          <h1>
            Engineer better bioelectrochemical systems from evidence, not
            guesswork.
          </h1>
          <p className="landing-lead">
            METREV helps teams connect wastewater, resource recovery, materials,
            stack design, operating data, and literature-backed reasoning into a
            clearer path from configuration to report.
          </p>
          <div className="landing-actions">
            <Link className="button" href="/login">
              Start evaluation
            </Link>
            <Link className="button secondary" href="#metrev-flow">
              See the flow
            </Link>
          </div>
        </div>

        <aside className="landing-hero__panel">
          <span className="landing-panel__eyebrow">Scientific instrument</span>
          <h2>Configure, compare, explain, report.</h2>
          <div className="landing-mini-flow">
            {flowSteps.slice(0, 5).map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
          <div className="landing-panel__footer">
            <span>Client path after login</span>
            <strong>Dashboard, Configure Stack, Evaluations, Reports</strong>
          </div>
        </aside>
      </section>

      <nav aria-label="Landing sections" className="landing-section-nav">
        <a href="#problem">Problem</a>
        <a href="#technology">Technology</a>
        <a href="#stack">Stack</a>
        <a href="#comparison">Comparison</a>
        <a href="#impact">ODS</a>
        <a href="#metrev-flow">METREV</a>
      </nav>

      <section className="landing-section" id="problem">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Why this matters</Badge>
            <h2>
              Wastewater can carry energy, nutrients, signals, and risk in the
              same stream.
            </h2>
            <p>
              Bioelectrochemical systems promise cleaner treatment, energy
              recovery, monitoring, and circular resource use. The hard part is
              choosing the right stack under real constraints: materials,
              biology, conductivity, pH, temperature, flow, fouling, scale, and
              cost.
            </p>
          </div>
        </div>
        <div className="landing-card-grid landing-card-grid--three">
          <article className="landing-card">
            <h3>Scattered knowledge</h3>
            <p>
              Useful results are spread across papers, pilots, supplier
              documents, operating notes, and local measurements.
            </p>
          </article>
          <article className="landing-card">
            <h3>Stack interactions</h3>
            <p>
              Electrode material, separator choice, reactor geometry, biology,
              and flow can shift performance together.
            </p>
          </article>
          <article className="landing-card">
            <h3>Scale-up uncertainty</h3>
            <p>
              A strong lab result is not automatically a good deployment. METREV
              keeps assumptions and missing measurements visible.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-section" id="technology">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Technology primer</Badge>
            <h2>Microbes, electrodes, water chemistry, and control.</h2>
            <p>
              METREV starts from the science layer and translates it into a
              structured engineering evaluation without pretending every output
              is already a high-fidelity simulation.
            </p>
          </div>
        </div>
        <div className="landing-card-grid landing-card-grid--four">
          {technologyPrimer.map((item) => (
            <article className="landing-card" key={item.title}>
              <span className="landing-card__token">{item.title}</span>
              <h3>{item.subtitle}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="stack">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">System stack map</Badge>
            <h2>Every recommendation starts with the configured stack.</h2>
            <p>
              The workspace is built around the parts an engineer actually has
              to control: reactor architecture, anode, cathode, separator,
              balance of plant, biology, sensors, and operating envelope.
            </p>
          </div>
        </div>
        <StackMap />
        <VariablesMap />
      </section>

      <section className="landing-section" id="comparison">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Conservative comparison</Badge>
            <h2>Different treatment routes solve different jobs.</h2>
            <p>
              METREV does not promise that MFC, MEC, or MET routes always win.
              It helps identify when the stack, evidence, and measurements make
              a better path plausible.
            </p>
          </div>
        </div>
        <ComparisonVisual />
      </section>

      <section className="landing-section" id="impact">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Impact and ODS</Badge>
            <h2>Cleaner water, cleaner energy, and circular industry need better
              decisions.</h2>
            <p>
              The social value comes from reducing uncertainty before teams
              spend time and capital on the wrong stack, material, supplier, or
              operating strategy.
            </p>
          </div>
        </div>
        <div className="landing-card-grid landing-card-grid--four">
          {impactItems.map((item) => (
            <article className="landing-card landing-card--accent" key={item.ods}>
              <span className="landing-card__token">{item.ods}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="metrev-flow">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Jobs to be done</Badge>
            <h2>From stack description to report-ready recommendation.</h2>
            <p>
              METREV is designed for engineers who know their system but need a
              clearer comparison against treated evidence, defaults, uncertainty,
              and possible improvement paths.
            </p>
          </div>
        </div>
        <div className="landing-scope-grid">
          <article className="landing-card landing-card--accent">
            <h3>What the product helps answer</h3>
            <ul className="landing-bullet-list">
              {jtbdItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="landing-card">
            <h3>METREV flow preview</h3>
            <div className="landing-step-grid landing-step-grid--compact">
              {flowSteps.map((step) => (
                <span className="landing-step-pill" key={step}>
                  {step}
                </span>
              ))}
            </div>
            <p>
              Evidence review, research tables, ingestion, and raw audit tools
              remain available for internal/advanced users, but they do not
              block the client workflow.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <Badge variant="info">Access</Badge>
          <h2>Open METREV and start from the stack.</h2>
          <p>
            Sign in to configure a system, run a deterministic evaluation,
            inspect recommendations, generate a report, and ask grounded
            questions about that report.
          </p>
        </div>
        <div className="landing-actions">
          <Link className="button" href="/login">
            Login
          </Link>
          <Link className="button secondary" href={loginHref('/dashboard')}>
            Go to dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
