import React, { createContext, useContext } from 'react';
import { useColorScheme, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { darkColors, lightColors, type ThemeColors } from './colors';
import { useAppStore } from '../store/appStore';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  mode: 'dark',
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useAppStore((s) => s.themeMode);

  const mode: ThemeMode =
    themePreference === 'system'
      ? systemScheme === 'light'
        ? 'light'
        : 'dark'
      : themePreference;

  const colors = mode === 'dark' ? darkColors : lightColors;

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
  const { isDark } = useContext(ThemeContext);
  return (
    <LinearGradient
      colors={isDark ? ['#0e0e0e', '#07120a'] : ['#ffffff', '#f0fde4']}
      style={[{ flex: 1 }, style]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}
