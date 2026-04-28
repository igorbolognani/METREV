'use client';

import * as React from 'react';

import type {
  PublicDialogContent,
  PublicCenterKind,
  PublicMiniVisualKind,
  PublicTone,
  PublicTopicConfig,
  PublicTopicSlug,
} from '@/components/public-topic-content';
import {
  PUBLIC_TOPIC_PAGES,
  getPublicPanelDialog,
  getPublicTopicLandingDialog,
} from '@/components/public-topic-content';
import { Dialog } from '@/components/ui/dialog';

void React;

const tonePrimary: Record<PublicTone, string> = {
  teal: '#bf3640',
  sky: '#da6d68',
  amber: '#e1b153',
  violet: '#2f6fcb',
  mint: '#c99a16',
  ink: '#58a8da',
};

const toneSoft: Record<PublicTone, string> = {
  teal: '#fff1ef',
  sky: '#fff2ef',
  amber: '#fff6e3',
  violet: '#edf5ff',
  mint: '#fff8db',
  ink: '#eef8ff',
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
  indexLabel: string;
  layout?: 'landing' | 'topic';
  points: string[];
  slug?: PublicTopicSlug;
  subtitle: string;
  testId?: string;
  title: string;
  tone: PublicTone;
  visualKind: PublicMiniVisualKind;
}

