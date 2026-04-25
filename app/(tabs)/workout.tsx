import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import Animated, { SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme, ScreenBackground } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import { getExerciseName, formatTimer } from '../../src/utils/helpers';
import { SessionCard } from '../../src/components/SessionCard';

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const isCompactWidth = screenWidth < 390;
  const isVeryCompactWidth = screenWidth < 360;

  const activeWorkout = useAppStore((s) => s.activeWorkout);
  const exercises = useAppStore((s) => s.exercises);
  const sessions = useAppStore((s) => s.sessions);
  const restTimerSeconds = useAppStore((s) => s.restTimerSeconds);
  const startWorkoutFromSession = useAppStore((s) => s.startWorkoutFromSession);
  const startEmptyWorkout = useAppStore((s) => s.startEmptyWorkout);
  const saveActiveWorkout = useAppStore((s) => s.saveActiveWorkout);
  const startActiveWorkout = useAppStore((s) => s.startActiveWorkout);
  const renameActiveWorkout = useAppStore((s) => s.renameActiveWorkout);
  const updateSet = useAppStore((s) => s.updateSet);
  const removeSet = useAppStore((s) => s.removeSet);
  const toggleSetComplete = useAppStore((s) => s.toggleSetComplete);
  const addSetToExercise = useAppStore((s) => s.addSetToExercise);
  const finishWorkout = useAppStore((s) => s.finishWorkout);
  const discardWorkout = useAppStore((s) => s.discardWorkout);
  const getLastSessionForExercise = useAppStore((s) => s.getLastSessionForExercise);
  const updateCustomExercise = useAppStore((s) => s.updateCustomExercise);

  // Rest timer
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Workout elapsed timer
  const [elapsed, setElapsed] = useState(0);

  // Renaming
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const lastTitleTapRef = useRef<{ id: string; time: number } | null>(null);

  useEffect(() => {
    if (!activeWorkout || activeWorkout.mode !== 'inProgress' || !activeWorkout.startedAt) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeWorkout.startedAt!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout?.startedAt, activeWorkout?.mode]);

  useEffect(() => {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
    setIsResting(false);
    setRestTimeLeft(0);
  }, [activeWorkout?.id]);

  const startRestTimer = useCallback(() => {
    setRestTimeLeft(restTimerSeconds);
    setIsResting(true);
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    restIntervalRef.current = setInterval(() => {
      setRestTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(restIntervalRef.current!);
          setIsResting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [restTimerSeconds]);

  const stopRestTimer = useCallback(() => {
    setIsResting(false);
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
  }, []);

  const handleComplete = useCallback(
    (exIdx: number, setIdx: number) => {
      if (activeWorkout?.mode !== 'inProgress') return;
      toggleSetComplete(exIdx, setIdx);
      const set = activeWorkout?.exercises[exIdx]?.sets[setIdx];
      if (set && !set.isCompleted) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        startRestTimer();
      }
    },
    [activeWorkout, toggleSetComplete, startRestTimer]
  );

  const handleFinish = useCallback(() => {
    if (activeWorkout?.mode !== 'inProgress') return;
    if (Platform.OS === 'web') {
      const confirmed =
        typeof globalThis.confirm === 'function'
          ? globalThis.confirm(t('finish_workout'))
          : true;
      if (confirmed) {
        finishWorkout();
        stopRestTimer();
      }
      return;
    }
    Alert.alert(t('finish_workout'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('finish'),
        onPress: () => {
          finishWorkout();
          stopRestTimer();
        },
      },
    ]);
  }, [activeWorkout, t, finishWorkout, stopRestTimer]);

  const handleDiscard = useCallback(() => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof globalThis.confirm === 'function'
          ? globalThis.confirm(`${t('discard_workout')}\n${t('discard_confirm')}`)
          : true;
      if (confirmed) {
        discardWorkout();
        stopRestTimer();
      }
      return;
    }
    Alert.alert(t('discard_workout'), t('discard_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          discardWorkout();
          stopRestTimer();
        },
      },
    ]);
  }, [t, discardWorkout, stopRestTimer]);

  const handleRepeat = useCallback(
    (sessionId: string) => {
      startWorkoutFromSession(sessionId);
    },
    [startWorkoutFromSession]
  );

  const handleSave = useCallback(() => {
    if (!activeWorkout || activeWorkout.exercises.length === 0) {
      Alert.alert(t('save'), t('add_exercise'));
      return;
    }
    saveActiveWorkout();
    router.push('/(tabs)');
  }, [activeWorkout, t, saveActiveWorkout, router]);

  const handleStartWorkout = useCallback(() => {
    if (!activeWorkout || activeWorkout.exercises.length === 0) {
      Alert.alert(t('start_workout'), t('add_exercise'));
      return;
    }
    startActiveWorkout();
  }, [activeWorkout, t, startActiveWorkout]);

  const handleNewWorkout = useCallback(() => {
    startEmptyWorkout();
  }, [startEmptyWorkout]);

  const handleTitlePress = (exercise: Exercise) => {
    if (!exercise.isCustom) return;
    const now = Date.now();
    if (lastTitleTapRef.current?.id === exercise.id && (now - lastTitleTapRef.current.time) < 300) {
      // Double tap
      setEditingExercise(exercise);
      setNewExerciseName(getExerciseName(exercise, t, language));
      lastTitleTapRef.current = null;
    } else {
      lastTitleTapRef.current = { id: exercise.id, time: now };
    }
  };

  const handleRenameExercise = () => {
    if (editingExercise && newExerciseName.trim()) {
      updateCustomExercise(editingExercise.id, newExerciseName.trim(), language);
      setEditingExercise(null);
      setNewExerciseName('');
    }
  };

  const getExerciseInfo = useCallback(
    (exerciseId: string) => exercises.find((e) => e.id === exerciseId),
    [exercises]
  );

  // ── No active workout: start or quick-repeat ─────────────────────────────
  if (!activeWorkout) {
    const recentSessions = sessions.slice(0, 3);

    return (
      <ScreenBackground style={styles.container}>
        <View style={[styles.header, { paddingTop: 12 }]}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.primary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
            ]}
          >
            {t('tab_workout')}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.idleContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          nestedScrollEnabled={true}
        >
          {/* Start New Workout */}
          <TouchableOpacity
            style={[styles.newWorkoutBtn, { backgroundColor: colors.primaryContainer }]}
            onPress={handleNewWorkout}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('new_workout')}
          >
            <MaterialIcons name="add" size={22} color={colors.onPrimaryContainer} />
            <Text
              style={[styles.newWorkoutBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}
            >
              {t('new_workout')}
            </Text>
          </TouchableOpacity>

          {recentSessions.length > 0 && (
            <>
              {/* Section Header */}
              <View style={styles.recentHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
                  ]}
                >
                  {t('recent_workouts')}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/history')}
                  accessibilityRole="link"
                  accessibilityLabel={t('history_title')}
                >
                  <Text style={[styles.seeAllLink, { color: colors.primary, fontFamily: fontBold }]}>
                    {t('history_title')} →
                  </Text>
                </TouchableOpacity>
              </View>

              {recentSessions.map((session) => (
                <SessionCard key={session.id} session={session} onRepeat={handleRepeat} />
              ))}
            </>
          )}

          {recentSessions.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="fitness-center" size={48} color={colors.outlineVariant} />
              <Text
                style={[styles.emptyText, { color: colors.outlineVariant, fontFamily: fontRegular }]}
              >
                {t('no_history')}
              </Text>
            </View>
          )}
        </ScrollView>
      </ScreenBackground>
    );
  }

  // ── Active workout screen ─────────────────────────────────────────────────
  const isDraftWorkout = activeWorkout.mode === 'draft';
  const isInProgressWorkout = activeWorkout.mode === 'inProgress';

  return (
    <ScreenBackground style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleDiscard}
            accessibilityRole="button"
            accessibilityLabel={t('discard_workout')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={26} color={colors.error} />
          </TouchableOpacity>

          <TextInput
            style={[styles.workoutNameInput, { color: colors.primary, fontFamily: fontBold }]}
            value={activeWorkout.name}
            onChangeText={renameActiveWorkout}
            placeholder={t('new_workout')}
            placeholderTextColor={colors.outlineVariant}
            textAlign="center"
            editable={isDraftWorkout}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.finishBtn, { backgroundColor: colors.primaryContainer }]}
            onPress={isDraftWorkout ? handleSave : handleFinish}
            accessibilityRole="button"
            accessibilityLabel={isDraftWorkout ? t('save') : t('finish')}
          >
            <Text
              style={[styles.finishBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}
            >
              {isDraftWorkout ? t('save') : t('finish')}
            </Text>
          </TouchableOpacity>
        </View>

        {isInProgressWorkout && (
          <Text style={[styles.elapsedTimer, { color: colors.outlineVariant }]}>
            {formatTimer(elapsed)}
          </Text>
        )}

        {isDraftWorkout && (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primaryContainer }]}
            onPress={handleStartWorkout}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('start_workout')}
          >
            <MaterialIcons name="play-arrow" size={18} color={colors.onPrimaryContainer} />
            <Text
              style={[styles.startBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}
            >
              {t('start_workout')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Floating rest timer — outside ScrollView so it stays visible while scrolling */}
      {isInProgressWorkout && isResting && (
        <View style={[styles.restTimerContainer, { backgroundColor: colors.surfaceContainerLow }]}>
          <Text style={[styles.restTimerLabel, { color: colors.outlineVariant, fontFamily: fontBold }]}>
            {t('rest_timer')}
          </Text>
          <Text style={[styles.restTimerValue, { color: colors.primary, fontFamily: fontBold }]}>
            {formatTimer(restTimeLeft)}
          </Text>
          <View style={styles.restTimerActions}>
            <TouchableOpacity
              style={[styles.restTimerBtn, { backgroundColor: colors.surfaceContainerHighest }]}
              onPress={() => setRestTimeLeft((p) => p + 30)}
              accessibilityRole="button"
              accessibilityLabel="+30s"
            >
              <Text style={[styles.restTimerBtnText, { color: colors.onSurface, fontFamily: fontBold }]}>
                +30s
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.restTimerBtn, { backgroundColor: colors.surfaceContainerHighest }]}
              onPress={stopRestTimer}
              accessibilityRole="button"
              accessibilityLabel={t('skip')}
            >
              <Text style={[styles.restTimerBtnText, { color: colors.error, fontFamily: fontBold }]}>
                {t('skip')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        {/* Exercise Blocks */}
        {activeWorkout.exercises.map((workoutEx, exIdx) => {
          const exerciseInfo = getExerciseInfo(workoutEx.exerciseId);
          if (!exerciseInfo) return null;
          const lastSets = getLastSessionForExercise(workoutEx.exerciseId);

          return (
            <View key={`${workoutEx.exerciseId}-${exIdx}`} style={styles.exerciseBlock}>
              <View style={styles.exerciseHeader}>
                <Text
                  style={[
                    styles.exerciseLabel,
                    { color: colors.primary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
                  ]}
                >
                  {t('current_exercise')}
                </Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => handleTitlePress(exerciseInfo)}>
                  <Text
                    style={[
                      styles.exerciseName,
                      { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
                    ]}
                  >
                    {getExerciseName(exerciseInfo, t, language)}
                  </Text>
                </TouchableOpacity>
              </View>

              {workoutEx.sets.map((set, setIdx) => {
                const lastSet = lastSets?.[setIdx];
                const isActive = !set.isCompleted;
                const isCompleted = set.isCompleted;
                const canEditSetValues = isDraftWorkout || isInProgressWorkout;

                const renderDeleteAction = () => (
                  <View style={[styles.deleteAction, { backgroundColor: colors.error }]}>
                    <MaterialIcons name="delete" size={24} color="#fff" />
                  </View>
                );

                return (
                  <Swipeable
                    key={set.id}
                    renderRightActions={renderDeleteAction}
                    renderLeftActions={renderDeleteAction}
                    enabled={isDraftWorkout}
                    onSwipeableOpen={() => {
                      if (!isDraftWorkout) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      removeSet(exIdx, setIdx);
                    }}
                    overshootRight={false}
                    overshootLeft={false}
                  >
                    <View
                      style={[
                        styles.setRow,
                        isCompactWidth && styles.setRowCompact,
                        {
                          backgroundColor: isCompleted
                            ? colors.surfaceContainerLow
                            : colors.surfaceContainerHighest,
                          borderLeftColor: isCompleted ? colors.primaryDim : 'transparent',
                          borderLeftWidth: isCompleted ? 3 : 0,
                          opacity: isCompleted ? 0.7 : 1,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.setNumberContainer,
                          isCompactWidth && styles.setNumberContainerCompact,
                        ]}
                      >
                        <Text
                          style={[
                            styles.setNumber,
                            isVeryCompactWidth && styles.setNumberVeryCompact,
                            {
                              color: isActive ? colors.primary : colors.outlineVariant,
                              fontFamily: fontBold,
                            },
                          ]}
                        >
                          {setIdx + 1}
                        </Text>
                      </View>

                      <View style={styles.inputsContainer}>
                        {/* Weight input */}
                        <View style={styles.inputGroup}>
                          <Text
                            style={[
                              styles.inputLabel,
                              isVeryCompactWidth && styles.inputLabelVeryCompact,
                              {
                                color: isActive ? colors.primary : colors.outlineVariant,
                                textAlign: isRTL ? 'right' : 'left',
                                fontFamily: fontBold,
                              },
                            ]}
                          >
                            {t('weight_kg')}
                          </Text>
                          <View
                            style={[
                              styles.stepperRow,
                              isVeryCompactWidth && styles.stepperRowVeryCompact,
                            ]}
                          >
                            <TextInput
                              style={[
                                styles.input,
                                styles.stepperInput,
                                isVeryCompactWidth && styles.stepperInputVeryCompact,
                                {
                                  backgroundColor: 'transparent',
                                  color: colors.onSurface,
                                  fontFamily: fontBold,
                                },
                              ]}
                              value={set.weight?.toString() ?? ''}
                              onChangeText={(v) =>
                                updateSet(exIdx, setIdx, 'weight', v || null)
                              }
                              placeholder={lastSet?.weight?.toString() ?? '--'}
                              placeholderTextColor={colors.outlineVariant}
                              keyboardType="decimal-pad"
                              editable={canEditSetValues}
                              returnKeyType="next"
                              accessibilityLabel={`${t('weight_kg')} ${t('set_num')} ${setIdx + 1}`}
                            />
                            <View style={styles.stepperButtonsColumn}>
                              <TouchableOpacity
                                style={[
                                  styles.stepperBtnSmall,
                                  isVeryCompactWidth && styles.stepperBtnVeryCompact,
                                  {
                                    backgroundColor: isActive
                                      ? colors.surfaceContainer
                                      : 'transparent',
                                    opacity: canEditSetValues ? 1 : 0.4,
                                  },
                                ]}
                                onPress={() =>
                                  canEditSetValues &&
                                  updateSet(exIdx, setIdx, 'weight', (parseFloat(set.weight ?? '0') + 2.5).toString())
                                }
                                disabled={!canEditSetValues}
                                accessibilityRole="button"
                                accessibilityLabel="+2.5kg"
                              >
                                <MaterialIcons
                                  name="add"
                                  size={isVeryCompactWidth ? 12 : 14}
                                  color={colors.onSurface}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.stepperBtnSmall,
                                  isVeryCompactWidth && styles.stepperBtnVeryCompact,
                                  {
                                    backgroundColor: isActive
                                      ? colors.surfaceContainer
                                      : 'transparent',
                                    opacity: canEditSetValues ? 1 : 0.4,
                                  },
                                ]}
                                onPress={() =>
                                  canEditSetValues &&
                                  updateSet(
                                    exIdx,
                                    setIdx,
                                    'weight',
                                    Math.max(0, parseFloat(set.weight ?? '0') - 2.5).toString()
                                  )
                                }
                                disabled={!canEditSetValues}
                                accessibilityRole="button"
                                accessibilityLabel="-2.5kg"
                              >
                                <MaterialIcons
                                  name="remove"
                                  size={isVeryCompactWidth ? 12 : 14}
                                  color={colors.onSurface}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                          {lastSet && (
                            <Text
                              style={[
                                styles.lastValue,
                                isVeryCompactWidth && styles.lastValueVeryCompact,
                                { color: colors.outlineVariant, fontFamily: fontRegular },
                              ]}
                            >
                              {t('last_time')}: {lastSet.weight ?? '--'}
                            </Text>
                          )}
                        </View>

                        {/* Reps input */}
                        <View style={styles.inputGroup}>
                          <Text
                            style={[
                              styles.inputLabel,
                              isVeryCompactWidth && styles.inputLabelVeryCompact,
                              {
                                color: isActive ? colors.primary : colors.outlineVariant,
                                textAlign: isRTL ? 'right' : 'left',
                                fontFamily: fontBold,
                              },
                            ]}
                          >
                            {t('reps')}
                          </Text>
                          <View
                            style={[
                              styles.stepperRow,
                              isVeryCompactWidth && styles.stepperRowVeryCompact,
                            ]}
                          >
                            <TextInput
                              style={[
                                styles.input,
                                styles.stepperInput,
                                isVeryCompactWidth && styles.stepperInputVeryCompact,
                                {
                                  backgroundColor: 'transparent',
                                  color: colors.onSurface,
                                  fontFamily: fontBold,
                                },
                              ]}
                              value={set.reps?.toString() ?? ''}
                              onChangeText={(v) =>
                                updateSet(exIdx, setIdx, 'reps', v || null)
                              }
                              placeholder={lastSet?.reps?.toString() ?? '--'}
                              placeholderTextColor={colors.outlineVariant}
                              keyboardType="numeric"
                              editable={canEditSetValues}
                              returnKeyType="done"
                              accessibilityLabel={`${t('reps')} ${t('set_num')} ${setIdx + 1}`}
                            />
                            <View style={styles.stepperButtonsColumn}>
                              <TouchableOpacity
                                style={[
                                  styles.stepperBtnSmall,
                                  isVeryCompactWidth && styles.stepperBtnVeryCompact,
                                  {
                                    backgroundColor: isActive
                                      ? colors.surfaceContainer
                                      : 'transparent',
                                    opacity: canEditSetValues ? 1 : 0.4,
                                  },
                                ]}
                                onPress={() =>
                                  canEditSetValues &&
                                  updateSet(exIdx, setIdx, 'reps', (parseInt(set.reps?.toString() ?? '0', 10) + 1).toString())
                                }
                                disabled={!canEditSetValues}
                                accessibilityRole="button"
                                accessibilityLabel="+1 rep"
                              >
                                <MaterialIcons
                                  name="add"
                                  size={isVeryCompactWidth ? 12 : 14}
                                  color={colors.onSurface}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.stepperBtnSmall,
                                  isVeryCompactWidth && styles.stepperBtnVeryCompact,
                                  {
                                    backgroundColor: isActive
                                      ? colors.surfaceContainer
                                      : 'transparent',
                                    opacity: canEditSetValues ? 1 : 0.4,
                                  },
                                ]}
                                onPress={() =>
                                  canEditSetValues &&
                                  updateSet(
                                    exIdx,
                                    setIdx,
                                    'reps',
                                    Math.max(0, parseInt(set.reps?.toString() ?? '0', 10) - 1).toString()
                                  )
                                }
                                disabled={!canEditSetValues}
                                accessibilityRole="button"
                                accessibilityLabel="-1 rep"
                              >
                                <MaterialIcons
                                  name="remove"
                                  size={isVeryCompactWidth ? 12 : 14}
                                  color={colors.onSurface}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                          {lastSet && (
                            <Text
                              style={[
                                styles.lastValue,
                                isVeryCompactWidth && styles.lastValueVeryCompact,
                                { color: colors.outlineVariant, fontFamily: fontRegular },
                              ]}
                            >
                              {t('last_time')}: {lastSet.reps ?? '--'}
                            </Text>
                          )}
                        </View>
                      </View>

                      {isInProgressWorkout && (
                        <TouchableOpacity
                          style={[
                            styles.checkBtn,
                            isCompactWidth && styles.checkBtnCompact,
                            isVeryCompactWidth && styles.checkBtnVeryCompact,
                            {
                              backgroundColor: isCompleted
                                ? colors.primary
                                : colors.surfaceContainer,
                              borderColor: isCompleted ? colors.primary : colors.outlineVariant,
                            },
                          ]}
                          onPress={() => handleComplete(exIdx, setIdx)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityState={{ checked: isCompleted }}
                          accessibilityLabel={`${t('set_num')} ${setIdx + 1} ${isCompleted ? t('done') : t('start')}`}
                        >
                          <MaterialIcons
                            name="check"
                            size={isVeryCompactWidth ? 20 : 24}
                            color={isCompleted ? colors.onPrimary : colors.outlineVariant}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </Swipeable>
                );
              })}

              {isDraftWorkout && (
                <TouchableOpacity
                  style={[styles.addSetBtn, { backgroundColor: colors.surfaceContainerLow }]}
                  onPress={() => addSetToExercise(exIdx)}
                  accessibilityRole="button"
                  accessibilityLabel={t('add_set')}
                >
                  <Text style={[styles.addSetText, { color: colors.onSurface, fontFamily: fontBold }]}>
                    + {t('add_set')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {isDraftWorkout && (
          <TouchableOpacity
            style={[styles.addExerciseBtn, { backgroundColor: colors.surfaceContainerLow }]}
            onPress={() => router.push('/select-exercise')}
            accessibilityRole="button"
            accessibilityLabel={t('add_exercise')}
          >
            <Text style={[styles.addExerciseText, { color: colors.onSurface, fontFamily: fontBold }]}>
              + {t('add_exercise')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Renaming Modal */}
      <Modal
        visible={!!editingExercise}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingExercise(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditingExercise(null)}>
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutUp}
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surfaceContainer,
                paddingTop: insets.top + 24
              }
            ]}
          >
            <Pressable onPress={() => { }}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
                ]}
              >
                {t('edit_exercise' as any)}
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: colors.surfaceContainerLow, color: colors.onSurface, textAlign: isRTL ? 'right' : 'left' },
                ]}
                placeholder={t('exercise_name')}
                placeholderTextColor={colors.outlineVariant}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleRenameExercise}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.surfaceContainerHighest }]}
                  onPress={() => setEditingExercise(null)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.onSurface, fontFamily: fontBold }]}>
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primaryContainer }]}
                  onPress={handleRenameExercise}
                >
                  <Text style={[styles.modalBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
                    {t('save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workoutNameInput: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    textTransform: 'uppercase',
    flex: 1,
    marginHorizontal: 12,
  },
  finishBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  finishBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13 },
  startBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  startBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  elapsedTimer: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 2,
  },

  // Floating rest timer
  restTimerContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  restTimerLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  restTimerValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 40,
    letterSpacing: -2,
  },
  restTimerActions: { flexDirection: 'row', gap: 8 },
  restTimerBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  restTimerBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Idle screen
  idleContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    paddingTop: 8,
  },
  newWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 20,
    marginBottom: 32,
  },
  newWorkoutBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  seeAllLink: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: { alignItems: 'center', paddingTop: 48, gap: 16 },
  emptyText: { fontSize: 15 },

  // Exercise blocks
  exerciseBlock: { marginBottom: 28 },
  exerciseHeader: { marginBottom: 12 },
  exerciseLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  exerciseName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  setRowCompact: { paddingHorizontal: 10, paddingVertical: 12, gap: 8 },
  setNumberContainer: { width: 36, alignItems: 'center' },
  setNumberContainerCompact: { width: 28 },
  setNumber: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22 },
  setNumberVeryCompact: { fontSize: 18 },
  inputsContainer: { flex: 1, flexDirection: 'row', gap: 8, minWidth: 0 },
  inputGroup: { flex: 1, minWidth: 0 },
  inputLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  inputLabelVeryCompact: { fontSize: 9, letterSpacing: 1.4 },
  input: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperRowVeryCompact: { gap: 4 },
  stepperButtonsColumn: { gap: 4 },
  stepperBtnSmall: {
    width: 22,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnVeryCompact: { width: 20, height: 18, borderRadius: 4 },
  stepperInput: { flex: 1, minWidth: 0, fontSize: 18, paddingVertical: 6, paddingHorizontal: 4 },
  stepperInputVeryCompact: { fontSize: 16, paddingVertical: 4 },
  deleteAction: {
    width: 72,
    marginBottom: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastValue: { fontFamily: 'Manrope_400Regular', fontSize: 10, marginTop: 3 },
  lastValueVeryCompact: { fontSize: 9 },
  checkBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  checkBtnCompact: { width: 44, height: 44 },
  checkBtnVeryCompact: { width: 40, height: 40 },
  addSetBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  addSetText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addExerciseBtn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  addExerciseText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  modalInput: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
