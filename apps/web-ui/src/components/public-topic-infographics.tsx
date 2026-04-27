'use client';

import Link from 'next/link';
import * as React from 'react';

import type {
  PublicDialogContent,
  PublicCenterKind,
  PublicMiniVisualKind,
  PublicTone,
  PublicTopicConfig,
} from '@/components/public-topic-content';
import {
  PUBLIC_TOPIC_PAGES,
  getPublicPanelDialog,
  getPublicTopicHref,
  getPublicTopicLandingDialog,
} from '@/components/public-topic-content';
import { Dialog } from '@/components/ui/dialog';

void React;

const tonePrimary: Record<PublicTone, string> = {
  teal: '#1d9b94',
  sky: '#2e7fc8',
  amber: '#db8f2f',
  violet: '#7e63d5',
  mint: '#4ab88f',
  ink: '#36556d',
};

const toneSoft: Record<PublicTone, string> = {
  teal: '#e8fbf7',
  sky: '#eef6ff',
  amber: '#fff5e8',
  violet: '#f5efff',
  mint: '#edfdf4',
  ink: '#eef4f8',
};

function MiniVisual({
  kind,
  tone,
}: {
  kind: PublicMiniVisualKind;
  tone: PublicTone;
}) {
  const primary = tonePrimary[tone];
  const soft = toneSoft[tone];

  return (
    <svg
      aria-hidden="true"
      className="public-infographic__mini-svg"
      viewBox="0 0 160 80"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="8" width="148" height="64" rx="16" fill={soft} />
      {kind === 'wave' ? (
        <>
          <path
            d="M20 54C34 42 44 42 56 54C68 66 78 66 92 54C106 42 116 42 130 54"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeWidth="6"
          />
          <path
            d="M20 38H138"
            fill="none"
            opacity="0.16"
            stroke="#12344a"
            strokeDasharray="8 8"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      ) : null}
      {kind === 'cluster' ? (
        <>
          <circle cx="54" cy="42" r="12" fill={primary} opacity="0.95" />
          <circle cx="78" cy="28" r="10" fill={primary} opacity="0.72" />
          <circle cx="92" cy="50" r="11" fill={primary} opacity="0.8" />
          <circle cx="108" cy="34" r="9" fill={primary} opacity="0.58" />
          <path
            d="M54 42L78 28L92 50L108 34"
            fill="none"
            stroke="#12344a"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </>
      ) : null}
      {kind === 'grid' ? (
        <>
          <rect x="36" y="22" width="20" height="20" rx="6" fill={primary} />
          <rect
            x="62"
            y="22"
            width="20"
            height="20"
            rx="6"
            fill={primary}
            opacity="0.78"
          />
          <rect
            x="88"
            y="22"
            width="20"
            height="20"
            rx="6"
            fill={primary}
            opacity="0.58"
          />
          <rect
            x="49"
            y="46"
            width="20"
            height="20"
            rx="6"
            fill={primary}
            opacity="0.72"
          />
          <rect
            x="75"
            y="46"
            width="20"
            height="20"
            rx="6"
            fill={primary}
            opacity="0.9"
          />
          <path
            d="M46 32H98M59 56H85"
            fill="none"
            stroke="#12344a"
            opacity="0.2"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </>
      ) : null}
      {kind === 'stack' ? (
        <>
          <rect x="34" y="18" width="18" height="44" rx="9" fill={primary} />
          <rect
            x="62"
            y="18"
            width="18"
            height="44"
            rx="9"
            fill="#f1f6fb"
            stroke="#12344a"
            opacity="0.4"
            strokeWidth="2"
          />
          <rect
            x="90"
            y="18"
            width="18"
            height="44"
            rx="9"
            fill={primary}
            opacity="0.62"
          />
          <rect
            x="118"
            y="18"
            width="10"
            height="44"
            rx="5"
            fill={primary}
            opacity="0.32"
          />
          <path
            d="M30 64H130"
            fill="none"
            stroke="#12344a"
            opacity="0.22"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      ) : null}
      {kind === 'signal' ? (
        <>
          <path
            d="M20 54H48L58 24L72 58L86 34L96 50H138"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="6"
          />
        </>
      ) : null}
      {kind === 'gauge' ? (
        <>
          <path
            d="M34 58C34 36 50 20 72 20C94 20 110 36 110 58"
            fill="none"
            stroke="#12344a"
            opacity="0.22"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M72 58L102 34"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeWidth="8"
          />
          <circle cx="72" cy="58" r="8" fill={primary} />
        </>
      ) : null}
      {kind === 'bars' ? (
        <>
          <rect
            x="34"
            y="38"
            width="16"
            height="24"
            rx="6"
            fill={primary}
            opacity="0.56"
          />
          <rect
            x="58"
            y="28"
            width="16"
            height="34"
            rx="6"
            fill={primary}
            opacity="0.74"
          />
          <rect x="82" y="18" width="16" height="44" rx="6" fill={primary} />
          <rect
            x="106"
            y="24"
            width="16"
            height="38"
            rx="6"
            fill={primary}
            opacity="0.86"
          />
        </>
      ) : null}
      {kind === 'report' ? (
        <>
          <rect
            x="48"
            y="16"
            width="64"
            height="48"
            rx="10"
            fill="#ffffff"
            stroke={primary}
            strokeWidth="4"
          />
          <path
            d="M60 30H96M60 42H92M60 54H84"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      ) : null}
      {kind === 'compare' ? (
        <>
          <rect
            x="36"
            y="24"
            width="34"
            height="32"
            rx="10"
            fill={primary}
            opacity="0.3"
          />
          <rect x="90" y="18" width="34" height="38" rx="10" fill={primary} />
          <path
            d="M76 40H84"
            fill="none"
            stroke="#12344a"
            opacity="0.28"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      ) : null}
      {kind === 'map' ? (
        <>
          <circle cx="52" cy="40" r="12" fill={primary} opacity="0.56" />
          <circle cx="82" cy="26" r="10" fill={primary} opacity="0.78" />
          <circle cx="110" cy="48" r="12" fill={primary} />
          <path
            d="M52 40L82 26L110 48"
            fill="none"
            stroke="#12344a"
            opacity="0.22"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      ) : null}
      {kind === 'network' ? (
        <>
          <circle cx="42" cy="24" r="8" fill={primary} />
          <circle cx="72" cy="46" r="8" fill={primary} opacity="0.72" />
          <circle cx="102" cy="22" r="8" fill={primary} opacity="0.82" />
          <circle cx="122" cy="52" r="8" fill={primary} opacity="0.58" />
          <path
            d="M42 24L72 46L102 22L122 52L72 46"
            fill="none"
            stroke="#12344a"
            opacity="0.24"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      ) : null}
      {kind === 'flow' ? (
        <>
          <path
            d="M28 28H74"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeWidth="6"
          />
          <path
            d="M66 18L84 28L66 38"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="6"
          />
          <path
            d="M86 48H132"
            fill="none"
            stroke={primary}
            opacity="0.7"
            strokeLinecap="round"
            strokeWidth="6"
          />
          <path
            d="M124 38L142 48L124 58"
            fill="none"
            stroke={primary}
            opacity="0.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="6"
          />
        </>
      ) : null}
    </svg>
  );
}

