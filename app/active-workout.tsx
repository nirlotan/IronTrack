/**
 * Active Workout — the central interaction surface.
 *
 * iOS-native aesthetics with:
 *   - Header: minimize / elapsed timer / discard, large editable title, finish CTA.
 *   - Floating rest-timer ring overlay (Reanimated countdown).
 *   - Per-exercise card showing smart progression suggestion + last-time numbers.
 *   - Per-set row with set type chip (warmup/working/drop/failure), weight, reps, RPE stepper, complete check.
 *   - Live PR detection vs `computePersonalRecords(sessions)`; PR bursts fire confetti-style toast.
 *   - Plate calculator sheet (47.5kg → 2 × 20 + 2.5 + bar).
 *   - Swipe-to-delete sets.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    useAnimatedProps,
    useSharedValue,
    withTiming,
    Easing,
    type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme, ScreenBackground, tokens } from '../src/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/appStore';
import { formatTimer, getExerciseName } from '../src/utils/helpers';
import {
    Card,
    PillButton,
    SegmentedControl,
    Badge,
    ProgressRing,
    ListRow,
    Stepper,
    IconButton,
} from '../src/components/ios';
import {
    computePersonalRecords,
    detectPRKinds,
    suggestProgression,
    estimate1RM,
} from '../src/utils/algorithms';
import type { SetRecord, SetType, PersonalRecord } from '../src/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SET_TYPES: Array<{ value: SetType; emoji: string; key: string }> = [
    { value: 'warmup', emoji: '🔥', key: 'set_type_warmup' },
    { value: 'working', emoji: '💪', key: 'set_type_working' },
    { value: 'drop', emoji: '⬇️', key: 'set_type_drop' },
    { value: 'failure', emoji: '💀', key: 'set_type_failure' },
];

export default function ActiveWorkoutScreen() {
    const { colors } = useTheme();
    const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const activeWorkout = useAppStore((s) => s.activeWorkout);
    const exercises = useAppStore((s) => s.exercises);
    const sessions = useAppStore((s) => s.sessions);
    const restTimerSeconds = useAppStore((s) => s.restTimerSeconds);
    const autoStartRestTimer = useAppStore((s) => s.autoStartRestTimer);

    const renameActiveWorkout = useAppStore((s) => s.renameActiveWorkout);
    const updateSet = useAppStore((s) => s.updateSet);
    const updateSetRPE = useAppStore((s) => s.updateSetRPE);
    const updateSetType = useAppStore((s) => s.updateSetType);
    const addSetToExercise = useAppStore((s) => s.addSetToExercise);
    const removeSet = useAppStore((s) => s.removeSet);
    const toggleSetComplete = useAppStore((s) => s.toggleSetComplete);
    const moveExerciseInWorkout = useAppStore((s) => s.moveExerciseInWorkout);
    const finishWorkout = useAppStore((s) => s.finishWorkout);
    const discardWorkout = useAppStore((s) => s.discardWorkout);

    const [elapsed, setElapsed] = useState(0);
    const [restLeft, setRestLeft] = useState(0);
    const [resting, setResting] = useState(false);
    const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [prToast, setPrToast] = useState<{ kinds: Array<'1rm' | 'weight' | 'reps' | 'volume'>; exerciseName: string } | null>(null);
    const prToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [rpeSheet, setRpeSheet] = useState<{ exIdx: number; setIdx: number; current: number } | null>(null);
    const [typeSheet, setTypeSheet] = useState<{ exIdx: number; setIdx: number; current: SetType } | null>(null);
    const [plateSheet, setPlateSheet] = useState<{ weight: number } | null>(null);

    // ─── Prior records snapshot (for live PR detection) ─────────────
    const priorRecords = useMemo<Record<string, PersonalRecord>>(
        () => computePersonalRecords(sessions),
        [sessions]
    );

    // ─── Per-exercise progression suggestions from history ──────────
    const suggestions = useMemo(() => {
        if (!activeWorkout) return {} as Record<string, ReturnType<typeof suggestProgression>>;
        const out: Record<string, ReturnType<typeof suggestProgression>> = {};
        for (const ex of activeWorkout.exercises) {
            const history: Array<{ weight: number | null; reps: number | null; rpe?: number }> = [];
            for (const session of sessions) {
                for (const sx of session.exercises) {
                    if (sx.exerciseId !== ex.exerciseId) continue;
                    for (const s of sx.sets) {
                        if (s.isCompleted && s.setType !== 'warmup') {
                            history.push({ weight: s.weight, reps: s.reps, rpe: s.rpe });
                        }
                    }
                }
            }
            out[ex.exerciseId] = suggestProgression(history);
        }
        return out;
    }, [activeWorkout, sessions]);

    // ─── Elapsed timer ──────────────────────────────────────────────
    useEffect(() => {
        if (!activeWorkout?.startedAt) return;
        const id = setInterval(() => {
            setElapsed(Math.floor((Date.now() - activeWorkout.startedAt!) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [activeWorkout?.startedAt]);

    // ─── Rest timer ─────────────────────────────────────────────────
    const restProgress = useSharedValue(0);

    const stopRest = useCallback(() => {
        if (restRef.current) clearInterval(restRef.current);
        restRef.current = null;
        setResting(false);
        setRestLeft(0);
        restProgress.value = withTiming(0, { duration: 200 });
    }, [restProgress]);

    const startRest = useCallback(
        (seconds = restTimerSeconds) => {
            if (restRef.current) clearInterval(restRef.current);
            const total = Math.max(1, seconds);
            setRestLeft(total);
            setResting(true);
            restProgress.value = 0;
            restProgress.value = withTiming(1, { duration: total * 1000, easing: Easing.linear });
            restRef.current = setInterval(() => {
                setRestLeft((prev) => {
                    if (prev <= 1) {
                        if (restRef.current) clearInterval(restRef.current);
                        restRef.current = null;
                        setResting(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        },
        [restTimerSeconds, restProgress]
    );

    useEffect(
        () => () => {
            if (restRef.current) clearInterval(restRef.current);
            if (prToastTimer.current) clearTimeout(prToastTimer.current);
        },
        []
    );

    const fireToast = useCallback((kinds: Array<'1rm' | 'weight' | 'reps' | 'volume'>, exerciseName: string) => {
        setPrToast({ kinds, exerciseName });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (prToastTimer.current) clearTimeout(prToastTimer.current);
        prToastTimer.current = setTimeout(() => setPrToast(null), 3500);
    }, []);

    // ─── Set completion (with live PR detection) ────────────────────
    const handleComplete = useCallback(
        (exIdx: number, setIdx: number) => {
            if (!activeWorkout) return;
            const ex = activeWorkout.exercises[exIdx];
            const s = ex?.sets[setIdx];
            if (!s) return;

            const willBeCompleted = !s.isCompleted;
            toggleSetComplete(exIdx, setIdx);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            if (willBeCompleted) {
                const kinds = detectPRKinds({ ...s, isCompleted: true }, priorRecords[ex.exerciseId]);
                if (kinds.length > 0 && s.setType !== 'warmup') {
                    const info = exercises.find((e) => e.id === ex.exerciseId);
                    fireToast(kinds, info ? getExerciseName(info, t, language) : ex.exerciseId);
                }
                if (autoStartRestTimer && s.setType !== 'warmup') {
                    startRest();
                }
            }
        },
        [activeWorkout, toggleSetComplete, priorRecords, exercises, t, language, autoStartRestTimer, startRest, fireToast]
    );

    const handleFinish = useCallback(() => {
        const onConfirm = () => {
            finishWorkout();
            stopRest();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
        };
        if (Platform.OS === 'web') return onConfirm();
        Alert.alert(t('finish_workout'), '', [
            { text: t('cancel'), style: 'cancel' },
            { text: t('finish'), onPress: onConfirm },
        ]);
    }, [finishWorkout, router, stopRest, t]);

    const handleDiscard = useCallback(() => {
        const onConfirm = () => {
            discardWorkout();
            stopRest();
            router.replace('/(tabs)');
        };
        if (Platform.OS === 'web') return onConfirm();
        Alert.alert(t('discard_workout'), t('discard_confirm'), [
            { text: t('cancel'), style: 'cancel' },
            { text: t('delete'), style: 'destructive', onPress: onConfirm },
        ]);
    }, [discardWorkout, router, stopRest, t]);

    if (!activeWorkout) return null;

    // ─── Workout-wide stats (live) ──────────────────────────────────
    const liveVolume = activeWorkout.exercises.reduce((sum, ex) => {
        return sum + ex.sets.reduce((s2, st) => {
            if (!st.isCompleted || !st.weight || !st.reps || st.setType === 'warmup') return s2;
            return s2 + st.weight * st.reps;
        }, 0);
    }, 0);
    const totalSets = activeWorkout.exercises.reduce((s, ex) => s + ex.sets.length, 0);
    const completedSets = activeWorkout.exercises.reduce(
        (s, ex) => s + ex.sets.filter((st) => st.isCompleted).length,
        0
    );

    return (
        <ScreenBackground style={{ flex: 1 }}>
            {/* ─── Header ──────────────────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
                <View style={styles.headerRow}>
                    <Pressable
                        onPress={() => router.back()}
                        hitSlop={10}
                        style={styles.iconBtn}
                        accessibilityRole="button"
                        accessibilityLabel={t('back')}
                    >
                        <Ionicons name="chevron-down" size={26} color={colors.onSurface} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.elapsed, { color: colors.primary, fontFamily: fontBold }]}>
                            {formatTimer(elapsed)}
                        </Text>
                        <Text style={[styles.headerSub, { color: colors.onSurfaceVariant, fontFamily: fontRegular }]}>
                            {completedSets}/{totalSets} {t('sets').toLowerCase()} · {Math.round(liveVolume)}kg
                        </Text>
                    </View>
                    <Pressable
                        onPress={handleDiscard}
                        hitSlop={10}
                        style={styles.iconBtn}
                        accessibilityRole="button"
                        accessibilityLabel={t('discard_workout')}
                    >
                        <Ionicons name="close" size={24} color={colors.error} />
                    </Pressable>
                </View>
                <View style={styles.titleRow}>
                    <TextInput
                        style={[styles.titleInput, { color: colors.onSurface, fontFamily: fontBold }]}
                        value={activeWorkout.name}
                        onChangeText={renameActiveWorkout}
                        placeholder={t('new_workout')}
                        placeholderTextColor={colors.outline}
                        textAlign={isRTL ? 'right' : 'left'}
                    />
                    <Pressable
                        onPress={handleFinish}
                        style={({ pressed }) => [
                            styles.finishBtn,
                            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                        ]}
                    >
                        <Text style={[styles.finishText, { color: colors.onPrimary, fontFamily: fontBold }]}>
                            {t('finish')}
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* ─── Body ────────────────────────────────────────────────── */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={insets.top + 80}
            >
                <ScrollView
                    contentContainerStyle={{
                        paddingHorizontal: tokens.spacing.lg,
                        paddingTop: tokens.spacing.sm,
                        paddingBottom: insets.bottom + 200,
                        gap: tokens.spacing.md,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {activeWorkout.exercises.map((exercise, exIdx) => {
                        const info = exercises.find((e) => e.id === exercise.exerciseId);
                        if (!info) return null;
                        const sg = suggestions[exercise.exerciseId];
                        const prevRecord = priorRecords[exercise.exerciseId];
                        const canMoveUp = exIdx > 0;
                        const canMoveDown = exIdx < activeWorkout.exercises.length - 1;
                        const onMove = (delta: number) => {
                            moveExerciseInWorkout(exIdx, exIdx + delta);
                            Haptics.selectionAsync();
                        };
                        return (
                            <Animated.View key={`${exercise.exerciseId}-${exIdx}`} entering={FadeInDown.delay(exIdx * 60).springify()}>
                                <Card>
                                    {/* Title + PR badge */}
                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18, flex: 1 }}>
                                            {getExerciseName(info, t, language)}
                                        </Text>
                                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginHorizontal: 6 }}>
                                            <IconButton
                                                icon="chevron-up"
                                                size={30}
                                                label="Move exercise up"
                                                tint={colors.onSurfaceVariant}
                                                background="transparent"
                                                disabled={!canMoveUp}
                                                onPress={() => onMove(-1)}
                                            />
                                            <IconButton
                                                icon="chevron-down"
                                                size={30}
                                                label="Move exercise down"
                                                tint={colors.onSurfaceVariant}
                                                background="transparent"
                                                disabled={!canMoveDown}
                                                onPress={() => onMove(1)}
                                            />
                                            <IconButton
                                                icon="disc-outline"
                                                size={30}
                                                label={t('plate_calculator')}
                                                tint={colors.onSurfaceVariant}
                                                background="transparent"
                                                onPress={() => {
                                                    const heaviest = Math.max(
                                                        0,
                                                        ...exercise.sets.map((s) => s.weight ?? 0)
                                                    );
                                                    setPlateSheet({ weight: heaviest || (sg?.weight ?? 20) });
                                                }}
                                            />
                                        </View>
                                        {prevRecord ? (
                                            <Badge label={`PR ${prevRecord.bestWeight}kg`} color={colors.tertiary} />
                                        ) : null}
                                    </View>

                                    {/* Suggestion */}
                                    {sg ? (
                                        <View
                                            style={{
                                                flexDirection: isRTL ? 'row-reverse' : 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                backgroundColor: colors.fillTertiary,
                                                borderRadius: tokens.radius.md,
                                                paddingHorizontal: 12,
                                                paddingVertical: 10,
                                                marginBottom: 12,
                                            }}
                                        >
                                            <Ionicons name="sparkles" size={16} color={colors.primary} />
                                            <Text style={{ color: colors.onSurface, fontFamily: fontRegular, fontSize: 13, flex: 1 }}>
                                                {sg.reason === 'first_time'
                                                    ? t('suggestion_first_time')
                                                    : sg.reason === 'hold'
                                                        ? t('suggestion_hold')
                                                        : sg.reason === 'increase_weight'
                                                            ? `${t('suggestion_increase_weight')}  ${sg.weight}kg × ${sg.reps}`
                                                            : `${t('suggestion_increase_reps')}  ${sg.weight}kg × ${sg.reps}`}
                                            </Text>
                                        </View>
                                    ) : null}

                                    {/* Column header */}
                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 6 }}>
                                        <Text style={[styles.colHead, { color: colors.outline, fontFamily: fontBold, width: 30 }]}>#</Text>
                                        <Text style={[styles.colHead, { color: colors.outline, fontFamily: fontBold, flex: 1, textAlign: 'center' }]}>{t('weight_kg')}</Text>
                                        <Text style={[styles.colHead, { color: colors.outline, fontFamily: fontBold, flex: 1, textAlign: 'center' }]}>{t('reps')}</Text>
                                        <Text style={[styles.colHead, { color: colors.outline, fontFamily: fontBold, width: 50, textAlign: 'center' }]}>{t('rpe')}</Text>
                                        <View style={{ width: 40 }} />
                                    </View>

                                    {exercise.sets.map((set, setIdx) => (
                                        <SetRow
                                            key={set.id}
                                            exIdx={exIdx}
                                            setIdx={setIdx}
                                            set={set}
                                            isRTL={isRTL}
                                            onChangeWeight={(v) => updateSet(exIdx, setIdx, 'weight', v)}
                                            onChangeReps={(v) => updateSet(exIdx, setIdx, 'reps', v)}
                                            onComplete={() => handleComplete(exIdx, setIdx)}
                                            onDelete={() => removeSet(exIdx, setIdx)}
                                            onOpenRPE={() => setRpeSheet({ exIdx, setIdx, current: set.rpe ?? 7 })}
                                            onOpenType={() => setTypeSheet({ exIdx, setIdx, current: set.setType ?? 'working' })}
                                            onOpenPlate={(weight) => setPlateSheet({ weight })}
                                        />
                                    ))}

                                    <View style={{ height: 6 }} />
                                    <PillButton
                                        title={t('add_set')}
                                        icon="add"
                                        variant="ghost"
                                        fullWidth
                                        onPress={() => addSetToExercise(exIdx)}
                                    />
                                </Card>
                            </Animated.View>
                        );
                    })}

                    <PillButton
                        title={t('add_exercise')}
                        icon="add-circle"
                        variant="secondary"
                        fullWidth
                        onPress={() => router.push('/select-exercise')}
                    />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ─── Rest timer floating overlay ─────────────────────────── */}
            {resting ? (
                <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    style={[
                        styles.restOverlay,
                        { bottom: insets.bottom + 24, backgroundColor: colors.surfaceContainerHigh, borderColor: colors.separator },
                    ]}
                >
                    <RestRing seconds={restLeft} total={restTimerSeconds} progress={restProgress} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                            {t('rest_timer')}
                        </Text>
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 28 }}>
                            {formatTimer(restLeft)}
                        </Text>
                    </View>
                    <Pressable onPress={() => startRest(restLeft + 15)} style={[styles.restPill, { backgroundColor: colors.fillTertiary }]}>
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 12 }}>+15s</Text>
                    </Pressable>
                    <Pressable onPress={stopRest} style={[styles.restPill, { backgroundColor: colors.error }]}>
                        <Text style={{ color: colors.onError, fontFamily: fontBold, fontSize: 12 }}>{t('skip')}</Text>
                    </Pressable>
                </Animated.View>
            ) : null}

            {/* ─── PR celebration toast ────────────────────────────────── */}
            {prToast ? (
                <Animated.View
                    entering={FadeInDown.springify()}
                    exiting={FadeOut}
                    style={[
                        styles.prToast,
                        { top: insets.top + 80, backgroundColor: colors.tertiary },
                    ]}
                >
                    <Text style={{ fontSize: 28 }}>🏆</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ color: colors.onTertiary ?? '#000', fontFamily: fontBold, fontSize: 14 }}>
                            {t('pr_new_record')}
                        </Text>
                        <Text style={{ color: colors.onTertiary ?? '#000', fontFamily: fontRegular, fontSize: 12 }} numberOfLines={1}>
                            {prToast.exerciseName} · {prToast.kinds.map((k) => t(`pr_${k}` as any)).join(' · ')}
                        </Text>
                    </View>
                </Animated.View>
            ) : null}

            {/* ─── RPE sheet ───────────────────────────────────────────── */}
            <Modal visible={!!rpeSheet} transparent animationType="fade" onRequestClose={() => setRpeSheet(null)}>
                <Pressable style={styles.sheetBackdrop} onPress={() => setRpeSheet(null)}>
                    <Pressable style={[styles.sheet, { backgroundColor: colors.surfaceContainer }]} onPress={() => { }}>
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18, marginBottom: 6 }}>{t('rpe')}</Text>
                        <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 13, marginBottom: 16 }}>
                            {t('rpe_hint')}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                            {[5, 6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => {
                                const active = rpeSheet?.current === v;
                                return (
                                    <Pressable
                                        key={v}
                                        onPress={() => {
                                            if (rpeSheet) updateSetRPE(rpeSheet.exIdx, rpeSheet.setIdx, v);
                                            setRpeSheet(null);
                                            Haptics.selectionAsync();
                                        }}
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 16,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: active ? colors.primary : colors.fillTertiary,
                                        }}
                                    >
                                        <Text style={{ color: active ? colors.onPrimary : colors.onSurface, fontFamily: fontBold, fontSize: 20 }}>
                                            {v}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        {rpeSheet?.current != null ? (
                            <Pressable
                                style={{ marginTop: 16, alignSelf: 'center' }}
                                onPress={() => {
                                    if (rpeSheet) updateSetRPE(rpeSheet.exIdx, rpeSheet.setIdx, undefined);
                                    setRpeSheet(null);
                                }}
                            >
                                <Text style={{ color: colors.error, fontFamily: fontBold, fontSize: 14 }}>{t('clear')}</Text>
                            </Pressable>
                        ) : null}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ─── Set type sheet ──────────────────────────────────────── */}
            <Modal visible={!!typeSheet} transparent animationType="fade" onRequestClose={() => setTypeSheet(null)}>
                <Pressable style={styles.sheetBackdrop} onPress={() => setTypeSheet(null)}>
                    <Pressable style={[styles.sheet, { backgroundColor: colors.surfaceContainer }]} onPress={() => { }}>
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18, marginBottom: 16 }}>{t('set_type')}</Text>
                        <View style={{ gap: 8 }}>
                            {SET_TYPES.map((opt) => {
                                const active = typeSheet?.current === opt.value;
                                return (
                                    <Pressable
                                        key={opt.value}
                                        onPress={() => {
                                            if (typeSheet) updateSetType(typeSheet.exIdx, typeSheet.setIdx, opt.value);
                                            setTypeSheet(null);
                                            Haptics.selectionAsync();
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: 14,
                                            borderRadius: 14,
                                            backgroundColor: active ? colors.primaryContainer : colors.fillTertiary,
                                        }}
                                    >
                                        <Text style={{ fontSize: 22 }}>{opt.emoji}</Text>
                                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 15, flex: 1 }}>
                                            {t(opt.key as any)}
                                        </Text>
                                        {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ─── Plate calculator sheet ──────────────────────────────── */}
            <Modal visible={!!plateSheet} transparent animationType="fade" onRequestClose={() => setPlateSheet(null)}>
                <Pressable style={styles.sheetBackdrop} onPress={() => setPlateSheet(null)}>
                    <Pressable style={[styles.sheet, { backgroundColor: colors.surfaceContainer }]} onPress={() => { }}>
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18, marginBottom: 4 }}>
                            {t('plate_calculator')}
                        </Text>
                        <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 13, marginBottom: 16 }}>
                            {plateSheet?.weight ?? 0}kg · {t('per_side')}
                        </Text>
                        {plateSheet ? <PlateBreakdown weight={plateSheet.weight} /> : null}
                    </Pressable>
                </Pressable>
            </Modal>
        </ScreenBackground>
    );
}

