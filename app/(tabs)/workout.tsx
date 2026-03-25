import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import { getExerciseName, formatTimer } from '../../src/utils/helpers';

export default function WorkoutScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const activeWorkout = useAppStore((s) => s.activeWorkout);
  const exercises = useAppStore((s) => s.exercises);
  const restTimerSeconds = useAppStore((s) => s.restTimerSeconds);
  const startEmptyWorkout = useAppStore((s) => s.startEmptyWorkout);
  const renameActiveWorkout = useAppStore((s) => s.renameActiveWorkout);
  const updateSet = useAppStore((s) => s.updateSet);
  const toggleSetComplete = useAppStore((s) => s.toggleSetComplete);
  const addSetToExercise = useAppStore((s) => s.addSetToExercise);
  const finishWorkout = useAppStore((s) => s.finishWorkout);
  const discardWorkout = useAppStore((s) => s.discardWorkout);
  const getLastSessionForExercise = useAppStore((s) => s.getLastSessionForExercise);

  // Rest timer
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Workout elapsed timer
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeWorkout) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeWorkout.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout?.startTime]);

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

  const handleComplete = (exIdx: number, setIdx: number) => {
    toggleSetComplete(exIdx, setIdx);
    const set = activeWorkout?.exercises[exIdx]?.sets[setIdx];
    if (set && !set.isCompleted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startRestTimer();
    }
  };

  const handleFinish = () => {
    Alert.alert(t('finish_workout'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('finish'),
        onPress: () => {
          finishWorkout();
          if (restIntervalRef.current) clearInterval(restIntervalRef.current);
        },
      },
    ]);
  };

  const handleDiscard = () => {
    Alert.alert(t('discard_workout'), t('discard_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          discardWorkout();
          if (restIntervalRef.current) clearInterval(restIntervalRef.current);
        },
      },
    ]);
  };

  // No active workout — show start screen
  if (!activeWorkout) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.headerTitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('tab_workout')}
          </Text>
        </View>
        <View style={styles.emptyCenter}>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primaryContainer }]}
            onPress={startEmptyWorkout}
            activeOpacity={0.8}
          >
            <Text style={[styles.startBtnText, { color: colors.onPrimaryContainer }]}>
              + {t('new_workout')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getExerciseInfo = (exerciseId: string) =>
    exercises.find((e) => e.id === exerciseId);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleDiscard}>
            <Text style={[styles.headerAction, { color: colors.error }]}>✕</Text>
          </TouchableOpacity>

          {/* Editable workout name */}
          <TextInput
            style={[styles.workoutNameInput, { color: colors.primary }]}
            value={activeWorkout.name}
            onChangeText={renameActiveWorkout}
            placeholder={t('new_workout')}
            placeholderTextColor={colors.outlineVariant}
            textAlign="center"
          />

          <TouchableOpacity
            style={[styles.finishBtn, { backgroundColor: colors.primaryContainer }]}
            onPress={handleFinish}
          >
            <Text style={[styles.finishBtnText, { color: colors.onPrimaryContainer }]}>
              {t('finish')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timer bar */}
        <Text style={[styles.elapsedTimer, { color: colors.outlineVariant }]}>
          {formatTimer(elapsed)}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Rest Timer */}
        {isResting && (
          <View style={[styles.restTimerContainer, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text style={[styles.restTimerLabel, { color: colors.outlineVariant }]}>
              {t('rest_timer')}
            </Text>
            <Text style={[styles.restTimerValue, { color: colors.primary }]}>
              {formatTimer(restTimeLeft)}
            </Text>
            <View style={styles.restTimerActions}>
              <TouchableOpacity
                style={[styles.restTimerBtn, { backgroundColor: colors.surfaceContainerHighest }]}
                onPress={() => setRestTimeLeft((p) => p + 30)}
              >
                <Text style={[styles.restTimerBtnText, { color: colors.onSurface }]}>+30s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.restTimerBtn, { backgroundColor: colors.surfaceContainerHighest }]}
                onPress={() => {
                  setIsResting(false);
                  if (restIntervalRef.current) clearInterval(restIntervalRef.current);
                }}
              >
                <Text style={[styles.restTimerBtnText, { color: colors.error }]}>{t('skip')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Exercise Blocks */}
        {activeWorkout.exercises.map((workoutEx, exIdx) => {
          const exerciseInfo = getExerciseInfo(workoutEx.exerciseId);
          if (!exerciseInfo) return null;
          const lastSets = getLastSessionForExercise(workoutEx.exerciseId);

          return (
            <View key={`${workoutEx.exerciseId}-${exIdx}`} style={styles.exerciseBlock}>
              {/* Exercise Header */}
              <View style={styles.exerciseHeader}>
                <Text style={[styles.exerciseLabel, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('current_exercise')}
                </Text>
                <Text style={[styles.exerciseName, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left' }]}>
                  {getExerciseName(exerciseInfo, t, language)}
                </Text>
              </View>

              {/* Sets */}
              {workoutEx.sets.map((set, setIdx) => {
                const lastSet = lastSets?.[setIdx];
                const isActive = !set.isCompleted;
                const isCompleted = set.isCompleted;

                return (
                  <View
                    key={set.id}
                    style={[
                      styles.setRow,
                      {
                        backgroundColor: isCompleted
                          ? colors.surfaceContainerLow
                          : isActive
                          ? colors.surfaceContainerHighest
                          : colors.surfaceContainerLow,
                        borderLeftColor: isCompleted ? colors.primaryDim : 'transparent',
                        borderLeftWidth: isCompleted ? 3 : 0,
                        opacity: isCompleted ? 0.7 : 1,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    {/* Set Number */}
                    <View style={styles.setNumberContainer}>
                      <Text
                        style={[
                          styles.setNumber,
                          { color: isActive ? colors.primary : colors.outlineVariant },
                        ]}
                      >
                        {setIdx + 1}
                      </Text>
                    </View>

                    {/* Weight & Reps */}
                    <View style={styles.inputsContainer}>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: isActive ? colors.primary : colors.outlineVariant, textAlign: isRTL ? 'right' : 'left' }]}>
                          {t('weight_kg')}
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              backgroundColor: isActive ? colors.surfaceContainer : 'transparent',
                              color: colors.onSurface,
                            },
                          ]}
                          value={set.weight?.toString() ?? ''}
                          onChangeText={(v) =>
                            updateSet(exIdx, setIdx, 'weight', v ? parseFloat(v) : null)
                          }
                          placeholder={lastSet?.weight?.toString() ?? '--'}
                          placeholderTextColor={colors.outlineVariant}
                          keyboardType="numeric"
                          editable={!isCompleted}
                        />
                        {lastSet && (
                          <Text style={[styles.lastValue, { color: colors.outlineVariant }]}>
                            {t('last_time')}: {lastSet.weight ?? '--'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: isActive ? colors.primary : colors.outlineVariant, textAlign: isRTL ? 'right' : 'left' }]}>
                          {t('reps')}
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              backgroundColor: isActive ? colors.surfaceContainer : 'transparent',
                              color: colors.onSurface,
                            },
                          ]}
                          value={set.reps?.toString() ?? ''}
                          onChangeText={(v) =>
                            updateSet(exIdx, setIdx, 'reps', v ? parseInt(v, 10) : null)
                          }
                          placeholder={lastSet?.reps?.toString() ?? '--'}
                          placeholderTextColor={colors.outlineVariant}
                          keyboardType="numeric"
                          editable={!isCompleted}
                        />
                        {lastSet && (
                          <Text style={[styles.lastValue, { color: colors.outlineVariant }]}>
                            {t('last_time')}: {lastSet.reps ?? '--'}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Check Button */}
                    <TouchableOpacity
                      style={[
                        styles.checkBtn,
                        {
                          backgroundColor: isCompleted ? colors.primary : colors.surfaceContainer,
                          borderColor: isCompleted ? colors.primary : colors.outlineVariant,
                        },
                      ]}
                      onPress={() => handleComplete(exIdx, setIdx)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.checkIcon,
                          { color: isCompleted ? colors.onPrimary : colors.outlineVariant },
                        ]}
                      >
                        ✓
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Add Set Button */}
              <TouchableOpacity
                style={[styles.addSetBtn, { backgroundColor: colors.surfaceContainerLow }]}
                onPress={() => addSetToExercise(exIdx)}
              >
                <Text style={[styles.addSetText, { color: colors.onSurface }]}>
                  + {t('add_set')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add Exercise Button */}
        <TouchableOpacity
          style={[styles.addExerciseBtn, { backgroundColor: colors.surfaceContainerLow }]}
          onPress={() => router.push('/select-exercise')}
        >
          <Text style={[styles.addExerciseText, { color: colors.onSurface }]}>
            + {t('add_exercise')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAction: { fontSize: 22, fontWeight: '700' },
  workoutNameInput: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    textTransform: 'uppercase',
    flex: 1,
    marginHorizontal: 12,
  },
  finishBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  finishBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
  },
  elapsedTimer: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  startBtn: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  startBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Rest Timer
  restTimerContainer: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  restTimerLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  restTimerValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 52,
    letterSpacing: -2,
    marginVertical: 4,
  },
  restTimerActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  restTimerBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  restTimerBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
  },

  // Exercise
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

  // Set Row
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  setNumberContainer: { width: 36, alignItems: 'center' },
  setNumber: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
  },
  inputsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: { flex: 1 },
  inputLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  input: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
  },
  lastValue: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    marginTop: 3,
  },
  checkBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  checkIcon: {
    fontSize: 22,
    fontWeight: '800',
  },

  addSetBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addSetText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addExerciseBtn: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  addExerciseText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
