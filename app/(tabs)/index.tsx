import { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ScreenBackground } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import { SearchBox } from '../../src/components/SearchBox';
import { SessionCard } from '../../src/components/SessionCard';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { formatVolume } from '../../src/utils/helpers';
import type { WorkoutTemplate } from '../../src/types';

function toISODate(date: Date) {
  return date.toISOString().split('T')[0];
}

function fromISODate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function buildLast30DaysVolume(sessions: ReturnType<typeof useAppStore.getState>['sessions']) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(start.getDate() - 29);

  const byDay = new Map<string, { totalVolume: number }>();

  for (const session of sessions) {
    const sessionDate = fromISODate(session.date);
    if (sessionDate < start || sessionDate > now) {
      continue;
    }

    const sessionVolume =
      session.totalVolume ??
      session.exercises.reduce((sum, exercise) => {
        for (const set of exercise.sets) {
          if (set.isCompleted && set.weight && set.reps) {
            sum += set.weight * set.reps;
          }
        }
        return sum;
      }, 0);

    const current = byDay.get(session.date) ?? { totalVolume: 0 };
    current.totalVolume += sessionVolume;
    byDay.set(session.date, current);
  }

  const activeDays = Array.from(byDay.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([date, stats]) => ({
      date,
      label: `${fromISODate(date).getMonth() + 1}/${fromISODate(date).getDate()}`,
      value: Number(stats.totalVolume.toFixed(1)),
    }));

  if (activeDays.length > 0) {
    return activeDays;
  }

  const coldStartDays: Array<{ date: string; label: string; value: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    coldStartDays.push({
      date: toISODate(d),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      value: 0,
    });
  }

  return coldStartDays;
}

function getCompletedWorkoutsInCurrentWeek(sessions: ReturnType<typeof useAppStore.getState>['sessions']) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  const mondayOffset = (now.getDay() + 6) % 7;
  startOfWeek.setDate(now.getDate() - mondayOffset);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return sessions.filter((session) => {
    const sessionDate = fromISODate(session.date);
    return sessionDate >= startOfWeek && sessionDate <= endOfWeek;
  }).length;
}

