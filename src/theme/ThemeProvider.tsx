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
    themePreference === 'light'
      ? 'light'
      : 'dark';

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
  const { colors } = useContext(ThemeContext);
  
  const gradientColors = useMemo(() => {
    // We use a slight variation of the surface/background colors for a subtle gradient
    // In light mode, this helps with the accent tinting
    return [colors.surface, colors.background];
  }, [colors.surface, colors.background]);

  return (
    <LinearGradient
      colors={gradientColors as any}
      style={[{ flex: 1 }, style]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}