function _CenterGraphic({ kind }: { kind: PublicCenterKind }) {
  return (
    <svg
      aria-hidden="true"
      className="public-infographic__center-svg"
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="120" cy="120" r="92" fill="#ffffff" opacity="0.94" />
      <circle
        cx="120"
        cy="120"
        r="112"
        fill="none"
        opacity="0.28"
        stroke="#0f6b7d"
        strokeWidth="4"
      />
      <circle
        cx="120"
        cy="120"
        r="104"
        fill="none"
        opacity="0.18"
        stroke="#0f6b7d"
        strokeDasharray="12 10"
        strokeWidth="4"
      />
      {kind === 'problem' ? (
        <>
          <circle cx="120" cy="120" r="44" fill="#14354a" />
          <path
            d="M78 128C94 106 114 100 136 108C154 114 166 128 164 150C142 162 118 166 94 158C82 150 76 140 78 128Z"
            fill="#22b4a8"
            opacity="0.88"
          />
          <circle cx="86" cy="74" r="8" fill="#2e7fc8" />
          <circle cx="160" cy="72" r="8" fill="#db8f2f" />
          <circle cx="172" cy="160" r="8" fill="#7e63d5" />
          <circle cx="70" cy="164" r="8" fill="#4ab88f" />
        </>
      ) : null}
      {kind === 'technology' ? (
        <>
          <rect x="82" y="74" width="24" height="92" rx="12" fill="#22b4a8" />
          <rect
            x="116"
            y="74"
            width="20"
            height="92"
            rx="10"
            fill="#eef6ff"
            stroke="#14354a"
            strokeWidth="2"
          />
          <rect x="144" y="74" width="22" height="92" rx="11" fill="#db8f2f" />
          <circle cx="96" cy="106" r="8" fill="#d9fff6" />
          <circle cx="96" cy="134" r="8" fill="#d9fff6" opacity="0.82" />
          <circle cx="96" cy="158" r="8" fill="#d9fff6" opacity="0.66" />
          <path
            d="M106 120H144"
            fill="none"
            stroke="#2e7fc8"
            strokeDasharray="8 8"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      ) : null}
      {kind === 'stack' ? (
        <>
          <rect x="74" y="84" width="28" height="72" rx="14" fill="#22b4a8" />
          <rect
            x="108"
            y="84"
            width="24"
            height="72"
            rx="12"
            fill="#eef6ff"
            stroke="#14354a"
            strokeWidth="2"
          />
          <rect x="138" y="84" width="26" height="72" rx="13" fill="#db8f2f" />
          <path
            d="M74 170H164"
            fill="none"
            stroke="#14354a"
            opacity="0.24"
            strokeLinecap="round"
            strokeWidth="6"
          />
          <circle cx="94" cy="56" r="8" fill="#4ab88f" />
          <circle cx="152" cy="58" r="8" fill="#2e7fc8" />
        </>
      ) : null}
      {kind === 'comparison' ? (
        <>
          <rect
            x="82"
            y="130"
            width="20"
            height="34"
            rx="8"
            fill="#2e7fc8"
            opacity="0.58"
          />
          <rect x="112" y="108" width="20" height="56" rx="8" fill="#22b4a8" />
          <rect x="142" y="92" width="20" height="72" rx="8" fill="#db8f2f" />
          <path
            d="M74 168H170"
            fill="none"
            stroke="#14354a"
            opacity="0.24"
            strokeLinecap="round"
            strokeWidth="6"
          />
        </>
      ) : null}
      {kind === 'impact' ? (
        <>
          <circle cx="120" cy="120" r="34" fill="#22b4a8" />
          <path
            d="M120 62C150 62 176 84 184 112"
            fill="none"
            stroke="#2e7fc8"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M70 144C88 174 120 188 154 180"
            fill="none"
            stroke="#db8f2f"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <circle cx="190" cy="120" r="14" fill="#2e7fc8" />
          <circle cx="160" cy="184" r="14" fill="#4ab88f" />
          <circle cx="64" cy="144" r="14" fill="#db8f2f" />
        </>
      ) : null}
      {kind === 'metrev' ? (
        <>
          <rect x="84" y="78" width="72" height="88" rx="24" fill="#14354a" />
          <path
            d="M98 108H142M98 126H132M98 144H138"
            fill="none"
            stroke="#d9fff6"
            strokeLinecap="round"
            strokeWidth="6"
          />
          <circle cx="72" cy="118" r="10" fill="#2e7fc8" />
          <circle cx="168" cy="118" r="10" fill="#db8f2f" />
          <path
            d="M72 118H84M156 118H168"
            fill="none"
            stroke="#22b4a8"
            strokeLinecap="round"
            strokeWidth="6"
          />
          <circle cx="120" cy="184" r="12" fill="#22b4a8" />
        </>
      ) : null}
    </svg>
  );
}

