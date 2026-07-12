/**
 * Today — the home dashboard.
 *
 * Above-the-fold:
 *   - Personalized greeting + quick "next routine" card with one-tap start
 *   - Weekly goal ring + current streak
 *   - PR / achievement banners (if any)
 * Below:
 *   - Smart suggestions (auto-progression for last lifts)
 *   - Muscle-balance pill bars over last 14 days
 *   - Recent sessions
 */
import React, { useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, ScreenBackground, tokens } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import {
    Card,
    ListRow,
    PillButton,
    ProgressRing,
    StatTile,
    SectionHeader,
    LargeTitle,
    Badge,
} from '../../src/components/ios';
import { computeMuscleBalance, computeStreak, suggestProgression } from '../../src/utils/algorithms';
import { getExerciseName } from '../../src/utils/helpers';
import { formatWeight, formatWeightCompact, weightUnitLabel } from '../../src/utils/units';
import { bodyPartKeys, bodyPartNameKeys } from '../../src/data/exercises';
import { achievements as achievementCatalog } from '../../src/data/achievements';

function greetingKey(): 'good_morning' | 'good_afternoon' | 'good_evening' {
    const h = new Date().getHours();
    if (h < 12) return 'good_morning';
    if (h < 18) return 'good_afternoon';
    return 'good_evening';
}

function workoutsThisWeek(sessions: ReturnType<typeof useAppStore.getState>['sessions']): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return sessions.filter((s) => new Date(`${s.date}T00:00:00`) >= monday).length;
}

