/**
 * Insights — overview KPIs, volume chart, personal records, achievements grid.
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ScreenBackground, tokens } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import {
  Card,
  ListRow,
  SectionHeader,
  LargeTitle,
  StatTile,
  SegmentedControl,
} from '../../src/components/ios';
import {
  computePersonalRecords,
  sessionsPerDay,
  computeStreak,
} from '../../src/utils/algorithms';
import { achievements as achievementCatalog } from '../../src/data/achievements';
import { getExerciseName } from '../../src/utils/helpers';
import { formatWeight, formatWeightCompact, weightUnitLabel } from '../../src/utils/units';

type Range = '30' | '90' | '365' | 'all';

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [range, setRange] = useState<Range>('30');

  const sessions = useAppStore((s) => s.sessions);
  const exercises = useAppStore((s) => s.exercises);
  const units = useAppStore((s) => s.units);
  const unlockedAchievements = useAppStore((s) => s.unlockedAchievements);
  const deleteSession = useAppStore((s) => s.deleteSession);

  const records = useMemo(() => computePersonalRecords(sessions), [sessions]);

  const totals = useMemo(() => {
    const total = sessions.length;
    const totalVolume = sessions.reduce((s, x) => s + (x.totalVolume ?? 0), 0);
    const totalDuration = sessions.reduce((s, x) => s + (x.durationMinutes ?? 0), 0);
    const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;
    return { total, totalVolume, avgDuration };
  }, [sessions]);

  const days = range === 'all' ? 365 : Number(range);
  const series = useMemo(() => sessionsPerDay(sessions, days), [sessions, days]);

  const recordList = useMemo(() => {
    return Object.values(records)
      .sort((a, b) => b.estimated1RM - a.estimated1RM)
      .slice(0, 6);
  }, [records]);

  const unlockedSet = useMemo(() => new Set(unlockedAchievements.map((a) => a.id)), [unlockedAchievements]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert(t('delete'), t('delete_session_confirm'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteSession(id) },
      ]);
    },
    [deleteSession, t]
  );

  const handleOpenSession = useCallback(
    (id: string) => {
      router.push(`/session-detail?id=${id}` as any);
    },
    [router]
  );

  return (
    <ScreenBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 140,
          paddingHorizontal: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <LargeTitle title={t('insights_title')} />

        {/* ─── Overview ──────────────────────────────────────────── */}
        <SectionHeader title={t('overview')} />
        <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
          <StatTile
            label={t('total_workouts')}
            value={String(totals.total)}
            icon="trophy"
          />
          <StatTile
            label={t('total_lifetime_volume')}
            value={`${formatWeightCompact(totals.totalVolume, units)} ${weightUnitLabel(units)}`}
            icon="barbell"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
          <StatTile
            label={t('avg_duration')}
            value={`${totals.avgDuration} ${t('minutes')}`}
            icon="time"
          />
          <StatTile
            label={t('current_streak')}
            value={String(computeStreak(sessions).currentWeeks)}
            caption={t('weeks_unit')}
            icon="flame"
            tint={colors.tertiary}
          />
        </View>

        {/* ─── Volume chart ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.springify()}>
          <SectionHeader
            title={t('volume_over_time')}
            trailing={
              <SegmentedControl<Range>
                value={range}
                onChange={setRange}
                segments={[
                  { value: '30', label: t('last_30') },
                  { value: '90', label: t('last_90') },
                  { value: '365', label: t('last_year') },
                ]}
                style={{ width: 220 }}
              />
            }
          />
          <Card>
            <VolumeChart data={series} />
          </Card>
        </Animated.View>

        {/* ─── Records ───────────────────────────────────────────── */}
        <SectionHeader title={t('records')} />
        <Card style={{ padding: 0 }}>
          {recordList.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
              <Ionicons name="trophy-outline" size={32} color={colors.outline} />
              <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 13, textAlign: 'center' }}>
                {t('no_records_yet')}
              </Text>
            </View>
          ) : (
            recordList.map((r, i) => {
              const ex = exercises.find((e) => e.id === r.exerciseId);
              return (
                <ListRow
                  key={r.exerciseId}
                  title={ex ? getExerciseName(ex, t, language) : r.exerciseId}
                  subtitle={`${t('estimated_1rm')}: ${formatWeight(r.estimated1RM, units)} · ${formatWeight(r.bestWeight, units)} × ${r.bestReps}`}
                  separator={i < recordList.length - 1}
                  leading={
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16 }}>🥇</Text>
                    </View>
                  }
                  value={formatWeight(r.bestWeight, units)}
                />
              );
            })
          )}
        </Card>

        {/* ─── Achievements ──────────────────────────────────────── */}
        <SectionHeader
          title={t('achievements')}
          trailing={
            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontBold, fontSize: 12 }}>
              {unlockedAchievements.length}/{achievementCatalog.length}
            </Text>
          }
        />
        <Card style={{ padding: tokens.spacing.md }}>
          <View style={styles.achGrid}>
            {achievementCatalog.map((a) => {
              const unlocked = unlockedSet.has(a.id);
              return (
                <View
                  key={a.id}
                  style={[
                    styles.achTile,
                    {
                      backgroundColor: unlocked ? colors.primaryContainer : colors.fillTertiary,
                      opacity: unlocked ? 1 : 0.5,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 28, opacity: unlocked ? 1 : 0.4 }}>{a.emoji}</Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: unlocked ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                      fontFamily: fontBold,
                      fontSize: 11,
                      textAlign: 'center',
                      marginTop: 4,
                    }}
                  >
                    {t(a.titleKey as any)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* ─── Recent sessions ───────────────────────────────────── */}
        {sessions.length > 0 ? (
          <>
            <SectionHeader title={t('recent_workouts')} />
            <Card style={{ padding: 0 }}>
              {sessions.slice(0, 8).map((s, i) => (
                <ListRow
                  key={s.id}
                  title={s.name}
                  subtitle={`${s.date} · ${s.durationMinutes ?? 0} ${t('minutes')}`}
                  value={`${formatWeightCompact(s.totalVolume ?? 0, units)} ${weightUnitLabel(units)}`}
                  separator={i < Math.min(7, sessions.length - 1)}
                  onPress={() => handleOpenSession(s.id)}
                  rightAccessory={
                    <Pressable onPress={() => handleDelete(s.id)} hitSlop={10} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.outline} />
                    </Pressable>
                  }
                />
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

// ─── Volume chart (lightweight inline SVG line+area) ─────────────────────
function VolumeChart({ data }: { data: Array<{ date: string; count: number; volume: number }> }) {
  const { colors } = useTheme();
  const { fontRegular } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  // Screen − page padding (16×2) − card padding (16×2)
  const width = Math.max(240, windowWidth - tokens.spacing.lg * 4);
  const height = 160;
  const padX = 8;
  const padY = 16;
  const max = Math.max(1, ...data.map((d) => d.volume));
  const xAt = (i: number) => padX + (i / Math.max(1, data.length - 1)) * (width - padX * 2);
  const yAt = (v: number) => padY + (1 - v / max) * (height - padY * 2);

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(d.volume).toFixed(1)}`)
    .join(' ');
  const areaPath =
    `${linePath} L ${xAt(data.length - 1).toFixed(1)} ${(height - padY).toFixed(1)} ` +
    `L ${xAt(0).toFixed(1)} ${(height - padY).toFixed(1)} Z`;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.32" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
          </SvgGradient>
        </Defs>
        <Path d={areaPath} fill="url(#volGrad)" />
        <Path d={linePath} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          if (d.volume === 0) return null;
          return (
            <Circle key={d.date} cx={xAt(i)} cy={yAt(d.volume)} r={2.5} fill={colors.primary} />
          );
        })}
      </Svg>
      <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 11, marginTop: 6 }}>
        {data[0]?.date} → {data[data.length - 1]?.date}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  achGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});
