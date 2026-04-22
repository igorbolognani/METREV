import Link from 'next/link';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';

void React;

type LandingCard = {
  detail: string;
  href?: string;
  label?: string;
  path?: string;
  title: string;
};

function loginHref(callbackPath: string) {
  return `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
}

const proofPoints = [
  {
    label: 'Deterministic core',
    value:
      'Normalization, rules, scoring, and audit stay explicit before any narrative output.',
  },
  {
    label: 'Local-first workspace',
    value:
      'Dashboard, input deck, evidence review, comparison, and report remain available without a cloud-only workflow.',
  },
  {
    label: 'Traceable outputs',
    value:
      'Defaults, missing data, evidence posture, confidence, and runtime versions remain visible in every evaluation surface.',
  },
];

const productCards = [
  {
    title: 'What METREV is',
    detail:
      'An auditable decision-support workspace for evaluating bioelectrochemical technology configurations, cases, and evidence-backed improvement paths.',
  },
  {
    title: 'What METREV optimizes for',
    detail:
      'Analyst clarity: deterministic evaluation first, explicit uncertainty second, and exports plus provenance available whenever a recommendation is reviewed.',
  },
  {
    title: 'What the landing should not imply',
    detail:
      'METREV is not presented as a generic chat-first copilot, a full multiphysics simulator, or a bundle of standalone modules that do not exist yet.',
  },
];

const roleCards = [
  {
    title: 'Analysts',
    detail:
      'Run new evaluations, compare saved runs, inspect audit layers, and export structured results for review or delivery.',
  },
  {
    title: 'Engineering reviewers',
    detail:
      'Check defaults, missing data, evidence posture, rule-backed outputs, and whether uncertainty has been framed honestly.',
  },
  {
    title: 'Evidence curators',
    detail:
      'Review imported records before they can influence intake, while keeping accepted, pending, and rejected states visible.',
  },
];

const includedCards = [
  {
    title: 'Included now',
    detail:
      'Dedicated workspace routes for dashboard, input deck, evidence review, evaluation results, comparison, printable report, and case history.',
  },
  {
    title: 'Included now',
    detail:
      'Explicit defaults, missing data, evidence posture, confidence framing, JSON export, CSV export, and print-friendly reporting.',
  },
  {
    title: 'Included now',
    detail:
      'Backend-owned workspace payloads so the UI does not invent posture, readiness, or uncertainty on its own.',
  },
];

const excludedCards = [
  {
    title: 'Not presented as live product scope',
    detail:
      'A standalone alerts center, a standalone TEA scenario library route, or a public literature explorer independent from the evidence review workflow.',
  },
  {
    title: 'Not presented as live product scope',
    detail:
      'A generic AI front door that bypasses normalization, validation, rules, scoring, audit, and contract-backed output structure.',
  },
  {
    title: 'Not presented as live product scope',
    detail:
      'A full multiphysics simulation environment. Current modeling remains deterministic enrichment inside an auditable decision flow.',
  },
];

const workflowSteps = [
  {
    title: '1. Review evidence',
    detail:
      'Imported external records are screened in the evidence review queue before they can enter the analyst workflow.',
  },
  {
    title: '2. Draft input',
    detail:
      'The input deck captures the case, operating context, stack blocks, and optional evidence attachments for deterministic evaluation.',
  },
  {
    title: '3. Run staged submission',
    detail:
      'Submission stays synchronous but shows visible stages while the workspace is prepared.',
  },
  {
    title: '4. Inspect the result workspace',
    detail:
      'Overview, recommendations, modeling, roadmap and suppliers, plus audit remain separated into readable decision layers.',
  },
  {
    title: '5. Compare and reopen',
    detail:
      'Saved runs can be reopened, compared against a baseline, and traced back through case history without losing context.',
  },
  {
    title: '6. Export and deliver',
    detail:
      'JSON, CSV, and print-friendly report surfaces remain native product capabilities rather than manual workarounds.',
  },
];

const routeCards: LandingCard[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    href: loginHref('/dashboard'),
    label: 'Open dashboard after sign in',
    detail:
      'Operational entry surface for saved runs, evidence backlog, quick actions, and current workspace health.',
  },
  {
    title: 'Input Deck',
    path: '/cases/new',
    href: loginHref('/cases/new'),
    label: 'Draft a new evaluation',
    detail:
      'Step-based intake for case context, technology stack, evidence attachments, and assumptions before evaluation.',
  },
  {
    title: 'All Evaluations',
    path: '/evaluations',
    href: loginHref('/evaluations'),
    label: 'Browse saved evaluations',
    detail:
      'Searchable and sortable registry of persisted evaluations connected to case history and downstream review flows.',
  },
  {
    title: 'Evidence Review',
    path: '/evidence/review',
    href: loginHref('/evidence/review'),
    label: 'Review imported evidence',
    detail:
      'Queue, spotlight, filters, and bulk review actions for imported records before deterministic intake.',
  },
  {
    title: 'Evaluation Workspace',
    path: '/evaluations/[id]',
    detail:
      'Decision-first result surface with attention items, hero cards, exports, and layered tabs.',
  },
  {
    title: 'Compare, Report, and Case History',
    path: '/evaluations/[id]/compare/[baselineId] / /evaluations/[id]/report / /cases/[caseId]/history',
    detail:
      'Dedicated follow-through pages for baseline deltas, printable output, and multi-run chronology.',
  },
];

const tabCards = [
  {
    title: 'Overview',
    detail:
      'Top-fold decision posture, attention items, and workspace summary without mixing everything into one page.',
  },
  {
    title: 'Recommendations',
    detail:
      'Prioritized improvement options presented as structured product output instead of freeform narrative only.',
  },
  {
    title: 'Modeling',
    detail:
      'Deterministic simulation-enrichment outputs, series, and model status when an artifact exists.',
  },
  {
    title: 'Roadmap & Suppliers',
    detail:
      'Roadmap phases, supplier shortlist visibility, and gaps that still need reviewer attention.',
  },
  {
    title: 'Audit',
    detail:
      'Defaults, missing data, assumptions, evidence traceability, and runtime version context for each evaluation.',
  },
];

const auditCards = [
  {
    title: 'Defaults and missing data stay visible',
    detail:
      'The workspace exposes what was assumed, what was absent, and what still constrains confidence.',
  },
  {
    title: 'Evidence posture stays explicit',
    detail:
      'Accepted, pending, and rejected evidence states remain distinct, and only accepted evidence can enter intake.',
  },
  {
    title: 'Exports stay tied to the same decision output',
    detail:
      'JSON, CSV, and report views all originate from the same evaluation package instead of separate manual summaries.',
  },
];

export function PublicLandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__content">
          <Badge variant="info">Public landing</Badge>
          <p className="landing-kicker">METREV decision workspace</p>
          <h1>Auditable decision-support for bioelectrochemical evaluation.</h1>
          <p className="landing-lead">
            METREV turns evidence review, deterministic evaluation, comparison,
            reporting, and audit traceability into one structured analyst
            workspace instead of a generic chat-first product surface.
          </p>
          <div className="landing-actions">
            <Link className="button" href="/login">
              Sign in to METREV
            </Link>
            <Link className="button secondary" href="#workflow">
              View the workflow
            </Link>
          </div>
          <div className="landing-proof-grid">
            {proofPoints.map((item) => (
              <article className="landing-proof-card" key={item.label}>
                <span>{item.label}</span>
                <p>{item.value}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="landing-hero__panel">
          <span className="landing-panel__eyebrow">Current workspace map</span>
          <h2>What happens after sign in</h2>
          <ul className="landing-bullet-list">
            <li>Enter the dashboard workspace at /dashboard.</li>
            <li>Draft a new case through the Input Deck.</li>
            <li>Open saved evaluations, compare runs, and export reports.</li>
            <li>
              Keep evidence review and audit traceability inside the same
              product system.
            </li>
          </ul>
          <div className="landing-panel__footer">
            <span>Live authenticated destinations</span>
            <strong>
              Dashboard, Input Deck, Evidence Review, All Evaluations
            </strong>
          </div>
        </aside>
      </section>

      <nav aria-label="Landing sections" className="landing-section-nav">
        <a href="#product">Product</a>
        <a href="#roles">Users</a>
        <a href="#workflow">Workflow</a>
        <a href="#routes">Pages</a>
        <a href="#tabs">Tabs</a>
        <a href="#audit">Audit</a>
      </nav>

      <section className="landing-section" id="product">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Product scope</Badge>
            <h2>Explain the real product, not the prototype fiction.</h2>
            <p>
              The public homepage should be visually strong, but every claim has
              to match the current METREV runtime, route structure, and
              audit-first product posture.
            </p>
          </div>
        </div>
        <div className="landing-card-grid landing-card-grid--three">
          {productCards.map((card) => (
            <article className="landing-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>

        <div className="landing-scope-grid">
          <div className="landing-scope-column">
            <h3>Included now</h3>
            <div className="landing-card-grid">
              {includedCards.map((card) => (
                <article
                  className="landing-card landing-card--accent"
                  key={card.detail}
                >
                  <h4>{card.title}</h4>
                  <p>{card.detail}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="landing-scope-column">
            <h3>Not presented as live product scope</h3>
            <div className="landing-card-grid">
              {excludedCards.map((card) => (
                <article
                  className="landing-card landing-card--warning"
                  key={card.detail}
                >
                  <h4>{card.title}</h4>
                  <p>{card.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="roles">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Primary users</Badge>
            <h2>
              Built for analysts and reviewers who need explicit reasoning.
            </h2>
            <p>
              The workspace should help people move from structured intake to
              auditable outputs without hiding assumptions behind an overly
              vague AI narrative.
            </p>
          </div>
        </div>
        <div className="landing-card-grid landing-card-grid--three">
          {roleCards.map((card) => (
            <article className="landing-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="workflow">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Workflow</Badge>
            <h2>One path from intake to exportable output.</h2>
            <p>
              The homepage should explain the live flow clearly: review
              evidence, draft the case, submit with visible stages, inspect the
              evaluation workspace, compare runs, and export the result.
            </p>
          </div>
        </div>
        <div className="landing-step-grid">
          {workflowSteps.map((step) => (
            <article className="landing-step-card" key={step.title}>
              <span>{step.title}</span>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="routes">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Live pages</Badge>
            <h2>Use the real METREV page map.</h2>
            <p>
              The new public landing should point to the current workspace
              structure rather than advertising route names borrowed from a
              different product.
            </p>
          </div>
        </div>
        <div className="landing-route-grid">
          {routeCards.map((card) => (
            <article className="landing-route-card" key={card.title}>
              <div className="landing-route-card__header">
                <h3>{card.title}</h3>
                {card.path ? <code>{card.path}</code> : null}
              </div>
              <p>{card.detail}</p>
              {card.href && card.label ? (
                <Link className="ghost-button" href={card.href}>
                  {card.label}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="tabs">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Evaluation workspace</Badge>
            <h2>Expose the actual tabs that structure the result.</h2>
            <p>
              The result workspace already separates decision layers into
              Overview, Recommendations, Modeling, Roadmap &amp; Suppliers, and
              Audit. The landing should describe that system directly.
            </p>
          </div>
        </div>
        <div className="landing-card-grid landing-card-grid--five">
          {tabCards.map((card) => (
            <article className="landing-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="audit">
        <div className="landing-section__header">
          <div>
            <Badge variant="muted">Traceability</Badge>
            <h2>Keep the premium posture anchored in audit visibility.</h2>
            <p>
              The METREV promise is not just that it produces an answer. It is
              that the analyst can inspect why the answer exists, what evidence
              shaped it, and where confidence is still limited.
            </p>
          </div>
        </div>
        <div className="landing-card-grid landing-card-grid--three">
          {auditCards.map((card) => (
            <article
              className="landing-card landing-card--accent"
              key={card.title}
            >
              <h3>{card.title}</h3>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <Badge variant="info">Access</Badge>
          <h2>Enter the live analyst workspace.</h2>
          <p>
            Sign in to reach the dashboard, input deck, evidence review queue,
            saved evaluations, comparison views, reports, and case history.
          </p>
        </div>
        <div className="landing-actions">
          <Link className="button" href="/login">
            Sign in
          </Link>
          <Link className="button secondary" href={loginHref('/dashboard')}>
            Open dashboard after sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