// ─── Set row ──────────────────────────────────────────────────────
function SetRow({
    exIdx,
    setIdx,
    set,
    isRTL,
    onChangeWeight,
    onChangeReps,
    onComplete,
    onDelete,
    onOpenRPE,
    onOpenType,
    onOpenPlate,
}: {
    exIdx: number;
    setIdx: number;
    set: SetRecord;
    isRTL: boolean;
    onChangeWeight: (v: number | null) => void;
    onChangeReps: (v: number | null) => void;
    onComplete: () => void;
    onDelete: () => void;
    onOpenRPE: () => void;
    onOpenType: () => void;
    onOpenPlate: (weight: number) => void;
}) {
    const { colors } = useTheme();
    const { fontBold, t } = useTranslation();
    const setType: SetType = set.setType ?? 'working';
    const typeMeta = SET_TYPES.find((s) => s.value === setType)!;

    const renderRight = () => (
        <RectButton
            style={{ width: 64, marginVertical: 4, borderRadius: tokens.radius.md, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' }}
            onPress={onDelete}
        >
            <Ionicons name="trash" size={18} color={colors.onError} />
        </RectButton>
    );

    const bg = set.isCompleted ? colors.primaryContainer : colors.fillTertiary;

    return (
        <Swipeable
            overshootLeft={false}
            overshootRight={false}
            {...(isRTL ? { renderLeftActions: renderRight } : { renderRightActions: renderRight })}
        >
            <View
                style={[
                    styles.setRow,
                    {
                        backgroundColor: bg,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                ]}
            >
                <Pressable
                    onPress={onOpenType}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('set_type')} ${setIdx + 1}: ${t(typeMeta.key as any)}`}
                    style={{ width: 30, alignItems: 'center' }}
                >
                    <Text style={{ fontSize: 18 }}>{typeMeta.emoji}</Text>
                    <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontBold, fontSize: 10 }}>{setIdx + 1}</Text>
                </Pressable>
                <Stepper
                    value={set.weight}
                    onChange={onChangeWeight}
                    step={2.5}
                    min={0}
                    compact
                    label={t('weight_kg')}
                    onLongPressValue={set.weight ? () => onOpenPlate(set.weight!) : undefined}
                    style={{ flex: 1, marginHorizontal: 3, backgroundColor: colors.surface }}
                />
                <Stepper
                    value={set.reps}
                    onChange={onChangeReps}
                    step={1}
                    min={0}
                    compact
                    label={t('reps')}
                    style={{ flex: 1, marginHorizontal: 3, backgroundColor: colors.surface }}
                />
                <Pressable
                    onPress={onOpenRPE}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('rpe')}: ${set.rpe ?? '—'}`}
                    style={[styles.rpePill, { backgroundColor: set.rpe != null ? colors.tertiary : 'transparent', borderColor: colors.outline }]}
                >
                    <Text style={{ color: set.rpe != null ? (colors.onTertiary ?? '#000') : colors.onSurfaceVariant, fontFamily: fontBold, fontSize: 13 }}>
                        {set.rpe ?? '—'}
                    </Text>
                </Pressable>
                <Pressable
                    onPress={onComplete}
                    hitSlop={4}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${t('sets')} ${setIdx + 1}`}
                    accessibilityState={{ checked: set.isCompleted }}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: set.isCompleted ? colors.primary : colors.surfaceContainerHigh,
                    }}
                >
                    <Ionicons name={set.isCompleted ? 'checkmark' : 'ellipse-outline'} size={20} color={set.isCompleted ? colors.onPrimary : colors.outline} />
                </Pressable>
            </View>
        </Swipeable>
    );
}

// ─── Rest ring (animated SVG) ─────────────────────────────────────
function RestRing({
    seconds,
    total,
    progress,
}: {
    seconds: number;
    total: number;
    progress: SharedValue<number>;
}) {
    const { colors } = useTheme();
    const size = 48;
    const stroke = 4;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: c * progress.value,
    }));
    return (
        <Svg width={size} height={size}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.fillTertiary} strokeWidth={stroke} fill="none" />
            <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={colors.primary}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={c}
                animatedProps={animatedProps}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
        </Svg>
    );
}

// ─── Plate breakdown (per side, standard 20kg bar) ────────────────
function PlateBreakdown({ weight }: { weight: number }) {
    const { colors } = useTheme();
    const { fontBold, fontRegular, t } = useTranslation();
    const BAR = 20;
    const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
    const perSide = Math.max(0, (weight - BAR) / 2);
    const breakdown: Array<{ plate: number; count: number }> = [];
    let remaining = perSide;
    for (const p of PLATES) {
        const c = Math.floor(remaining / p);
        if (c > 0) {
            breakdown.push({ plate: p, count: c });
            remaining = Math.round((remaining - c * p) * 100) / 100;
        }
    }

    if (perSide <= 0) {
        return (
            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 14, textAlign: 'center', paddingVertical: 24 }}>
                {t('only_bar')}
            </Text>
        );
    }

    return (
        <View style={{ gap: 8 }}>
            {breakdown.map((b) => (
                <View
                    key={b.plate}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: colors.fillTertiary,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 24, height: 40, borderRadius: 4, backgroundColor: plateColor(b.plate) }} />
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 17 }}>{b.plate}kg</Text>
                    </View>
                    <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 17 }}>× {b.count}</Text>
                </View>
            ))}
            {remaining > 0.001 ? (
                <Text style={{ color: colors.error, fontFamily: fontRegular, fontSize: 12, textAlign: 'center' }}>
                    {t('plate_remainder')}: {remaining}kg
                </Text>
            ) : null}
            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                {t('bar')}: {BAR}kg
            </Text>
        </View>
    );
}

function plateColor(p: number): string {
    switch (p) {
        case 25: return '#E53E3E';
        case 20: return '#3182CE';
        case 15: return '#F6E05E';
        case 10: return '#48BB78';
        case 5: return '#A0AEC0';
        case 2.5: return '#1A202C';
        default: return '#718096';
    }
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: tokens.spacing.lg,
        paddingBottom: tokens.spacing.sm,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { alignItems: 'center' },
    elapsed: { fontSize: 17, letterSpacing: 1 },
    headerSub: { fontSize: 11, marginTop: 1 },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 6,
    },
    titleInput: { flex: 1, minWidth: 0, fontSize: 26 },
    finishBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
    },
    finishText: { fontSize: 14 },
    colHead: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
    setRow: {
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderRadius: tokens.radius.md,
        marginVertical: 3,
        gap: 4,
    },
    rpePill: {
        width: 50,
        height: 36,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 3,
    },
    restOverlay: {
        position: 'absolute',
        left: tokens.spacing.lg,
        right: tokens.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 8,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    restPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    prToast: {
        position: 'absolute',
        left: tokens.spacing.lg,
        right: tokens.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    sheetBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        padding: tokens.spacing.lg,
        paddingBottom: 40,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
});
