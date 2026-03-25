import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(14,18,14,0.94)' : 'rgba(255,255,255,0.94)',
          borderTopColor: isDark ? 'rgba(61,90,61,0.3)' : 'rgba(34,197,94,0.2)',
          borderTopWidth: 1,
          height: 70 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 4,
          ...(Platform.OS === 'ios' && {
            position: 'absolute' as const,
          }),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outlineVariant,
        tabBarLabelStyle: {
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_templates'),
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons name="assignment" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t('tab_workout'),
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons name="fitness-center" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('tab_library'),
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons name="menu-book" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tab_history'),
          href: null,
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons name="bar-chart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab_settings'),
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons name="tune" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});


