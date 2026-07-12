/**
 * "Volt on Obsidian" design system.
 *
 * Three athletic accents (volt lime / iris violet / ember orange), each defining
 * its own contrast-correct onPrimary and a `glow` used for shadows and halos.
 * Dark mode is OLED true-black with cards lifted by a top-light hairline border.
 */
export const accentColors = {
  green: {
    dark: {
      primary: '#A3E635',
      primaryDim: '#84CC16',
      primaryContainer: '#1F2E0A',
      onPrimary: '#0C1202',
      onPrimaryContainer: '#D9F99D',
      surfaceTint: '#A3E635',
      glow: 'rgba(163,230,53,0.35)',
    },
    light: {
      primary: '#4D7C0F',
      primaryDim: '#3F6212',
      primaryContainer: '#ECFCCB',
      onPrimary: '#FFFFFF',
      onPrimaryContainer: '#1A2E05',
      surfaceTint: '#4D7C0F',
      glow: 'rgba(77,124,15,0.25)',
    },
  },
  purple: {
    dark: {
      primary: '#A78BFA',
      primaryDim: '#8B5CF6',
      primaryContainer: '#2A1655',
      onPrimary: '#160A33',
      onPrimaryContainer: '#DDD6FE',
      surfaceTint: '#A78BFA',
      glow: 'rgba(167,139,250,0.35)',
    },
    light: {
      primary: '#6D28D9',
      primaryDim: '#5B21B6',
      primaryContainer: '#EDE9FE',
      onPrimary: '#FFFFFF',
      onPrimaryContainer: '#2E1065',
      surfaceTint: '#6D28D9',
      glow: 'rgba(109,40,217,0.25)',
    },
  },
  orange: {
    dark: {
      primary: '#FB923C',
      primaryDim: '#F97316',
      primaryContainer: '#3B1A07',
      onPrimary: '#2A0F00',
      onPrimaryContainer: '#FED7AA',
      surfaceTint: '#FB923C',
      glow: 'rgba(251,146,60,0.35)',
    },
    light: {
      primary: '#C2410C',
      primaryDim: '#9A3412',
      primaryContainer: '#FFEDD5',
      onPrimary: '#FFFFFF',
      onPrimaryContainer: '#431407',
      surfaceTint: '#C2410C',
      glow: 'rgba(194,65,12,0.25)',
    },
  },
};

/** OLED true-black dark mode. Cards are lifted plates, not gray rectangles. */
export const darkColors = {
  surface: '#000000',
  surfaceContainerLowest: '#000000',
  surfaceContainerLow: '#0C0C0E',
  surfaceContainer: '#161618',
  surfaceContainerHigh: '#232327',
  surfaceContainerHighest: '#2E2E33',
  surfaceBright: '#3A3A40',
  surfaceVariant: '#161618',
  background: '#000000',
  onSurface: '#F4F4F5',
  onSurfaceVariant: '#A1A1AA',
  onBackground: '#F4F4F5',
  ...accentColors.green.dark,
  secondary: '#38BDF8',
  secondaryDim: '#0EA5E9',
  secondaryContainer: '#082F49',
  onSecondary: '#03131F',
  onSecondaryContainer: '#BAE6FD',
  tertiary: '#FB7185',
  tertiaryDim: '#F43F5E',
  tertiaryContainer: '#3D0A16',
  onTertiary: '#2A030B',
  onTertiaryContainer: '#FECDD3',
  error: '#F87171',
  errorDim: '#DC2626',
  errorContainer: '#3B0A0A',
  onError: '#2A0505',
  onErrorContainer: '#FECACA',
  outline: '#52525B',
  outlineVariant: '#2E2E33',
  inverseSurface: '#F4F4F5',
  inverseOnSurface: '#0C0C0E',
  inversePrimary: '#4D7C0F',
  /** iOS-style hairline separator */
  separator: 'rgba(84,84,88,0.55)',
  /** Top-light hairline that lifts cards off true black */
  cardBorder: 'rgba(255,255,255,0.07)',
  /** Translucent fills for chrome (tab bar, sheets) */
  glassFill: 'rgba(22,22,24,0.86)',
  /** Inline input/chip neutral fill */
  fillTertiary: 'rgba(120,120,128,0.22)',
  fillSecondary: 'rgba(120,120,128,0.30)',
  gradientColors: ['#000000', '#0a0a0c'] as string[],
};

/** Light mode — same hierarchy, softened paper surfaces. */
export const lightColors = {
  surface: '#F2F2F7',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#FFFFFF',
  surfaceContainer: '#FFFFFF',
  surfaceContainerHigh: '#F2F2F7',
  surfaceContainerHighest: '#E4E4E9',
  surfaceBright: '#FFFFFF',
  surfaceVariant: '#E4E4E9',
  background: '#F2F2F7',
  onSurface: '#111113',
  onSurfaceVariant: '#4B4B53',
  onBackground: '#111113',
  ...accentColors.green.light,
  secondary: '#0284C7',
  secondaryDim: '#0369A1',
  secondaryContainer: '#E0F2FE',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#082F49',
  tertiary: '#E11D48',
  tertiaryDim: '#BE123C',
  tertiaryContainer: '#FFE4E6',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#4C0519',
  error: '#DC2626',
  errorDim: '#B91C1C',
  errorContainer: '#FEE2E2',
  onError: '#FFFFFF',
  onErrorContainer: '#450A0A',
  outline: '#C6C6CE',
  outlineVariant: '#E4E4E9',
  inverseSurface: '#111113',
  inverseOnSurface: '#F4F4F5',
  inversePrimary: '#A3E635',
  separator: 'rgba(60,60,67,0.16)',
  cardBorder: 'rgba(17,17,19,0.06)',
  glassFill: 'rgba(255,255,255,0.85)',
  fillTertiary: 'rgba(118,118,128,0.12)',
  fillSecondary: 'rgba(118,118,128,0.16)',
  gradientColors: ['#F2F2F7', '#FFFFFF'] as string[],
};

export type ThemeColors = typeof darkColors;
export type AccentColor = keyof typeof accentColors;

export function getColors(mode: 'dark' | 'light', accent: AccentColor): ThemeColors {
  const base = mode === 'dark' ? darkColors : lightColors;
  const accentPart = accentColors[accent][mode];
  return { ...base, ...accentPart };
}

/** Design tokens. */
export const tokens = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 },
  /** iOS-like type ramp + display sizes for data numerals */
  type: {
    displayXL: 48,
    display: 40,
    largeTitle: 34,
    title1: 28,
    title2: 22,
    title3: 20,
    headline: 17,
    body: 17,
    callout: 16,
    subhead: 15,
    footnote: 13,
    caption1: 12,
    caption2: 11,
  },
  /** Tabular figures for anything that ticks (timers, counters). */
  numeric: { fontVariant: ['tabular-nums'] as const },
  shadowSoft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  shadowMicro: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  /** Standard springs — one voice for all motion. */
  spring: { damping: 16, stiffness: 220 },
  springBouncy: { damping: 12, stiffness: 260 },
} as const;