function TemplateCard({
  template,
  onStart,
  onEdit,
  onDelete,
}: {
  onStart: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { colors } = useTheme();
  const { t, isRTL, fontBold, fontRegular } = useTranslation();

  const totalSets = template.exercises.reduce((sum, item) => sum + item.sets, 0);

  const renderDeleteAction = () => (
    <RectButton
      style={[styles.swipeDeleteAction, { backgroundColor: colors.error }]}
      onPress={() => onDelete(template.id)}
      accessibilityRole="button"
      accessibilityLabel={t('delete')}
    >
      <MaterialIcons name="delete" size={18} color={colors.onError} />
      <Text style={[styles.swipeDeleteText, { color: colors.onError, fontFamily: fontBold }]}>{t('delete')}</Text>
    </RectButton>
  );

  return (
    <Swipeable
      overshootLeft={false}
      overshootRight={false}
      {...(isRTL
        ? { renderLeftActions: renderDeleteAction }
        : { renderRightActions: renderDeleteAction })}
    >
      <View style={[styles.templateCard, { backgroundColor: colors.surfaceContainerLow }]}>
        <View style={[styles.templateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.templateTitle,
                { color: colors.onSurface, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {template.name}
            </Text>
            <Text
              style={[
                styles.templateMeta,
                { color: colors.onSurfaceVariant, fontFamily: fontRegular, textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {template.exercises.length} {t('template_exercises')} · {totalSets} {t('template_total_sets')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => onEdit(template.id)}
            accessibilityRole="button"
            accessibilityLabel={t('edit')}
          >
            <MaterialIcons name="more-horiz" size={22} color={colors.outlineVariant} />
          </TouchableOpacity>
        </View>

        <AnimatedPressable
          style={[styles.startBtn, { backgroundColor: colors.primaryContainer }]}
          onPress={() => onStart(template.id)}
          haptic
        >
          <MaterialIcons name="play-arrow" size={18} color={colors.onPrimaryContainer} />
          <Text style={[styles.startBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
            {t('start')}
          </Text>
        </AnimatedPressable>
      </View>
    </Swipeable>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t, isRTL, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const templates = useAppStore((s) => s.templates);
  const sessions = useAppStore((s) => s.sessions);
  const weeklyGoal = useAppStore((s) => s.weeklyGoal);
  const setWeeklyGoal = useAppStore((s) => s.setWeeklyGoal);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);
  const startWorkoutFromTemplate = useAppStore((s) => s.startWorkoutFromTemplate);
  const startEmptyWorkout = useAppStore((s) => s.startEmptyWorkout);
  const startWorkoutFromSession = useAppStore((s) => s.startWorkoutFromSession);

  const [search, setSearch] = useState('');

  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.name.toLowerCase().includes(search.toLowerCase())),
    [templates, search]
  );

  const volumeData = useMemo(() => buildLast30DaysVolume(sessions), [sessions]);
  const averageVolume = useMemo(() => {
    if (volumeData.length === 0) return 0;
    const total = volumeData.reduce((sum, point) => sum + point.value, 0);
    return Number((total / volumeData.length).toFixed(1));
  }, [volumeData]);

  const completedWorkoutsThisWeek = useMemo(() => getCompletedWorkoutsInCurrentWeek(sessions), [sessions]);
  const weeklyProgress = useMemo(
    () => (weeklyGoal > 0 ? completedWorkoutsThisWeek / weeklyGoal : 0),
    [completedWorkoutsThisWeek, weeklyGoal]
  );
  const weeklyProgressPercent = Math.round(weeklyProgress * 100);
  const clampedWeeklyProgress = Math.max(0, Math.min(1, weeklyProgress));

  const ringSize = 120;
  const ringStroke = 10;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - clampedWeeklyProgress);

  const chartHeight = 160;
  const chartWidth = 340;
  const chartTop = 12;
  const chartRight = 12;
  const chartBottom = 30;
  const chartLeft = 30;
  const graphWidth = chartWidth - chartLeft - chartRight;
  const graphHeight = chartHeight - chartTop - chartBottom;

  const maxY = Math.max(10, averageVolume, ...volumeData.map((point) => point.value));
  const yTicks = [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY];

  const xAt = (index: number) =>
    chartLeft + (volumeData.length > 1 ? (index / (volumeData.length - 1)) * graphWidth : graphWidth / 2);
  const yAt = (value: number) => chartTop + graphHeight - (value / maxY) * graphHeight;

  const linePath = volumeData
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index)} ${yAt(point.value)}`)
    .join(' ');

  const showTemplateOptions = useCallback(
    (templateId: string) => {
      const onDelete = () => {
        Alert.alert(t('delete'), t('delete_template_confirm'), [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: () => deleteTemplate(templateId),
          },
        ]);
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [t('cancel'), t('edit'), t('delete')],
            cancelButtonIndex: 0,
            destructiveButtonIndex: 2,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              router.push(`/edit-template?id=${templateId}`);
            }
            if (buttonIndex === 2) {
              onDelete();
            }
          }
        );
      } else {
        Alert.alert(t('edit_template'), '', [
          { text: t('cancel'), style: 'cancel' },
          { text: t('edit'), onPress: () => router.push(`/edit-template?id=${templateId}`) },
          { text: t('delete'), style: 'destructive', onPress: onDelete },
        ]);
      }
    },
    [deleteTemplate, router, t]
  );

  const confirmDeleteTemplate = useCallback(
    (templateId: string) => {
      Alert.alert(t('delete'), t('delete_template_confirm'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => deleteTemplate(templateId),
        },
      ]);
    },
    [deleteTemplate, t]
  );

  const handleStartFromTemplate = useCallback(
    (templateId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startWorkoutFromTemplate(templateId);
      router.push('/active-workout');
    },
    [startWorkoutFromTemplate, router]
  );

  const handleStartEmpty = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    startEmptyWorkout();
    router.push('/active-workout');
  }, [startEmptyWorkout, router]);

  const handleRepeat = useCallback(
    (sessionId: string) => {
      startWorkoutFromSession(sessionId);
      router.push('/active-workout');
    },
    [startWorkoutFromSession, router]
  );

  return (
    <ScreenBackground style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        <Animated.View
          entering={FadeInDown.duration(400).delay(0).damping(20).springify()}
          style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <Text
            style={[
              styles.title,
              { color: colors.onSurface, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t('tab_home')}
          </Text>
          <AnimatedPressable
            onPress={handleStartEmpty}
            haptic
            style={[
              styles.emptyWorkoutBtn,
              {
                backgroundColor: colors.primaryContainer,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <MaterialIcons name="add" size={16} color={colors.onPrimaryContainer} />
            <Text
              style={[
                styles.emptyWorkoutBtnText,
                { color: colors.onPrimaryContainer, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {t('start_empty_workout')}
            </Text>
          </AnimatedPressable>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(450).delay(80).damping(18).springify()}
          style={[
            styles.dashboardWidget,
            {
              backgroundColor: colors.surfaceContainerLow,
              borderColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
        >
          <View style={[styles.dashboardSections, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.weeklySection}>
              <Text
                style={[
                  styles.widgetSectionTitle,
                  { color: colors.onSurface, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t('weekly_goal')}
              </Text>

              <View style={styles.progressRingWrap}>
                <Svg width={ringSize} height={ringSize}>
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke={colors.outlineVariant}
                    strokeWidth={ringStroke}
                    fill="none"
                  />
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke={colors.primary}
                    strokeWidth={ringStroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                    strokeDashoffset={ringOffset}
                    originX={ringSize / 2}
                    originY={ringSize / 2}
                    rotation={-90}
                  />
                </Svg>
                <View style={styles.progressRingCenter}>
                  <Text style={[styles.progressPercent, { color: colors.primary, fontFamily: fontBold }]}>
                    {weeklyProgressPercent}%
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.widgetSectionSubtitle,
                  { color: colors.onSurfaceVariant, fontFamily: fontRegular, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {`${weeklyProgressPercent}% | ${completedWorkoutsThisWeek}/${weeklyGoal} ${t('workouts_unit')}`}
              </Text>

              <View style={[styles.goalAdjustRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.goalAdjustBtn, { borderColor: colors.outlineVariant }]}
                  onPress={() => setWeeklyGoal(weeklyGoal - 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease weekly goal"
                >
                  <MaterialIcons name="remove" size={16} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.goalAdjustText, { color: colors.onSurface, fontFamily: fontBold }]}>
                  {weeklyGoal} {t('workouts_unit')}
                </Text>
                <TouchableOpacity
                  style={[styles.goalAdjustBtn, { borderColor: colors.outlineVariant }]}
                  onPress={() => setWeeklyGoal(weeklyGoal + 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Increase weekly goal"
                >
                  <MaterialIcons name="add" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.sectionDivider, { backgroundColor: colors.outlineVariant }]} />

            <View style={styles.volumeSection}>
              <Text
                style={[
                  styles.widgetSectionTitle,
                  { color: colors.onSurface, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t('volume_progress')}
              </Text>

              <View style={[styles.volumeMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.widgetSectionSubtitle, { color: colors.onSurfaceVariant, fontFamily: fontRegular }]}>
                  {t('last_30_days')}
                </Text>
                <Text style={[styles.widgetSectionSubtitle, { color: colors.onSurfaceVariant, fontFamily: fontRegular }]}>
                  {`${t('average_label')}: ${formatVolume(averageVolume)}Kg`}
                </Text>
              </View>

              <View style={styles.customChartWrap}>
                <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  {yTicks.map((tick) => (
                    <Line
                      key={`grid-${tick}`}
                      x1={chartLeft}
                      y1={yAt(tick)}
                      x2={chartWidth - chartRight}
                      y2={yAt(tick)}
                      stroke={colors.outlineVariant}
                      strokeOpacity={0.35}
                      strokeWidth={1}
                    />
                  ))}

                  <Line
                    x1={chartLeft}
                    y1={yAt(averageVolume)}
                    x2={chartWidth - chartRight}
                    y2={yAt(averageVolume)}
                    stroke={colors.primary}
                    strokeOpacity={0.8}
                    strokeWidth={1.5}
                    strokeDasharray="6 5"
                  />

                  <Line
                    x1={chartLeft}
                    y1={chartTop}
                    x2={chartLeft}
                    y2={chartHeight - chartBottom}
                    stroke={colors.outline}
                    strokeWidth={1}
                  />
                  <Line
                    x1={chartLeft}
                    y1={chartHeight - chartBottom}
                    x2={chartWidth - chartRight}
                    y2={chartHeight - chartBottom}
                    stroke={colors.outline}
                    strokeWidth={1}
                  />

                  {linePath.length > 0 ? (
                    <Path d={linePath} stroke={colors.primary} strokeWidth={3} fill="none" strokeLinecap="round" />
                  ) : null}

                  {volumeData.map((point, index) => (
                    <Circle
                      key={`point-${point.date}`}
                      cx={xAt(index)}
                      cy={yAt(point.value)}
                      r={3.5}
                      fill={colors.primary}
                    />
                  ))}

                  {yTicks.map((tick) => (
                    <SvgText
                      key={`y-${tick}`}
                      x={chartLeft - 6}
                      y={yAt(tick) + 4}
                      fill={colors.onSurfaceVariant}
                      fontSize="10"
                      textAnchor="end"
                    >
                      {tick.toFixed(1)}
                    </SvgText>
                  ))}

                  {volumeData.map((point, index) => (
                    <SvgText
                      key={`x-${point.date}`}
                      x={xAt(index)}
                      y={chartHeight - 10}
                      fill={colors.onSurfaceVariant}
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {point.label}
                    </SvgText>
                  ))}
                </Svg>
              </View>
            </View>
          </View>
        </Animated.View>

        <SearchBox value={search} onChangeText={setSearch} placeholder={t('templates_search')} />

        <AnimatedPressable
          style={[
            styles.createTemplateBtn,
            {
              backgroundColor: colors.surfaceContainerHighest,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => router.push('/create-template')}
        >
          <MaterialIcons name="post-add" size={18} color={colors.primary} />
          <Text
            style={[
              styles.createTemplateBtnText,
              { color: colors.primary, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t('create_template')}
          </Text>
        </AnimatedPressable>

        {filteredTemplates.map((template, index) => (
          <Animated.View
            key={template.id}
            entering={FadeInDown.duration(350).delay(150 + index * 50).damping(20).springify()}
          >
            <TemplateCard
              template={template}
              onStart={handleStartFromTemplate}
              onEdit={showTemplateOptions}
              onDelete={confirmDeleteTemplate}
            />
          </Animated.View>
        ))}

        <View style={[styles.historyHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text
            style={[
              styles.historyTitle,
              { color: colors.onSurface, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t('recent_workouts')}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text
              style={[
                styles.seeAllBtn,
                { color: colors.primary, fontFamily: fontBold, textAlign: isRTL ? 'left' : 'right' },
              ]}
            >
              {t('see_all')}
            </Text>
          </TouchableOpacity>
        </View>

        {sessions.slice(0, 3).map((session, index) => (
          <Animated.View
            key={session.id}
            entering={FadeInDown.duration(350).delay(250 + index * 60).damping(20).springify()}
          >
            <SessionCard session={session} onRepeat={handleRepeat} />
          </Animated.View>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  title: {
    fontSize: 34,
  },
  emptyWorkoutBtn: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyWorkoutBtnText: {
    fontSize: 12,
  },
  dashboardWidget: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 9,
  },
  dashboardSections: {
    alignItems: 'stretch',
  },
  weeklySection: {
    flex: 0.9,
    paddingHorizontal: 6,
  },
  volumeSection: {
    flex: 1.6,
    paddingHorizontal: 8,
  },
  sectionDivider: {
    width: 1,
    borderRadius: 1,
    opacity: 0.7,
  },
  widgetSectionTitle: {
    fontSize: 16,
  },
  widgetSectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  progressRingWrap: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  progressRingCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 24,
  },
  goalAdjustRow: {
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  goalAdjustBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalAdjustText: {
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'center',
  },
  volumeMetaRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customChartWrap: {
    marginTop: 8,
    height: 160,
  },
  createTemplateBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  createTemplateBtnText: {
    fontSize: 13,
  },
  templateCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateTitle: {
    fontSize: 17,
  },
  templateMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  startBtnText: {
    fontSize: 13,
  },
  historyHeaderRow: {
    marginTop: 16,
    marginBottom: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 22,
  },
  seeAllBtn: {
    fontSize: 13,
  },
  swipeDeleteAction: {
    width: 84,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  swipeDeleteText: {
    fontSize: 10,
  },
});