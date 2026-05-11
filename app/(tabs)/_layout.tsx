import { Tabs, useRouter, usePathname } from 'expo-router';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  useAnimatedProps,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/appStore';
import { GradientFAB } from '../../src/components/ios';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';

const TAB_BAR_HEIGHT = 56;

interface TabDef {
  name: string;
  labelKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconFocused: React.ComponentProps<typeof Ionicons>['name'];
}

const TABS: TabDef[] = [
  { name: 'index', labelKey: 'tab_today', icon: 'today-outline', iconFocused: 'today' },
  { name: 'library', labelKey: 'tab_train', icon: 'barbell-outline', iconFocused: 'barbell' },
  { name: 'history', labelKey: 'tab_insights', icon: 'pulse-outline', iconFocused: 'pulse' },
  { name: 'settings', labelKey: 'tab_profile', icon: 'person-circle-outline', iconFocused: 'person-circle' },
];

function TabIcon({
  focused,
  icon,
  iconFocused,
  color,
}: {
  focused: boolean;
  icon: any;
  iconFocused: any;
  color: string;
}) {
  const scale = useSharedValue(focused ? 1.1 : 1);
  useEffect(() => {
    scale.value = withSpring(focused ? 1.12 : 1, { damping: 14, stiffness: 240 });
  }, [focused]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={focused ? iconFocused : icon} size={26} color={color} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t, fontBold } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const activeWorkout = useAppStore((s) => s.activeWorkout);
  const startEmptyWorkout = useAppStore((s) => s.startEmptyWorkout);

  const isWorkoutModalOpen = pathname === '/active-workout';
  const showNowTrainingBar = Boolean(activeWorkout) && !isWorkoutModalOpen;

  const handleFAB = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeWorkout) {
      router.push('/active-workout');
      return;
    }
    startEmptyWorkout();
    router.push('/active-workout');
  };

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
        tabBar={({ state, navigation }) => {
          const left = TABS.slice(0, 2);
          const right = TABS.slice(2);
          const renderTab = (tab: TabDef) => {
            const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
            const focused = state.index === routeIndex;
            const tint = focused ? colors.primary : colors.onSurfaceVariant;
            return (
              <Pressable
                key={tab.name}
                onPress={() => {
                  Haptics.selectionAsync();
                  navigation.navigate(tab.name as never);
                }}
                style={styles.tabButton}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
              >
                <TabIcon focused={focused} icon={tab.icon} iconFocused={tab.iconFocused} color={tint} />
                <Text style={[styles.tabLabel, { color: tint, fontFamily: fontBold }]}>{t(tab.labelKey as any)}</Text>
              </Pressable>
            );
          };

          return (
            <View
              style={[styles.tabBarWrap, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}
              pointerEvents="box-none"
            >
              <View
                style={[
                  styles.tabBarTrack,
                  {
                    backgroundColor: colors.glassFill,
                    borderColor: colors.separator,
                    height: TAB_BAR_HEIGHT,
                  },
                ]}
              >
                {left.map(renderTab)}
                <View style={styles.fabSlot} />
                {right.map(renderTab)}
              </View>
              <View
                style={[
                  styles.fabOverlay,
                  { bottom: (insets.bottom > 0 ? insets.bottom : 10) + TAB_BAR_HEIGHT - 30 },
                ]}
                pointerEvents="box-none"
              >
                <GradientFAB
                  onPress={handleFAB}
                  icon={activeWorkout ? 'flash' : 'add'}
                  size={62}
                  label={t((activeWorkout ? 'resume' : 'tab_start') as any)}
                />
              </View>
            </View>
          );
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="library" />
        <Tabs.Screen name="history" />
        <Tabs.Screen name="settings" />
        <Tabs.Screen name="workout" options={{ href: null }} />
      </Tabs>

      {showNowTrainingBar && (
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(220)}
          style={[
            styles.nowTraining,
            {
              bottom: insets.bottom + TAB_BAR_HEIGHT + 48,
              backgroundColor: colors.surfaceContainerHigh,
              borderColor: colors.separator,
            },
          ]}
        >
          <Pressable style={styles.nowTrainingInner} onPress={() => router.push('/active-workout')}>
            <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.nowTrainingText, { color: colors.onSurface, fontFamily: fontBold }]}>
              {t('now_training')}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.resumeText, { color: colors.primary, fontFamily: fontBold }]}>{t('resume')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    alignItems: 'stretch',
  },
  tabBarTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: 6,
  },
  tabButton: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 10, letterSpacing: 0.4 },
  fabSlot: { width: 72 },
  fabOverlay: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  nowTraining: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  nowTrainingInner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  nowTrainingText: { fontSize: 13 },
  resumeText: { fontSize: 13 },
});
