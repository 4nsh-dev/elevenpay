/**
 * ElevenPay design tokens — single source of truth, mirrors docs/ui-design.md.
 * Tailwind classes cover most styling; import these for imperative APIs
 * (gradients, animations, icon colors) so no hex ever appears inline.
 */

export const colors = {
  bg: {
    base: '#0B0F14',
    raised: '#11161D',
  },
  surface: {
    card: '#161B22',
    cardHover: '#1B212A',
    slate: '#1E293B',
    glass: 'rgba(22, 27, 34, 0.72)',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    strong: 'rgba(255, 255, 255, 0.12)',
  },
  brand: {
    primary: '#00C853',
    primaryPress: '#00B04A',
    primarySoft: 'rgba(0, 200, 83, 0.12)',
  },
  accent: {
    /** Wins, prizes, rewards ONLY — never buttons, never decoration. */
    gold: '#FFD54F',
    goldSoft: 'rgba(255, 213, 79, 0.14)',
  },
  state: {
    success: '#00E676',
    error: '#FF5252',
    warning: '#FFB300',
    pending: '#64B5F6',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    tertiary: '#5B6878',
    onPrimary: '#04110A',
    positive: '#00E676',
  },
} as const;

export const gradients = {
  hero: ['#0E2A1D', '#0B0F14'] as const,
  gold: ['#FFD54F', '#FFB300'] as const,
  pitch: ['rgba(0, 200, 83, 0.06)', 'transparent'] as const,
};

export const radius = {
  card: 24,
  button: 18,
  input: 16,
  sheet: 28,
  chip: 12,
} as const;

/** 8-point grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  gutter: 24,
  section: 32,
  hero: 48,
} as const;

export const motion = {
  /** ms */
  duration: { micro: 150, standard: 250, emphasis: 400, celebration: 1200 },
  spring: { damping: 18, stiffness: 220 },
} as const;

export const iconSize = {
  inline: 16,
  row: 20,
  nav: 24,
  feature: 32,
  emptyState: 64,
} as const;

export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 } as const;
