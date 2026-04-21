import { Tabs } from 'expo-router';
import { usePathname, useRouter } from 'expo-router';
import { Platform, StyleSheet, View, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/appStore';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const { t, isRTL, fontBold } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const activeWorkout = useAppStore((s) => s.activeWorkout);

  const isWorkoutModalOpen = pathname === '/active-workout';
  const showNowTrainingBar = Boolean(activeWorkout) && !isWorkoutModalOpen;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTransparent: false,
          headerStyle: {
            backgroundColor: colors.surfaceContainerHighest,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
          },
          headerTitleStyle: {
            fontFamily: 'SpaceGrotesk_700Bold',
            fontSize: 22,
            letterSpacing: -0.5,
          },
          tabBarStyle: {
            backgroundColor: isDark ? 'rgba(14,18,14,0.94)' : 'rgba(255,255,255,0.94)',
            borderTopColor: isDark ? 'rgba(61,90,61,0.3)' : 'rgba(34,197,94,0.2)',
            borderTopWidth: 1,
            height: 70 + insets.bottom + (showNowTrainingBar ? 52 : 0),
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
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
          },
          lazy: false,
          tabBarBackground: () => (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: isDark ? 'rgba(12,16,12,0.82)' : 'rgba(252,255,252,0.82)',
                borderTopWidth: 1,
                borderTopColor: isDark ? 'rgba(95,126,95,0.25)' : 'rgba(64,96,64,0.12)',
              }}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tab_home'),
            headerShown: true,
            tabBarIcon: ({ focused, color }) => (
              <MaterialIcons name="assignment" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: t('tab_library'),
            headerShown: true,
            tabBarIcon: ({ focused, color }) => (
              <MaterialIcons name="menu-book" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t('tab_history'),
            headerShown: true,
            tabBarIcon: ({ focused, color }) => (
              <MaterialIcons name="bar-chart" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tab_settings'),
            headerShown: true,
            tabBarIcon: ({ focused, color }) => (
              <MaterialIcons name="tune" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            href: null,
          }}
        />
      </Tabs>
      {showNowTrainingBar && (
        <Animated.View
          entering={SlideInDown.duration(350).damping(18).springify()}
          exiting={SlideOutDown.duration(250)}
          style={[
            styles.nowTrainingContainer,
            {
              bottom: 58 + insets.bottom,
              backgroundColor: isDark ? 'rgba(22,30,22,0.9)' : 'rgba(246,253,244,0.92)',
              borderColor: isDark ? 'rgba(117,154,117,0.32)' : 'rgba(65,102,65,0.16)',
            },
          ]}
        >
          <AnimatedPressable
            style={styles.nowTrainingInner}
            onPress={() => router.push('/active-workout')}
          >
            <MaterialIcons name="fitness-center" size={16} color={colors.primary} />
            <Text style={[styles.nowTrainingText, { color: colors.onSurface, fontFamily: fontBold }]}>
              {t('now_training')}
            </Text>
            <View style={styles.nowTrainingSpacer} />
            <Text style={[styles.resumeText, { color: colors.primary, fontFamily: fontBold }]}>
              {t('resume')}
            </Text>
          </AnimatedPressable>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  nowTrainingContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  nowTrainingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  nowTrainingText: {
    fontSize: 13,
  },
  nowTrainingSpacer: {
    flex: 1,
  },
  resumeText: {
    fontSize: 13,
  },
});