function LandingReferenceIcon({ slug }: { slug: PublicTopicSlug }) {
  if (slug === 'problem') {
    return (
      <svg aria-hidden="true" viewBox="0 0 54 54">
        <circle
          cx="27"
          cy="29"
          r="18"
          fill="none"
          stroke="#1D9E75"
          strokeWidth="2.5"
        />
        <circle cx="27" cy="29" r="13" fill="#c8ede2" />
        <path
          d="M13 43 Q27 8 41 43"
          fill="none"
          stroke="#9FE1CB"
          strokeWidth="2"
          strokeDasharray="2.5 2.5"
        />
        <path
          d="M27 29 L27 16"
          stroke="#085041"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M27 29 L36 22"
          stroke="#1D9E75"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="27" cy="29" r="3" fill="#085041" />
        <line
          x1="14"
          y1="23"
          x2="17"
          y2="25"
          stroke="#1D9E75"
          strokeWidth="1.5"
        />
        <line
          x1="27"
          y1="13"
          x2="27"
          y2="17"
          stroke="#1D9E75"
          strokeWidth="1.5"
        />
        <line
          x1="40"
          y1="23"
          x2="37"
          y2="25"
          stroke="#1D9E75"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (slug === 'technology') {
    return (
      <svg aria-hidden="true" viewBox="0 0 54 54">
        <rect
          x="5"
          y="12"
          width="19"
          height="30"
          rx="5"
          fill="#c0dd97"
          stroke="#3B6D11"
          strokeWidth="2"
        />
        <text
          x="14.5"
          y="22"
          textAnchor="middle"
          fontSize="7.5"
          fill="#27500A"
          fontWeight="800"
        >
          MFC
        </text>
        <line
          x1="9"
          y1="27"
          x2="20"
          y2="27"
          stroke="#3B6D11"
          strokeWidth="1.5"
        />
        <line
          x1="9"
          y1="33"
          x2="20"
          y2="33"
          stroke="#27500A"
          strokeWidth="1.5"
        />
        <rect
          x="30"
          y="12"
          width="19"
          height="30"
          rx="5"
          fill="#97c459"
          stroke="#3B6D11"
          strokeWidth="2"
        />
        <text
          x="39.5"
          y="22"
          textAnchor="middle"
          fontSize="7.5"
          fill="#173404"
          fontWeight="800"
        >
          MEC
        </text>
        <line
          x1="34"
          y1="27"
          x2="45"
          y2="27"
          stroke="#3B6D11"
          strokeWidth="1.5"
        />
        <line
          x1="34"
          y1="33"
          x2="45"
          y2="33"
          stroke="#27500A"
          strokeWidth="1.5"
        />
        <line
          x1="24"
          y1="27"
          x2="30"
          y2="27"
          stroke="#3B6D11"
          strokeWidth="2"
          strokeDasharray="2 2"
        />
        <polygon points="27,20 24,28 27,26 24,34 30,26 27,28" fill="#BA7517" />
      </svg>
    );
  }

  if (slug === 'stack') {
    return (
      <svg aria-hidden="true" viewBox="0 0 54 54">
        <rect
          x="7"
          y="36"
          width="40"
          height="9"
          rx="3"
          fill="#b5d4f4"
          stroke="#185FA5"
          strokeWidth="1.5"
        />
        <rect
          x="9"
          y="26"
          width="36"
          height="9"
          rx="3"
          fill="#85b7eb"
          stroke="#185FA5"
          strokeWidth="1.5"
        />
        <rect
          x="11"
          y="16"
          width="32"
          height="9"
          rx="3"
          fill="#378add"
          stroke="#185FA5"
          strokeWidth="1.5"
        />
        <rect
          x="13"
          y="7"
          width="28"
          height="8"
          rx="3"
          fill="#185FA5"
          stroke="#0C447C"
          strokeWidth="1.5"
        />
        <text
          x="27"
          y="12.5"
          textAnchor="middle"
          fontSize="6"
          fill="#fff"
          fontWeight="700"
        >
          REACTOR
        </text>
        <text
          x="27"
          y="21.5"
          textAnchor="middle"
          fontSize="6"
          fill="#fff"
          fontWeight="700"
        >
          ELECTRODES
        </text>
        <text
          x="27"
          y="31.5"
          textAnchor="middle"
          fontSize="5.5"
          fill="#042c53"
          fontWeight="600"
        >
          MEMBRANE
        </text>
        <text
          x="27"
          y="41.5"
          textAnchor="middle"
          fontSize="5"
          fill="#0c447c"
          fontWeight="600"
        >
          SENSORS
        </text>
      </svg>
    );
  }

  if (slug === 'comparison') {
    return (
      <svg aria-hidden="true" viewBox="0 0 54 54">
        <rect
          x="7"
          y="7"
          width="18"
          height="18"
          rx="3"
          fill="#faeeda"
          stroke="#BA7517"
          strokeWidth="1.5"
        />
        <rect
          x="29"
          y="7"
          width="18"
          height="18"
          rx="3"
          fill="#ef9f27"
          stroke="#BA7517"
          strokeWidth="1.8"
        />
        <rect
          x="7"
          y="29"
          width="18"
          height="18"
          rx="3"
          fill="#fac775"
          stroke="#BA7517"
          strokeWidth="1.5"
        />
        <rect
          x="29"
          y="29"
          width="18"
          height="18"
          rx="3"
          fill="#faeeda"
          stroke="#BA7517"
          strokeWidth="1.5"
        />
        <text
          x="16"
          y="17.5"
          textAnchor="middle"
          fontSize="6.5"
          fill="#633806"
          fontWeight="700"
        >
          AD
        </text>
        <text
          x="38"
          y="17.5"
          textAnchor="middle"
          fontSize="6.5"
          fill="#fff"
          fontWeight="800"
        >
          BES
        </text>
        <text
          x="16"
          y="39.5"
          textAnchor="middle"
          fontSize="5.5"
          fill="#854F0B"
          fontWeight="600"
        >
          Conv
        </text>
        <text
          x="38"
          y="39.5"
          textAnchor="middle"
          fontSize="5.5"
          fill="#854F0B"
          fontWeight="600"
        >
          MBR
        </text>
        <text x="38" y="11" textAnchor="middle" fontSize="8" fill="#fff">
          ★
        </text>
      </svg>
    );
  }

  if (slug === 'impact') {
    return (
      <svg aria-hidden="true" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r="5" fill="#534AB7" />
        <circle
          cx="27"
          cy="27"
          r="11"
          fill="none"
          stroke="#534AB7"
          strokeWidth="1.8"
          opacity="0.65"
        />
        <circle
          cx="27"
          cy="27"
          r="18"
          fill="none"
          stroke="#7F77DD"
          strokeWidth="1.3"
          opacity="0.4"
        />
        <ellipse cx="27" cy="5" rx="4" ry="5" fill="#185FA5" opacity="0.85" />
        <polygon
          points="42,24 38,30 41,30 37,36 43,28 40,28"
          fill="#BA7517"
          opacity="0.9"
        />
        <path
          d="M27 49 Q21 43 27 38 Q33 43 27 49Z"
          fill="#3B6D11"
          opacity="0.85"
        />
        <circle cx="8" cy="27" r="5" fill="#534AB7" opacity="0.7" />
        <text
          x="8"
          y="29.5"
          textAnchor="middle"
          fontSize="5"
          fill="#fff"
          fontWeight="700"
        >
          CO₂
        </text>
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 54 54">
      <rect
        x="4"
        y="20"
        width="13"
        height="13"
        rx="3"
        fill="#9FE1CB"
        stroke="#085041"
        strokeWidth="1.5"
      />
      <rect
        x="21"
        y="20"
        width="13"
        height="13"
        rx="3"
        fill="#1D9E75"
        stroke="#085041"
        strokeWidth="1.8"
      />
      <rect
        x="38"
        y="20"
        width="13"
        height="13"
        rx="3"
        fill="#085041"
        stroke="#04342C"
        strokeWidth="1.5"
      />
      <text
        x="10.5"
        y="28"
        textAnchor="middle"
        fontSize="5.5"
        fill="#085041"
        fontWeight="700"
      >
        CFG
      </text>
      <text
        x="27.5"
        y="28"
        textAnchor="middle"
        fontSize="5.5"
        fill="#fff"
        fontWeight="700"
      >
        CMP
      </text>
      <text
        x="44.5"
        y="28"
        textAnchor="middle"
        fontSize="5.5"
        fill="#9FE1CB"
        fontWeight="700"
      >
        RPT
      </text>
      <line
        x1="17"
        y1="26.5"
        x2="21"
        y2="26.5"
        stroke="#085041"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <polygon points="20,24 24,26.5 20,29" fill="#085041" />
      <line
        x1="34"
        y1="26.5"
        x2="38"
        y2="26.5"
        stroke="#085041"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <polygon points="37,24 41,26.5 37,29" fill="#085041" />
      <path
        d="M10 20 Q27 7 44 20"
        fill="none"
        stroke="#5DCAA5"
        strokeWidth="1.3"
        strokeDasharray="2 2"
      />
      <text
        x="27"
        y="13"
        textAnchor="middle"
        fontSize="5.5"
        fill="#0F6E56"
        fontWeight="600"
      >
        one path
      </text>
      <rect
        x="20"
        y="36"
        width="15"
        height="12"
        rx="2"
        fill="#e1f5ee"
        stroke="#5DCAA5"
        strokeWidth="1.2"
      />
      <line x1="23" y1="40" x2="32" y2="40" stroke="#1D9E75" strokeWidth="1" />
      <line x1="23" y1="43" x2="32" y2="43" stroke="#1D9E75" strokeWidth="1" />
      <line x1="23" y1="46" x2="29" y2="46" stroke="#1D9E75" strokeWidth="1" />
    </svg>
  );
}

function PublicDialogBody({ dialog }: { dialog: PublicDialogContent }) {
  return (
    <div className="public-board-dialog">
      <p className="public-board-dialog__lead">{dialog.lead}</p>
      <div
        className="public-board-dialog__sections"
        data-section-count={dialog.sections.length}
      >
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

function TopicNodeIcon({
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
      className="public-linear-board__node-icon"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      {kind === 'wave' || kind === 'signal' ? (
        <path
          d="M10 36C15 24 21 24 27 36C33 48 39 48 45 36C49 28 53 28 56 36"
          fill="none"
          stroke={primary}
          strokeLinecap="round"
          strokeWidth="4"
        />
      ) : null}
      {kind === 'flow' ? (
        <>
          <path
            d="M14 24H44"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeWidth="4"
          />
          <path
            d="M35 16L50 24L35 32"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          <path
            d="M14 40H44"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeWidth="4"
          />
          <path
            d="M35 32L50 40L35 48"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
        </>
      ) : null}
      {kind === 'grid' ? (
        <>
          <rect
            x="14"
            y="14"
            width="18"
            height="18"
            rx="4"
            fill={primary}
            opacity="0.88"
          />
          <rect
            x="36"
            y="14"
            width="14"
            height="18"
            rx="4"
            fill={primary}
            opacity="0.58"
          />
          <rect
            x="14"
            y="36"
            width="18"
            height="14"
            rx="4"
            fill={primary}
            opacity="0.58"
          />
          <rect
            x="36"
            y="36"
            width="14"
            height="14"
            rx="4"
            fill={primary}
            opacity="0.28"
          />
        </>
      ) : null}
      {kind === 'bars' || kind === 'stack' ? (
        <>
          <rect
            x="14"
            y="28"
            width="10"
            height="22"
            rx="2"
            fill={primary}
            opacity="0.52"
          />
          <rect
            x="28"
            y="18"
            width="10"
            height="32"
            rx="2"
            fill={primary}
            opacity="0.76"
          />
          <rect x="42" y="10" width="10" height="40" rx="2" fill={primary} />
        </>
      ) : null}
      {kind === 'gauge' ? (
        <>
          <path
            d="M18 46C18 30 30 18 46 18"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeWidth="6"
          />
          <path
            d="M46 18C53 18 58 20 60 24"
            fill="none"
            stroke={soft}
            strokeLinecap="round"
            strokeWidth="6"
          />
          <path
            d="M33 33L45 45"
            fill="none"
            stroke="#17313b"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <circle cx="33" cy="33" r="4" fill="#17313b" />
        </>
      ) : null}
      {kind === 'network' || kind === 'map' || kind === 'cluster' ? (
        <>
          <circle cx="16" cy="16" r="6" fill={primary} opacity="0.78" />
          <circle cx="48" cy="16" r="6" fill={primary} opacity="0.5" />
          <circle cx="16" cy="48" r="6" fill={primary} opacity="0.5" />
          <circle cx="48" cy="48" r="6" fill={primary} opacity="0.22" />
          <circle cx="32" cy="32" r="7" fill="#595959" />
          <path
            d="M16 16L32 32L48 16M32 32L16 48M32 32L48 48"
            fill="none"
            stroke={primary}
            opacity="0.58"
            strokeWidth="2.5"
          />
        </>
      ) : null}
      {kind === 'report' ? (
        <>
          <rect
            x="20"
            y="10"
            width="24"
            height="42"
            rx="4"
            fill="none"
            stroke={primary}
            strokeWidth="2.5"
          />
          <path
            d="M26 22H38M26 30H40M26 38H36"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </>
      ) : null}
      {kind === 'compare' ? (
        <>
          <rect
            x="10"
            y="20"
            width="18"
            height="18"
            rx="4"
            fill={soft}
            stroke={primary}
            strokeWidth="2"
          />
          <path
            d="M28 29H40"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M35 23L46 29L35 35"
            fill="none"
            stroke={primary}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <rect x="46" y="20" width="8" height="18" rx="3" fill={primary} />
        </>
      ) : null}
    </svg>
  );
}

function PublicInteractiveBoard({
  compact = false,
  item,
}: {
  compact?: boolean;
  item: PublicInteractiveBoardItem;
}) {
  const layout = item.layout ?? (compact ? 'topic' : 'landing');

  return (
    <Dialog
      contentClassName={
        layout === 'landing'
          ? 'public-board-dialog-shell public-board-dialog-shell--landing'
          : 'public-board-dialog-shell'
      }
      headerAccessory={
        <span className="public-board-dialog__tag">{item.dialog.eyebrow}</span>
      }
      title={item.dialog.title}
      trigger={
        <button
          aria-label={`${item.title} Open detailed explanation`}
          className={
            layout === 'landing'
              ? 'public-linear-board public-linear-board--landing'
              : 'public-linear-board public-linear-board--topic'
          }
          data-compact={compact ? 'true' : 'false'}
          data-layout={layout}
          data-slug={item.slug}
          data-testid={item.testId}
          data-tone={item.tone}
          type="button"
        >
          {layout === 'landing' ? (
            <>
              <span
                className="public-linear-board__index"
                data-tone={item.tone}
              >
                {item.indexLabel}
              </span>
              <p className="public-linear-board__eyebrow">{item.eyebrow}</p>
              <div className="public-linear-board__copy public-linear-board__copy--landing">
                <h4>{item.title}</h4>
              </div>
              <div
                className="public-linear-board__icon-button"
                aria-hidden="true"
              >
                {item.slug ? (
                  <LandingReferenceIcon slug={item.slug} />
                ) : (
                  <MiniVisual kind={item.visualKind} tone={item.tone} />
                )}
              </div>
              <div className="public-linear-board__points public-linear-board__points--landing">
                {item.points.map((point) => (
                  <span className="public-linear-board__point" key={point}>
                    {point}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <span
                className="public-linear-board__index public-linear-board__index--topic"
                data-tone={item.tone}
              >
                {item.indexLabel}
              </span>
              <p className="public-linear-board__eyebrow public-linear-board__eyebrow--topic">
                {item.eyebrow}
              </p>

              <div
                className="public-linear-board__node-circle"
                aria-hidden="true"
              >
                <TopicNodeIcon kind={item.visualKind} tone={item.tone} />
              </div>

              <div className="public-linear-board__copy public-linear-board__copy--topic">
                <h4>{item.title}</h4>
              </div>

              <div className="public-linear-board__points public-linear-board__points--sr-only">
                {item.points.map((point) => (
                  <span className="public-linear-board__point" key={point}>
                    {point}
                  </span>
                ))}
              </div>
            </>
          )}
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
      <div className="public-infographic__rail public-infographic__rail--landing">
        {PUBLIC_TOPIC_PAGES.map((topic, index) => (
          <PublicInteractiveBoard
            item={{
              dialog: getPublicTopicLandingDialog(topic),
              eyebrow: topic.routeMarker,
              indexLabel: String(index + 1).padStart(2, '0'),
              layout: 'landing',
              points: [...topic.previewPoints],
              slug: topic.slug,
              subtitle: topic.navLabel,
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

function getTopicOrderLabel(topic: PublicTopicConfig) {
  const index = PUBLIC_TOPIC_PAGES.findIndex(
    (candidate) => candidate.slug === topic.slug,
  );

  return String(index + 1).padStart(2, '0');
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
      <div className="public-infographic__topic-card">
        <div className="public-infographic__topic-header">
          <span className="public-infographic__topic-index">
            {getTopicOrderLabel(topic)}
          </span>
          <div className="public-infographic__topic-copy">
            <p className="public-infographic__topic-kicker">
              {topic.navLabel} · {topic.routeMarker}
            </p>
            <h1>{topic.heroTitle}</h1>
          </div>
        </div>

        <div className="public-infographic__topic-body">
          <div className="public-infographic__rail public-infographic__rail--topic">
            {topic.panels.map((panel) => (
              <PublicInteractiveBoard
                compact
                item={{
                  dialog: getPublicPanelDialog(topic, panel),
                  eyebrow: panel.subtitle,
                  indexLabel: String(panel.number),
                  points: [...panel.bullets],
                  subtitle: topic.navLabel,
                  testId: `public-topic-board-${topic.slug}-${panel.number}`,
                  title: panel.title,
                  tone: topic.accentTone,
                  visualKind: panel.visualKind,
                }}
                key={`${topic.slug}-${panel.number}`}
              />
            ))}
          </div>

          <div className="public-infographic__topic-tags">
            {topic.previewPoints.map((point) => (
              <span className="public-infographic__topic-tag" key={point}>
                {point}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