interface PublicInteractiveBoardItem {
  dialog: PublicDialogContent;
  eyebrow: string;
  href?: string;
  indexLabel: string;
  points: string[];
  subtitle: string;
  testId?: string;
  title: string;
  tone: PublicTone;
  visualKind: PublicMiniVisualKind;
}

function PublicDialogBody({ dialog }: { dialog: PublicDialogContent }) {
  return (
    <div className="public-board-dialog">
      <p className="public-board-dialog__lead">{dialog.lead}</p>
      <div className="public-board-dialog__sections">
        {dialog.sections.map((section) => (
          <article className="public-board-dialog__section" key={section.label}>
            <span>{section.label}</span>
            <p>{section.body}</p>
          </article>
        ))}
      </div>
      <article className="public-board-dialog__takeaway">
        <span>METREV takeaway</span>
        <p>{dialog.takeaway}</p>
      </article>
    </div>
  );
}

function PublicInteractiveBoard({
  compact = false,
  item,
}: {
  compact?: boolean;
  item: PublicInteractiveBoardItem;
}) {
  return (
    <Dialog
      contentClassName="public-board-dialog-shell"
      description={item.dialog.eyebrow}
      footer={
        item.href ? (
          <Link className="button secondary" href={item.href}>
            Open full page
          </Link>
        ) : null
      }
      title={item.dialog.title}
      trigger={
        <button
          className={
            compact
              ? 'public-linear-board public-linear-board--compact'
              : 'public-linear-board'
          }
          data-compact={compact ? 'true' : 'false'}
          data-testid={item.testId}
          data-tone={item.tone}
          type="button"
        >
          <div className="public-linear-board__head">
            <span className="public-linear-board__index" data-tone={item.tone}>
              {item.indexLabel}
            </span>
            <div className="public-linear-board__copy">
              <p className="public-linear-board__eyebrow">{item.eyebrow}</p>
              <h4>{item.title}</h4>
              <p className="public-linear-board__subtitle">{item.subtitle}</p>
            </div>
          </div>

          <div className="public-linear-board__visual">
            <MiniVisual kind={item.visualKind} tone={item.tone} />
          </div>

          <div className="public-linear-board__points">
            {item.points.map((point) => (
              <span className="public-linear-board__point" key={point}>
                {point}
              </span>
            ))}
          </div>
        </button>
      }
    >
      <PublicDialogBody dialog={item.dialog} />
    </Dialog>
  );
}