export default function TodayScreen() {
    const { colors } = useTheme();
    const { t, isRTL, fontBold, fontRegular } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const sessions = useAppStore((s) => s.sessions);
    const templates = useAppStore((s) => s.templates);
    const exercises = useAppStore((s) => s.exercises);
    const weeklyGoal = useAppStore((s) => s.weeklyGoal);
    const units = useAppStore((s) => s.units);
    const unlockedAchievements = useAppStore((s) => s.unlockedAchievements);
    const recentlyUnlocked = useAppStore((s) => s.recentlyUnlockedAchievements);
    const recentPRBanner = useAppStore((s) => s.recentPRBanner);
    const dismissPRBanner = useAppStore((s) => s.dismissPRBanner);
    const dismissAchievementBanner = useAppStore((s) => s.dismissAchievementBanner);
    const startEmptyWorkout = useAppStore((s) => s.startEmptyWorkout);
    const startWorkoutFromTemplate = useAppStore((s) => s.startWorkoutFromTemplate);

    const weekly = useMemo(() => workoutsThisWeek(sessions), [sessions]);
    const streak = useMemo(() => computeStreak(sessions), [sessions]);
    const muscleBalance = useMemo(
        () => computeMuscleBalance(sessions, exercises, 14),
        [sessions, exercises]
    );

    /** Suggest the next routine: most recent template that hasn't been used yet this week, fallback to most recent. */
    const nextRoutine = useMemo(() => {
        if (templates.length === 0) return null;
        const usedThisWeek = new Set(
            sessions
                .filter((s) => {
                    const d = new Date(`${s.date}T00:00:00`);
                    const monday = new Date();
                    monday.setHours(0, 0, 0, 0);
                    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
                    return d >= monday;
                })
                .map((s) => s.templateId)
                .filter(Boolean)
        );
        return templates.find((t) => !usedThisWeek.has(t.id)) ?? templates[0];
    }, [templates, sessions]);

    /** Top 3 progression suggestions across exercises lifted in the last 30 days. */
    const suggestions = useMemo(() => {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const historyByExercise = new Map<
            string,
            Array<{ weight: number | null; reps: number | null; rpe?: number; date: string }>
        >();

        for (const s of sessions) {
            const t = new Date(`${s.date}T00:00:00`).getTime();
            if (t < cutoff) continue;
            for (const ex of s.exercises) {
                for (const set of ex.sets) {
                    if (!set.isCompleted || !set.weight || !set.reps) continue;
                    if (set.setType === 'warmup') continue;
                    const list = historyByExercise.get(ex.exerciseId) ?? [];
                    list.push({ weight: set.weight, reps: set.reps, rpe: set.rpe, date: s.date });
                    historyByExercise.set(ex.exerciseId, list);
                }
            }
        }

        const out: Array<{
            exerciseId: string;
            name: string;
            suggestion: ReturnType<typeof suggestProgression>;
            lastWeight: number;
            lastReps: number;
        }> = [];

        for (const [exerciseId, hist] of historyByExercise.entries()) {
            const exInfo = exercises.find((e) => e.id === exerciseId);
            if (!exInfo) continue;
            const ordered = hist.sort((a, b) => (a.date < b.date ? 1 : -1));
            const sug = suggestProgression(ordered);
            if (!sug) continue;
            out.push({
                exerciseId,
                name: getExerciseName(exInfo, t as any, 'en'),
                suggestion: sug,
                lastWeight: ordered[0].weight ?? 0,
                lastReps: ordered[0].reps ?? 0,
            });
        }

        return out
            .filter((s) => s.suggestion?.reason !== 'first_time')
            .slice(0, 3);
    }, [sessions, exercises, t]);

    const recentSessions = useMemo(
        () => sessions.filter((s) => !s.isHiddenFromRecent).slice(0, 3),
        [sessions]
    );

    const handleStartTemplate = useCallback(
        (id: string) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            startWorkoutFromTemplate(id);
            router.push('/active-workout');
        },
        [startWorkoutFromTemplate, router]
    );

    const handleOpenSession = useCallback(
        (id: string) => {
            Haptics.selectionAsync();
            router.push(`/session-detail?id=${id}` as any);
        },
        [router]
    );

    const handleEmpty = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        startEmptyWorkout();
        router.push('/active-workout');
    }, [startEmptyWorkout, router]);

    const goalProgress = Math.min(1, weekly / Math.max(1, weeklyGoal));
    const newestAch = recentlyUnlocked[0]
        ? achievementCatalog.find((a) => a.id === recentlyUnlocked[0])
        : null;

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
                <LargeTitle title={t(greetingKey())} subtitle={weekly > 0 ? t('ready_to_train') : t('rest_day')} />

                {/* ── PR / Achievement banners ───────────────────────────── */}
                {recentPRBanner ? (
                    <Animated.View entering={FadeInDown.springify()}>
                        <Pressable onPress={dismissPRBanner}>
                            <View style={[styles.banner, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}>
                                <Text style={{ fontSize: 28 }}>🏆</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.onPrimaryContainer, fontFamily: fontBold, fontSize: 16 }}>
                                        {t('new_pr')}
                                    </Text>
                                    <Text style={{ color: colors.onPrimaryContainer, fontFamily: fontRegular, fontSize: 12, marginTop: 2 }}>
                                        {recentPRBanner.prCount} {t('sets').toLowerCase()} · {t('tap_to_dismiss')}
                                    </Text>
                                </View>
                                <Ionicons name="close-circle" size={22} color={colors.onPrimaryContainer} />
                            </View>
                        </Pressable>
                    </Animated.View>
                ) : null}

                {newestAch ? (
                    <Animated.View entering={FadeInDown.delay(80).springify()}>
                        <Pressable onPress={dismissAchievementBanner}>
                            <View style={[styles.banner, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outline }]}>
                                <Text style={{ fontSize: 28 }}>{newestAch.emoji}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 16 }}>
                                        {t(newestAch.titleKey as any)}
                                    </Text>
                                    <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 12 }}>
                                        {t(newestAch.descriptionKey as any)}
                                    </Text>
                                </View>
                                <Ionicons name="close-circle" size={22} color={colors.onSurfaceVariant} />
                            </View>
                        </Pressable>
                    </Animated.View>
                ) : null}

                {/* ── Hero stats: weekly goal + streak ────────────────────── */}
                <Animated.View entering={FadeInDown.delay(60).springify()}>
                    <Card hero style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: tokens.spacing.lg }}>
                        <ProgressRing
                            progress={goalProgress}
                            size={104}
                            stroke={11}
                            label={`${weekly}/${weeklyGoal}`}
                            sublabel={t('this_week')}
                        />
                        <View style={{ flex: 1, gap: 12 }}>
                            <View>
                                <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                                    {t('current_streak')}
                                </Text>
                                <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 32, letterSpacing: -0.5 }}>
                                    {streak.currentWeeks}{' '}
                                    <Text style={{ fontSize: 14, color: colors.onSurfaceVariant }}>{t('weeks_unit')}</Text>
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <Badge label={`🏅 ${unlockedAchievements.length}`} color={colors.surfaceContainerHigh} />
                                {streak.daysSinceLastWorkout != null ? (
                                    <Badge
                                        label={`${streak.daysSinceLastWorkout}${t('days_unit')}`}
                                        color={colors.surfaceContainerHigh}
                                    />
                                ) : null}
                            </View>
                        </View>
                    </Card>
                </Animated.View>

                {/* ── Next workout ────────────────────────────────────────── */}
                {nextRoutine ? (
                    <Animated.View entering={FadeInDown.delay(100).springify()}>
                        <SectionHeader title={t('next_workout')} />
                        <Card>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 14 }}>
                                <View
                                    style={[
                                        styles.routineEmoji,
                                        { backgroundColor: nextRoutine.colorTag ?? colors.primaryContainer },
                                    ]}
                                >
                                    <Text style={{ fontSize: 24 }}>{nextRoutine.emoji ?? '💪'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18, textAlign: isRTL ? 'right' : 'left' }}>
                                        {nextRoutine.name}
                                    </Text>
                                    <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 13, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                                        {nextRoutine.exercises.length} {t('template_exercises').toLowerCase()} ·{' '}
                                        {nextRoutine.exercises.reduce((s, e) => s + e.sets, 0)} {t('sets').toLowerCase()}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ height: 12 }} />
                            <PillButton
                                title={t('start_workout')}
                                icon="play"
                                fullWidth
                                onPress={() => handleStartTemplate(nextRoutine.id)}
                            />
                        </Card>
                    </Animated.View>
                ) : (
                    <Animated.View entering={FadeInDown.delay(100).springify()}>
                        <SectionHeader title={t('quick_start')} />
                        <Card>
                            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 14, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>
                                {t('no_routines_hint')}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <PillButton title={t('empty_workout')} icon="flash" variant="primary" onPress={handleEmpty} />
                                <PillButton
                                    title={t('pick_template')}
                                    icon="list"
                                    variant="secondary"
                                    onPress={() => router.navigate('/(tabs)/library' as any)}
                                />
                            </View>
                        </Card>
                    </Animated.View>
                )}

                {/* ── Smart suggestions ───────────────────────────────────── */}
                {suggestions.length > 0 ? (
                    <Animated.View entering={FadeInDown.delay(140).springify()}>
                        <SectionHeader title={t('suggested_for_you')} />
                        <Card style={{ padding: 0 }}>
                            {suggestions.map((s, i) => (
                                <ListRow
                                    key={s.exerciseId}
                                    title={s.name}
                                    subtitle={
                                        s.suggestion?.reason === 'increase_weight'
                                            ? t('suggestion_increase_weight')
                                            : s.suggestion?.reason === 'increase_reps'
                                                ? t('suggestion_increase_reps')
                                                : t('suggestion_hold')
                                    }
                                    value={`${formatWeight(s.suggestion?.weight ?? 0, units)} × ${s.suggestion?.reps}`}
                                    separator={i < suggestions.length - 1}
                                    leading={
                                        <View style={[styles.suggestIcon, { backgroundColor: colors.primaryContainer }]}>
                                            <Ionicons name="trending-up" size={16} color={colors.primary} />
                                        </View>
                                    }
                                />
                            ))}
                        </Card>
                    </Animated.View>
                ) : null}

                {/* ── Muscle balance ──────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(180).springify()}>
                    <SectionHeader title={t('muscle_balance')} />
                    <Card>
                        <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 12, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>
                            {t('last_14_days')}
                        </Text>
                        <View style={{ gap: 10 }}>
                            {bodyPartKeys
                                .filter((bp) => bp !== 'cardio' && bp !== 'other')
                                .map((bp) => {
                                    const v = muscleBalance[bp] ?? 0;
                                    return (
                                        <View key={bp} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
                                            <Text style={{ width: 80, color: colors.onSurface, fontFamily: fontBold, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }}>
                                                {t(bodyPartNameKeys[bp] as any)}
                                            </Text>
                                            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.fillTertiary, overflow: 'hidden' }}>
                                                <View
                                                    style={{
                                                        width: `${Math.max(4, v * 100)}%`,
                                                        height: '100%',
                                                        backgroundColor: v > 0.05 ? colors.primary : colors.outline,
                                                        borderRadius: 4,
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    );
                                })}
                        </View>
                    </Card>
                </Animated.View>

                {/* ── Recent ──────────────────────────────────────────────── */}
                {recentSessions.length > 0 ? (
                    <Animated.View entering={FadeInDown.delay(220).springify()}>
                        <SectionHeader title={t('recent_workouts')} trailing={
                            <Pressable onPress={() => router.navigate('/(tabs)/history' as any)}>
                                <Text style={{ color: colors.primary, fontFamily: fontBold, fontSize: 13 }}>
                                    {t('view_all')}
                                </Text>
                            </Pressable>
                        } />
                        <Card style={{ padding: 0 }}>
                            {recentSessions.map((s, i) => (
                                <ListRow
                                    key={s.id}
                                    title={s.name}
                                    subtitle={`${s.date} · ${s.durationMinutes ?? 0} ${t('minutes')}`}
                                    value={`${formatWeightCompact(s.totalVolume ?? 0, units)} ${weightUnitLabel(units)}`}
                                    separator={i < recentSessions.length - 1}
                                    onPress={() => handleOpenSession(s.id)}
                                    chevron
                                />
                            ))}
                        </Card>
                    </Animated.View>
                ) : null}
            </ScrollView>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: tokens.spacing.lg,
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
    },
    routineEmoji: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
