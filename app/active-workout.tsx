import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme, ScreenBackground } from '../src/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/appStore';
import { formatTimer, getExerciseName } from '../src/utils/helpers';

interface UndoState {
    exIdx: number;
    setIdx: number;
}

export default function ActiveWorkoutScreen() {
    const { colors } = useTheme();
    const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const activeWorkout = useAppStore((s) => s.activeWorkout);
    const exercises = useAppStore((s) => s.exercises);
    const restTimerSeconds = useAppStore((s) => s.restTimerSeconds);
    const autoStartRestTimer = useAppStore((s) => s.autoStartRestTimer);
    const renameActiveWorkout = useAppStore((s) => s.renameActiveWorkout);
    const updateSet = useAppStore((s) => s.updateSet);
    const addSetToExercise = useAppStore((s) => s.addSetToExercise);
    const removeSet = useAppStore((s) => s.removeSet);
    const addExerciseToWorkout = useAppStore((s) => s.addExerciseToWorkout);
    const toggleSetComplete = useAppStore((s) => s.toggleSetComplete);
    const finishWorkout = useAppStore((s) => s.finishWorkout);
    const discardWorkout = useAppStore((s) => s.discardWorkout);

    const [elapsed, setElapsed] = useState(0);
    const [restTimeLeft, setRestTimeLeft] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const [undoState, setUndoState] = useState<UndoState | null>(null);
    const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!activeWorkout) return;

        if (!activeWorkout.startedAt) {
            return;
        }

        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - activeWorkout.startedAt!) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [activeWorkout, router]);

    useEffect(() => {
        return () => {
            if (restIntervalRef.current) {
                clearInterval(restIntervalRef.current);
            }
            if (undoTimeoutRef.current) {
                clearTimeout(undoTimeoutRef.current);
            }
        };
    }, []);

    const startRestTimer = useCallback(() => {
        if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current);
        }
        setRestTimeLeft(restTimerSeconds);
        setIsResting(true);

        restIntervalRef.current = setInterval(() => {
            setRestTimeLeft((prev) => {
                if (prev <= 1) {
                    if (restIntervalRef.current) {
                        clearInterval(restIntervalRef.current);
                    }
                    setIsResting(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [restTimerSeconds]);

    const stopRestTimer = useCallback(() => {
        if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current);
        }
        setIsResting(false);
        setRestTimeLeft(0);
    }, []);

    const showUndoToast = useCallback((exIdx: number, setIdx: number) => {
        setUndoState({ exIdx, setIdx });
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
        }
        undoTimeoutRef.current = setTimeout(() => setUndoState(null), 3500);
    }, []);

    const handleComplete = useCallback(
        (exIdx: number, setIdx: number) => {
            if (!activeWorkout) return;
            const currentSet = activeWorkout.exercises[exIdx]?.sets[setIdx];
            if (!currentSet) return;

            toggleSetComplete(exIdx, setIdx);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            if (!currentSet.isCompleted) {
                showUndoToast(exIdx, setIdx);
                if (autoStartRestTimer) {
                    startRestTimer();
                }
            }
        },
        [activeWorkout, toggleSetComplete, showUndoToast, autoStartRestTimer, startRestTimer]
    );

    const handleUndo = useCallback(() => {
        if (!undoState) return;
        toggleSetComplete(undoState.exIdx, undoState.setIdx);
        setUndoState(null);
        stopRestTimer();
    }, [undoState, toggleSetComplete, stopRestTimer]);

    const handleFinish = useCallback(() => {
        if (!activeWorkout) return;

        const onConfirm = () => {
            finishWorkout();
            stopRestTimer();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
        };

        if (Platform.OS === 'web') {
            onConfirm();
            return;
        }

        Alert.alert(t('finish_workout'), '', [
            { text: t('cancel'), style: 'cancel' },
            { text: t('finish'), onPress: onConfirm },
        ]);
    }, [activeWorkout, finishWorkout, router, stopRestTimer, t]);

    const handleDiscard = useCallback(() => {
        if (!activeWorkout) return;

        const onConfirm = () => {
            discardWorkout();
            stopRestTimer();
            router.replace('/(tabs)');
        };

        if (Platform.OS === 'web') {
            onConfirm();
            return;
        }

        Alert.alert(t('discard_workout'), t('discard_confirm'), [
            { text: t('cancel'), style: 'cancel' },
            { text: t('delete'), style: 'destructive', onPress: onConfirm },
        ]);
    }, [activeWorkout, discardWorkout, router, stopRestTimer, t]);

    const handleAddExercise = useCallback(() => {
        router.push('/select-exercise');
    }, [router]);

    if (!activeWorkout) {
        return null;
    }

    return (
        <ScreenBackground style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('minimize_workout')}>
                        <MaterialIcons name="keyboard-arrow-down" size={30} color={colors.onSurface} />
                    </TouchableOpacity>
                    <Text style={[styles.timerText, { color: colors.outlineVariant, fontFamily: fontRegular }]}>
                        {formatTimer(elapsed)}
                    </Text>
                    <TouchableOpacity onPress={handleDiscard} accessibilityLabel={t('discard_workout')}>
                        <MaterialIcons name="close" size={24} color={colors.error} />
                    </TouchableOpacity>
                </View>

                <View style={styles.headerMainRow}>
                    <TextInput
                        style={[styles.nameInput, { color: colors.onSurface, fontFamily: fontBold }]}
                        value={activeWorkout.name}
                        onChangeText={renameActiveWorkout}
                        placeholder={t('new_workout')}
                        placeholderTextColor={colors.outlineVariant}
                        textAlign={isRTL ? 'right' : 'left'}
                    />
                    <TouchableOpacity
                        style={[styles.finishBtn, { backgroundColor: colors.primaryContainer }]}
                        onPress={handleFinish}
                    >
                        <Text style={[styles.finishBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
                            {t('finish')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {isResting && (
                <View style={[styles.restTimerCard, { backgroundColor: colors.surfaceContainerLow }]}>
                    <Text style={[styles.restTimerTitle, { color: colors.outlineVariant, fontFamily: fontBold }]}>
                        {t('rest_timer')}
                    </Text>
                    <Text style={[styles.restTimerValue, { color: colors.primary, fontFamily: fontBold }]}>
                        {formatTimer(restTimeLeft)}
                    </Text>
                    <TouchableOpacity
                        style={[styles.skipBtn, { backgroundColor: colors.surfaceContainerHighest }]}
                        onPress={stopRestTimer}
                    >
                        <Text style={[styles.skipBtnText, { color: colors.error, fontFamily: fontBold }]}>{t('skip')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: 128, paddingHorizontal: 16 }}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
            >
                {activeWorkout.exercises.map((exercise, exIdx) => {
                    const exerciseInfo = exercises.find((item) => item.id === exercise.exerciseId);
                    if (!exerciseInfo) return null;

                    return (
                        <View key={`${exercise.exerciseId}-${exIdx}`} style={styles.exerciseCard}>
                            <Text style={[styles.exerciseTitle, { color: colors.onSurface, fontFamily: fontBold }]}>
                                {getExerciseName(exerciseInfo, t, language)}
                            </Text>

                            {exercise.sets.map((set, setIdx) => {
                                const deleteAction = () => (
                                    <View style={[styles.deleteAction, { backgroundColor: colors.error }]}>
                                        <MaterialIcons name="delete" size={20} color={colors.onError} />
                                    </View>
                                );

                                const swipeProps = isRTL
                                    ? {
                                        renderLeftActions: deleteAction,
                                        onSwipeableLeftOpen: () => removeSet(exIdx, setIdx),
                                    }
                                    : {
                                        renderRightActions: deleteAction,
                                        onSwipeableRightOpen: () => removeSet(exIdx, setIdx),
                                    };

                                return (
                                    <Swipeable key={set.id} overshootLeft={false} overshootRight={false} {...swipeProps}>
                                        <View
                                            style={[
                                                styles.setRow,
                                                {
                                                    backgroundColor: set.isCompleted
                                                        ? colors.surfaceContainerLow
                                                        : colors.surfaceContainerHighest,
                                                    flexDirection: isRTL ? 'row-reverse' : 'row',
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.setNumber, { color: colors.outlineVariant, fontFamily: fontBold }]}>
                                                {t('set_num')} {setIdx + 1}
                                            </Text>

                                            <View style={styles.inputsRow}>
                                                <TextInput
                                                    style={[styles.input, { color: colors.onSurface, fontFamily: fontBold }]}
                                                    value={set.weight?.toString() ?? ''}
                                                    onChangeText={(value) => updateSet(exIdx, setIdx, 'weight', value ? Number(value) : null)}
                                                    placeholder={t('weight_kg')}
                                                    placeholderTextColor={colors.outlineVariant}
                                                    keyboardType="numeric"
                                                />
                                                <TextInput
                                                    style={[styles.input, { color: colors.onSurface, fontFamily: fontBold }]}
                                                    value={set.reps?.toString() ?? ''}
                                                    onChangeText={(value) => updateSet(exIdx, setIdx, 'reps', value ? Number(value) : null)}
                                                    placeholder={t('reps')}
                                                    placeholderTextColor={colors.outlineVariant}
                                                    keyboardType="numeric"
                                                />
                                            </View>

                                            <View style={[styles.actionsCol, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                                {!autoStartRestTimer && set.isCompleted && (
                                                    <TouchableOpacity
                                                        style={[styles.iconBtn, { backgroundColor: colors.surfaceContainer }]}
                                                        onPress={startRestTimer}
                                                        accessibilityLabel={t('start_rest_timer')}
                                                    >
                                                        <MaterialIcons name="schedule" size={16} color={colors.primary} />
                                                    </TouchableOpacity>
                                                )}
                                                <TouchableOpacity
                                                    style={[
                                                        styles.checkBtn,
                                                        {
                                                            backgroundColor: set.isCompleted ? colors.primary : colors.surfaceContainer,
                                                        },
                                                    ]}
                                                    onPress={() => handleComplete(exIdx, setIdx)}
                                                >
                                                    <MaterialIcons
                                                        name="check"
                                                        size={18}
                                                        color={set.isCompleted ? colors.onPrimary : colors.outlineVariant}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Swipeable>
                                );
                            })}

                            <View style={styles.exerciseActions}>
                                <TouchableOpacity
                                    style={[styles.secondaryBtn, { backgroundColor: colors.surfaceContainerLow }]}
                                    onPress={() => addSetToExercise(exIdx)}
                                >
                                    <Text style={[styles.secondaryBtnText, { color: colors.onSurface, fontFamily: fontBold }]}>
                                        + {t('add_set')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}

                <TouchableOpacity
                    style={[styles.addExerciseBtn, { backgroundColor: colors.primaryContainer }]}
                    onPress={handleAddExercise}
                >
                    <MaterialIcons name="add" size={18} color={colors.onPrimaryContainer} />
                    <Text style={[styles.addExerciseText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
                        {t('add_exercise')}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {undoState && (
                <View
                    style={[
                        styles.undoToast,
                        {
                            bottom: insets.bottom + 24,
                            backgroundColor: colors.surfaceContainerHigh,
                            borderColor: colors.outlineVariant,
                        },
                    ]}
                >
                    <Text style={[styles.undoText, { color: colors.onSurface, fontFamily: fontRegular }]}>
                        {t('set_marked_complete')}
                    </Text>
                    <TouchableOpacity onPress={handleUndo}>
                        <Text style={[styles.undoAction, { color: colors.primary, fontFamily: fontBold }]}>{t('undo')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    timerText: {
        fontSize: 14,
        letterSpacing: 1,
    },
    headerMainRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    nameInput: {
        flex: 1,
        fontSize: 22,
    },
    finishBtn: {
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    finishBtnText: {
        fontSize: 14,
    },
    restTimerCard: {
        marginHorizontal: 16,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    restTimerTitle: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    restTimerValue: {
        fontSize: 30,
    },
    skipBtn: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    skipBtnText: {
        fontSize: 12,
    },
    scroll: {
        flex: 1,
    },
    exerciseCard: {
        marginBottom: 20,
    },
    exerciseTitle: {
        fontSize: 20,
        marginBottom: 8,
    },
    setRow: {
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        alignItems: 'center',
        gap: 8,
    },
    setNumber: {
        width: 64,
        fontSize: 12,
    },
    inputsRow: {
        flex: 1,
        flexDirection: 'row',
        gap: 8,
    },
    input: {
        flex: 1,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 10,
        paddingVertical: 8,
        textAlign: 'center',
        fontSize: 15,
    },
    actionsCol: {
        alignItems: 'center',
        gap: 6,
    },
    iconBtn: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkBtn: {
        width: 34,
        height: 34,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseActions: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: 2,
    },
    secondaryBtn: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    secondaryBtnText: {
        fontSize: 12,
    },
    addExerciseBtn: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flexDirection: 'row',
    },
    addExerciseText: {
        fontSize: 14,
    },
    deleteAction: {
        width: 64,
        marginBottom: 8,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    undoToast: {
        position: 'absolute',
        left: 16,
        right: 16,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    undoText: {
        fontSize: 13,
    },
    undoAction: {
        fontSize: 13,
    },
});