import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getColors, type ThemeColors } from './colors';
import { useAppStore } from '../store/appStore';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: getColors('dark', 'green'),
  mode: 'dark',
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useAppStore((s) => s.themeMode);
  const accentColor = useAppStore((s) => s.accentColor);

  const mode: ThemeMode =
    themePreference === 'system'
      ? systemScheme === 'light'
        ? 'light'
        : 'dark'
      : themePreference;

  const colors = useMemo(() => getColors(mode, accentColor), [mode, accentColor]);

  return (
    <ThemeContext.Provider value={{ colors, mode, isDark: mode === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ScreenBackground({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark, colors } = useContext(ThemeContext);
  
  const gradientColors = useMemo(() => {
    if (isDark) {
      return [colors.surface, colors.background];
    }
    return [colors.surface, colors.background];
  }, [isDark, colors.surface, colors.background]);

  return (
    <LinearGradient
      colors={gradientColors}
      style={[{ flex: 1 }, style]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}
