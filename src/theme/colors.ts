export const accentColors = {
  green: {
    dark: {
      primary: '#32D74B',
      primaryDim: '#28A745',
      primaryContainer: '#1F3D24',
      onPrimary: '#FFFFFF',
      onPrimaryContainer: '#9CFFB1',
      surfaceTint: '#32D74B',
    },
    light: {
      primary: '#1FA02E',
      primaryDim: '#178224',
      primaryContainer: '#D7F8DC',
      onPrimary: '#FFFFFF',
      onPrimaryContainer: '#003B0E',
      surfaceTint: '#1FA02E',
    },
  },
  purple: {
    dark: {
      primary: '#BF5AF2',
      primaryDim: '#A347D9',
      primaryContainer: '#3B1A4E',
      onPrimary: '#FFFFFF',
      onPrimaryContainer: '#EBCCFF',
      surfaceTint: '#BF5AF2',
    },
    light: {
      primary: '#8B2BD1',
      primaryDim: '#6F1FAA',
      primaryContainer: '#F0DEFF',
      onPrimary: '#FFFFFF',
      onPrimaryContainer: '#2E1065',
      surfaceTint: '#8B2BD1',
    },
  },
  orange: {
    dark: {
      primary: '#FF9F0A',
      primaryDim: '#E58A00',
      primaryContainer: '#4D2E00',
      onPrimary: '#FFFFFF',
      onPrimaryContainer: '#FFE0B2',
      surfaceTint: '#FF9F0A',
    },
    light: {
      primary: '#E08500',
      primaryDim: '#B86A00',
      primaryContainer: '#FFE5C2',
      onPrimary: '#FFFFFF',
      onPrimaryContainer: '#3D1F00',
      surfaceTint: '#E08500',
    },
  },
};

/** iOS-inspired dark mode (OLED-friendly true black + system grays). */
export const darkColors = {
  surface: '#000000',
  surfaceContainerLowest: '#000000',
  surfaceContainerLow: '#0E0E10',
  surfaceContainer: '#1C1C1E',
  surfaceContainerHigh: '#2C2C2E',
  surfaceContainerHighest: '#3A3A3C',
  surfaceBright: '#48484A',
  surfaceVariant: '#1C1C1E',
  background: '#000000',
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#A8A8AD',
  onBackground: '#FFFFFF',
  ...accentColors.green.dark,
  secondary: '#0A84FF',
  secondaryDim: '#0070E0',
  secondaryContainer: '#0A2647',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#CFE8FF',
  tertiary: '#FF375F',
  tertiaryDim: '#E0244B',
  tertiaryContainer: '#3D0F1A',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#FFB8C8',
  error: '#FF453A',
  errorDim: '#D70015',
  errorContainer: '#3D0F0B',
  onError: '#FFFFFF',
  onErrorContainer: '#FFC9C4',
  outline: '#48484A',
  outlineVariant: '#2C2C2E',
  inverseSurface: '#FFFFFF',
  inverseOnSurface: '#000000',
  inversePrimary: '#1FA02E',
  /** iOS-style hairline separator */
  separator: 'rgba(84,84,88,0.6)',
  /** Translucent fills for chrome (tab bar, sheets) */
  glassFill: 'rgba(28,28,30,0.78)',
  /** Inline input/chip neutral fill */
  fillTertiary: 'rgba(118,118,128,0.24)',
  fillSecondary: 'rgba(118,118,128,0.32)',
  gradientColors: ['#000000', '#0a0a0c'] as string[],
};

/** iOS-inspired light mode (systemGroupedBackground + secondarySystemGroupedBackground). */
export const lightColors = {
  surface: '#F2F2F7',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#FFFFFF',
  surfaceContainer: '#FFFFFF',
  surfaceContainerHigh: '#F2F2F7',
  surfaceContainerHighest: '#E5E5EA',
  surfaceBright: '#FFFFFF',
  surfaceVariant: '#E5E5EA',
  background: '#F2F2F7',
  onSurface: '#000000',
  onSurfaceVariant: '#3C3C43',
  onBackground: '#000000',
  ...accentColors.green.light,
  secondary: '#007AFF',
  secondaryDim: '#005EC2',
  secondaryContainer: '#D6E9FF',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#001A40',
  tertiary: '#FF2D55',
  tertiaryDim: '#D70030',
  tertiaryContainer: '#FFD6DE',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#3D0010',
  error: '#FF3B30',
  errorDim: '#D70015',
  errorContainer: '#FFD6D2',
  onError: '#FFFFFF',
  onErrorContainer: '#3D0700',
  outline: '#C7C7CC',
  outlineVariant: '#E5E5EA',
  inverseSurface: '#000000',
  inverseOnSurface: '#FFFFFF',
  inversePrimary: '#32D74B',
  separator: 'rgba(60,60,67,0.18)',
  glassFill: 'rgba(255,255,255,0.78)',
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

/** Design tokens for the iOS-inspired system. */
export const tokens = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 },
  /** iOS-like type ramp using SF-spirit sizes */
  type: {
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
  shadowSoft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
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
} as const;