export function PublicLandingInfographic() {
  return (
    <div
      className="public-infographic public-infographic--landing"
      data-testid="public-landing-infographic"
    >
      <div className="public-infographic__summary">
        <div className="public-infographic__summary-copy">
          <p className="public-infographic__summary-kicker">
            Six public explanation routes
          </p>
          <h3>Follow the METREV story in one linear sequence.</h3>
          <p>
            Each board opens a fuller explanation of one public lens. Use the
            fixed header to jump into the dedicated page for that topic when you
            want the smaller six-point breakdown.
          </p>
        </div>
      </div>

      <div className="public-infographic__rail public-infographic__rail--landing">
        {PUBLIC_TOPIC_PAGES.map((topic, index) => (
          <PublicInteractiveBoard
            item={{
              dialog: getPublicTopicLandingDialog(topic),
              eyebrow: topic.navLabel,
              href: getPublicTopicHref(topic.slug),
              indexLabel: String(index + 1).padStart(2, '0'),
              points: [...topic.previewPoints],
              subtitle: topic.routeMarker,
              testId: `public-landing-board-${topic.slug}`,
              title: topic.cardTitle,
              tone: topic.accentTone,
              visualKind: topic.panels[0].visualKind,
            }}
            key={topic.slug}
          />
        ))}
      </div>
    </div>
  );
}

export function PublicTopicInfographic({
  topic,
}: {
  topic: PublicTopicConfig;
}) {
  return (
    <div
      className="public-infographic public-infographic--topic"
      data-testid="public-topic-infographic"
      data-topic={topic.slug}
    >
      <div className="public-infographic__summary">
        <div className="public-infographic__summary-copy">
          <p className="public-infographic__summary-kicker">
            {topic.legendTitle}
          </p>
          <h3>{topic.centerTitle}</h3>
          <p>{topic.legendLead}</p>
        </div>

        <div className="public-infographic__legend public-infographic__legend--linear">
          {topic.legend.map((item) => (
            <article
              className="public-infographic__legend-item"
              key={item.label}
            >
              <span
                className="public-infographic__legend-swatch"
                data-tone={item.tone}
              />
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="public-infographic__rail public-infographic__rail--topic">
        {topic.panels.map((panel) => (
          <PublicInteractiveBoard
            compact
            item={{
              dialog: getPublicPanelDialog(topic, panel),
              eyebrow: panel.subtitle,
              indexLabel: String(panel.number).padStart(2, '0'),
              points: [...panel.bullets],
              subtitle: topic.navLabel,
              testId: `public-topic-board-${topic.slug}-${panel.number}`,
              title: panel.title,
              tone: panel.tone,
              visualKind: panel.visualKind,
            }}
            key={`${topic.slug}-${panel.number}`}
          />
        ))}
      </div>

      <p className="public-infographic__note">{topic.infographicNote}</p>
    </div>
  );
}
