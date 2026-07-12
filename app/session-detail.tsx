/**
 * Session Detail — read-only view of a past workout.
 * Replaces the old surprise behavior where tapping a history row instantly
 * started a new workout; Repeat is now an explicit action here.
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme, ScreenBackground, tokens } from '../src/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/appStore';
import { Card, ModalHeader, PillButton, SectionHeader, Badge } from '../src/components/ios';
import { getExerciseName } from '../src/utils/helpers';
import { formatWeight, formatWeightCompact, weightUnitLabel } from '../src/utils/units';

export default function SessionDetailScreen() {
    const { colors } = useTheme();
    const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const sessions = useAppStore((s) => s.sessions);
    const exercises = useAppStore((s) => s.exercises);
    const units = useAppStore((s) => s.units);
    const startWorkoutFromSession = useAppStore((s) => s.startWorkoutFromSession);
    const deleteSession = useAppStore((s) => s.deleteSession);
    const rateSession = useAppStore((s) => s.rateSession);

    const session = useMemo(() => sessions.find((s) => s.id === id), [sessions, id]);

    const goHome = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
    };

    // Session deleted or bad deep link — leave via effect, never during render.
    useEffect(() => {
        if (!session) {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
        }
    }, [session]);

    if (!session) return null;

    const handleRepeat = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        startWorkoutFromSession(session.id);
        router.replace('/active-workout');
    };

    const handleDelete = () => {
        const onConfirm = () => {
            deleteSession(session.id);
            goHome();
        };
        if (Platform.OS === 'web') return onConfirm();
        Alert.alert(t('delete'), t('delete_session_confirm'), [
            { text: t('cancel'), style: 'cancel' },
            { text: t('delete'), style: 'destructive', onPress: onConfirm },
        ]);
    };

    return (
        <ScreenBackground style={{ flex: 1 }}>
            <ModalHeader
                title={t('session_detail')}
                onClose={goHome}
                closeIcon="chevron-down"
                topInset={insets.top}
            />
            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: tokens.spacing.lg,
                    paddingBottom: insets.bottom + 40,
                    gap: tokens.spacing.md,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Header card ─────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.springify()}>
                    <Card hero>
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: tokens.type.title2, letterSpacing: -0.4, textAlign: isRTL ? 'right' : 'left' }}>
                            {session.name}
                        </Text>
                        <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 13, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                            {session.date}
                        </Text>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 18, marginTop: 14 }}>
                            <HeaderStat
                                icon="time-outline"
                                value={`${session.durationMinutes ?? 0} ${t('minutes')}`}
                                label={t('duration')}
                            />
                            <HeaderStat
                                icon="barbell-outline"
                                value={`${formatWeightCompact(session.totalVolume ?? 0, units)} ${weightUnitLabel(units)}`}
                                label={t('total_volume')}
                            />
                            <HeaderStat
                                icon="layers-outline"
                                value={String(session.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.isCompleted).length, 0))}
                                label={t('sets_completed')}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                            {[1, 2, 3, 4, 5].map((v) => (
                                <Pressable
                                    key={v}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        rateSession(session.id, v);
                                    }}
                                    hitSlop={6}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${v}/5`}
                                >
                                    <Ionicons
                                        name={(session.rating ?? 0) >= v ? 'star' : 'star-outline'}
                                        size={22}
                                        color={(session.rating ?? 0) >= v ? colors.primary : colors.outline}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </Card>
                </Animated.View>

                {/* ─── Exercises ───────────────────────────────────────── */}
                {session.exercises.map((ex, exIdx) => {
                    const info = exercises.find((e) => e.id === ex.exerciseId);
                    return (
                        <Animated.View key={`${ex.exerciseId}-${exIdx}`} entering={FadeInDown.delay(80 + exIdx * 50).springify()}>
                            <Card compact>
                                <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 16, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>
                                    {info ? getExerciseName(info, t, language) : ex.exerciseId}
                                </Text>
                                <View style={{ gap: 6 }}>
                                    {ex.sets.map((set, i) => (
                                        <View
                                            key={set.id ?? i}
                                            style={{
                                                flexDirection: isRTL ? 'row-reverse' : 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingVertical: 4,
                                                opacity: set.isCompleted ? 1 : 0.45,
                                            }}
                                        >
                                            <Text style={{ width: 22, color: colors.onSurfaceVariant, fontFamily: fontBold, fontSize: 12, textAlign: 'center' }}>
                                                {i + 1}
                                            </Text>
                                            <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 15, fontVariant: ['tabular-nums'] }}>
                                                {set.weight != null ? formatWeight(set.weight, units) : '—'} × {set.reps ?? '—'}
                                            </Text>
                                            {set.setType === 'warmup' ? (
                                                <Text style={{ fontSize: 12 }}>🔥</Text>
                                            ) : null}
                                            {set.rpe != null ? (
                                                <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 12 }}>
                                                    RPE {set.rpe}
                                                </Text>
                                            ) : null}
                                            <View style={{ flex: 1 }} />
                                            {set.isPR ? <Badge label="PR" color={colors.tertiary} /> : null}
                                            {set.isCompleted ? (
                                                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                                            ) : (
                                                <Ionicons name="ellipse-outline" size={16} color={colors.outline} />
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </Card>
                        </Animated.View>
                    );
                })}

                {/* ─── Actions ─────────────────────────────────────────── */}
                <View style={{ gap: 10, marginTop: 4 }}>
                    <PillButton title={t('repeat_workout')} icon="repeat" size="lg" fullWidth onPress={handleRepeat} />
                    <PillButton title={t('delete')} icon="trash-outline" variant="destructive" fullWidth onPress={handleDelete} />
                </View>
            </ScrollView>
        </ScreenBackground>
    );
}

function HeaderStat({ icon, value, label }: { icon: any; value: string; label: string }) {
    const { colors } = useTheme();
    const { fontBold } = useTranslation();
    return (
        <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name={icon} size={14} color={colors.primary} />
                <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 15, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
                    {value}
                </Text>
            </View>
            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontBold, fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase' }} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}
