import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.tabItem}>
      <Text
        style={[
          styles.tabIcon,
          { color: focused ? colors.primary : colors.outlineVariant },
        ]}
      >
        {icon}
      </Text>
      <Text
        style={[
          styles.tabLabel,
          {
            color: focused ? colors.primary : colors.outlineVariant,
            fontFamily: 'SpaceGrotesk_700Bold',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(14,14,14,0.92)' : 'rgba(246,246,246,0.92)',
          borderTopColor: isDark ? 'rgba(72,72,71,0.15)' : 'rgba(172,173,173,0.2)',
          borderTopWidth: StyleSheet.hairlineWidth,
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
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, color: focused ? colors.primary : colors.outlineVariant }}>
              📋
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t('tab_workout'),
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, color: focused ? colors.primary : colors.outlineVariant }}>
              💪
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('tab_library'),
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, color: focused ? colors.primary : colors.outlineVariant }}>
              📚
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tab_history'),
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, color: focused ? colors.primary : colors.outlineVariant }}>
              📊
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab_settings'),
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, color: focused ? colors.primary : colors.outlineVariant }}>
              ⚙️
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
