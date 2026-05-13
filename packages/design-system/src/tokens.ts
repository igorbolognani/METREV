export const colors = {
  surface: {
    0: '#0A0E14',
    1: '#111821',
    2: '#1A2332',
    3: '#243044',
  },
  text: {
    primary: '#E6EDF3',
    secondary: '#A7B1C2',
    muted: '#6E7681',
  },
  signal: {
    healthy: '#2EA043',
    warning: '#D29922',
    critical: '#F85149',
    info: '#58A6FF',
    neutral: '#6E7681',
  },
  accent: {
    primary: '#1F6FEB',
    secondary: '#BC8CFF',
    evidence: '#3FB950',
    supplier: '#DB6D28',
  },
} as const;

export const typography = {
  display: 'JetBrains Mono, IBM Plex Mono, ui-monospace, monospace',
  heading: 'IBM Plex Sans Condensed, IBM Plex Sans, ui-sans-serif, system-ui',
  body: 'IBM Plex Sans, ui-sans-serif, system-ui',
  data: 'JetBrains Mono, IBM Plex Mono, ui-monospace, monospace',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const;

export const confidenceSignal = {
  high: colors.signal.healthy,
  medium: colors.signal.warning,
  low: colors.signal.critical,
} as const;

export const coverageSignal = {
  strong: colors.signal.healthy,
  sufficient: colors.signal.info,
  sparse: colors.signal.warning,
  absent: colors.signal.critical,
} as const;

export const readinessSignal = {
  ready: colors.signal.healthy,
  partial: colors.signal.warning,
  insufficient: colors.signal.critical,
  no_audit: colors.signal.neutral,
} as const;

export const recencySignal = {
  current: colors.signal.healthy,
  aging: colors.signal.warning,
  stale: colors.signal.critical,
} as const;
