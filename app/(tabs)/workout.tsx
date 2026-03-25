import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme, ScreenBackground } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import { getExerciseName, formatTimer, formatVolume } from '../../src/utils/helpers';

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const activeWorkout = useAppStore((s) => s.activeWorkout);
  const exercises = useAppStore((s) => s.exercises);
  const sessions = useAppStore((s) => s.sessions);
  const restTimerSeconds = useAppStore((s) => s.restTimerSeconds);
  const startEmptyWorkout = useAppStore((s) => s.startEmptyWorkout);
  const startWorkoutFromSession = useAppStore((s) => s.startWorkoutFromSession);
  const renameActiveWorkout = useAppStore((s) => s.renameActiveWorkout);
  const updateSet = useAppStore((s) => s.updateSet);
  const removeSet = useAppStore((s) => s.removeSet);
  const toggleSetComplete = useAppStore((s) => s.toggleSetComplete);
  const addSetToExercise = useAppStore((s) => s.addSetToExercise);
  const finishWorkout = useAppStore((s) => s.finishWorkout);
  const discardWorkout = useAppStore((s) => s.discardWorkout);
  const getLastSessionForExercise = useAppStore((s) => s.getLastSessionForExercise);

  const [search, setSearch] = useState('');

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

  const handleRepeat = (sessionId: string) => {
    startWorkoutFromSession(sessionId);
  };

  const getExName = (id: string) => {
    const ex = exercises.find((e) => e.id === id);
    return ex ? getExerciseName(ex, t, language) : id;
  };

  // ── No active workout: combined start + history screen ──────────────────────
  if (!activeWorkout) {
    const filtered = sessions.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <ScreenBackground style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.headerTitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
            {t('tab_workout')}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search past workouts */}
          <View style={[styles.searchBox, { backgroundColor: colors.surfaceContainerLow, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialIcons name="search" size={18} color={colors.outlineVariant} style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontRegular }]}
              placeholder={t('history_search')}
              placeholderTextColor={colors.outlineVariant}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* New Workout Button */}
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primaryContainer }]}
            onPress={startEmptyWorkout}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={22} color={colors.onPrimaryContainer} />
            <Text style={[styles.startBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
              {t('new_workout')}
            </Text>
          </TouchableOpacity>

          {/* Recent workouts label */}
          <Text style={[styles.sectionTitle, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold, marginBottom: 16 }]}>
            {t('recent_workouts')}
          </Text>

          {filtered.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={40} color={colors.outlineVariant} />
              <Text style={[styles.emptyText, { color: colors.outlineVariant, fontFamily: fontRegular, marginTop: 12 }]}>
                {t('no_history')}
              </Text>
            </View>
          )}

          {/* Session Cards */}
          {filtered.map((session) => {
            const topExercises = session.exercises.slice(0, 3).map((ex) => {
              const maxWeight = Math.max(...ex.sets.filter((s) => s.isCompleted).map((s) => s.weight ?? 0));
              return { name: getExName(ex.exerciseId), maxWeight };
            });

            return (
              <View
                key={session.id}
                style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
              >
                <Text style={[styles.ghostText, { color: colors.onSurface }]}>
                  {session.name.substring(0, 8).toUpperCase()}
                </Text>

                <View style={styles.cardInner}>
                  {/* Header Row */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
                        {session.name}
                      </Text>
                      <View style={styles.metaRow}>
                        <MaterialIcons name="calendar-today" size={12} color={colors.onSurfaceVariant} />
                        <Text style={[styles.metaText, { color: colors.onSurfaceVariant, fontFamily: fontRegular }]}>
                          {session.date}
                        </Text>
                        <View style={[styles.metaDot, { backgroundColor: colors.outlineVariant }]} />
                        <MaterialIcons name="timer" size={12} color={colors.onSurfaceVariant} />
                        <Text style={[styles.metaText, { color: colors.onSurfaceVariant, fontFamily: fontRegular }]}>
                          {session.durationMinutes ?? 0} {t('minutes')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.volumeContainer}>
                      <Text style={[styles.volumeValue, { color: colors.primary, fontFamily: fontBold }]}>
                        {formatVolume(session.totalVolume ?? 0)}
                      </Text>
                      <Text style={[styles.volumeLabel, { color: colors.onSurfaceVariant, fontFamily: fontBold }]}>
                        {t('kg_lifted')}
                      </Text>
                    </View>
                  </View>

                  {/* Exercise Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                    {topExercises.map((ex, i) => (
                      <View key={i} style={[styles.chip, { backgroundColor: colors.surfaceContainerHighest }]}>
                        <Text style={[styles.chipName, { color: colors.onSurface, fontFamily: fontBold }]}>{ex.name}</Text>
                        {ex.maxWeight > 0 && (
                          <Text style={[styles.chipWeight, { color: colors.primary, fontFamily: fontBold }]}>{ex.maxWeight}kg</Text>
                        )}
                      </View>
                    ))}
                  </ScrollView>

                  {/* Repeat Button */}
                  <TouchableOpacity
                    style={[styles.repeatBtn, { backgroundColor: colors.primaryContainer }]}
                    onPress={() => handleRepeat(session.id)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="replay" size={16} color={colors.onPrimaryContainer} />
                    <Text style={[styles.repeatBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
                      {t('repeat_workout')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </ScreenBackground>
    );
  }

  // ── Active workout screen ────────────────────────────────────────────────────
  const getExerciseInfo = (exerciseId: string) =>
    exercises.find((e) => e.id === exerciseId);

  return (
    <ScreenBackground style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleDiscard}>
            <MaterialIcons name="close" size={26} color={colors.error} />
          </TouchableOpacity>

          <TextInput
            style={[styles.workoutNameInput, { color: colors.primary, fontFamily: fontBold }]}
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
            <Text style={[styles.finishBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
              {t('finish')}
            </Text>
          </TouchableOpacity>
        </View>

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
              <View style={styles.exerciseHeader}>
                <Text style={[styles.exerciseLabel, { color: colors.primary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
                  {t('current_exercise')}
                </Text>
                <Text style={[styles.exerciseName, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
                  {getExerciseName(exerciseInfo, t, language)}
                </Text>
              </View>

              {workoutEx.sets.map((set, setIdx) => {
                const lastSet = lastSets?.[setIdx];
                const isActive = !set.isCompleted;
                const isCompleted = set.isCompleted;

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
                    onSwipeableOpen={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      removeSet(exIdx, setIdx);
                    }}
                    overshootRight={false}
                    overshootLeft={false}
                  >
                  <View
                    style={[
                      styles.setRow,
                      {
                        backgroundColor: isCompleted ? colors.surfaceContainerLow : colors.surfaceContainerHighest,
                        borderLeftColor: isCompleted ? colors.primaryDim : 'transparent',
                        borderLeftWidth: isCompleted ? 3 : 0,
                        opacity: isCompleted ? 0.7 : 1,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={styles.setNumberContainer}>
                      <Text style={[styles.setNumber, { color: isActive ? colors.primary : colors.outlineVariant, fontFamily: fontBold }]}>
                        {setIdx + 1}
                      </Text>
                    </View>

                    <View style={styles.inputsContainer}>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: isActive ? colors.primary : colors.outlineVariant, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
                          {t('weight_kg')}
                        </Text>
                        <View style={styles.stepperRow}>
                          <TouchableOpacity
                            style={[styles.stepperBtn, { backgroundColor: isActive ? colors.surfaceContainer : 'transparent', opacity: isCompleted ? 0.4 : 1 }]}
                            onPress={() => !isCompleted && updateSet(exIdx, setIdx, 'weight', Math.max(0, (set.weight ?? 0) - 2.5))}
                            disabled={isCompleted}
                          >
                            <MaterialIcons name="remove" size={16} color={colors.onSurface} />
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.input, styles.stepperInput, { backgroundColor: 'transparent', color: colors.onSurface, fontFamily: fontBold }]}
                            value={set.weight?.toString() ?? ''}
                            onChangeText={(v) => updateSet(exIdx, setIdx, 'weight', v ? parseFloat(v) : null)}
                            placeholder={lastSet?.weight?.toString() ?? '--'}
                            placeholderTextColor={colors.outlineVariant}
                            keyboardType="numeric"
                            editable={!isCompleted}
                          />
                          <TouchableOpacity
                            style={[styles.stepperBtn, { backgroundColor: isActive ? colors.surfaceContainer : 'transparent', opacity: isCompleted ? 0.4 : 1 }]}
                            onPress={() => !isCompleted && updateSet(exIdx, setIdx, 'weight', (set.weight ?? 0) + 2.5)}
                            disabled={isCompleted}
                          >
                            <MaterialIcons name="add" size={16} color={colors.onSurface} />
                          </TouchableOpacity>
                        </View>
                        {lastSet && (
                          <Text style={[styles.lastValue, { color: colors.outlineVariant, fontFamily: fontRegular }]}>
                            {t('last_time')}: {lastSet.weight ?? '--'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: isActive ? colors.primary : colors.outlineVariant, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
                          {t('reps')}
                        </Text>
                        <View style={styles.stepperRow}>
                          <TouchableOpacity
                            style={[styles.stepperBtn, { backgroundColor: isActive ? colors.surfaceContainer : 'transparent', opacity: isCompleted ? 0.4 : 1 }]}
                            onPress={() => !isCompleted && updateSet(exIdx, setIdx, 'reps', Math.max(0, (set.reps ?? 0) - 1))}
                            disabled={isCompleted}
                          >
                            <MaterialIcons name="remove" size={16} color={colors.onSurface} />
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.input, styles.stepperInput, { backgroundColor: 'transparent', color: colors.onSurface, fontFamily: fontBold }]}
                            value={set.reps?.toString() ?? ''}
                            onChangeText={(v) => updateSet(exIdx, setIdx, 'reps', v ? parseInt(v, 10) : null)}
                            placeholder={lastSet?.reps?.toString() ?? '--'}
                            placeholderTextColor={colors.outlineVariant}
                            keyboardType="numeric"
                            editable={!isCompleted}
                          />
                          <TouchableOpacity
                            style={[styles.stepperBtn, { backgroundColor: isActive ? colors.surfaceContainer : 'transparent', opacity: isCompleted ? 0.4 : 1 }]}
                            onPress={() => !isCompleted && updateSet(exIdx, setIdx, 'reps', (set.reps ?? 0) + 1)}
                            disabled={isCompleted}
                          >
                            <MaterialIcons name="add" size={16} color={colors.onSurface} />
                          </TouchableOpacity>
                        </View>
                        {lastSet && (
                          <Text style={[styles.lastValue, { color: colors.outlineVariant, fontFamily: fontRegular }]}>
                            {t('last_time')}: {lastSet.reps ?? '--'}
                          </Text>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.checkBtn, { backgroundColor: isCompleted ? colors.primary : colors.surfaceContainer, borderColor: isCompleted ? colors.primary : colors.outlineVariant }]}
                      onPress={() => handleComplete(exIdx, setIdx)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="check" size={24} color={isCompleted ? colors.onPrimary : colors.outlineVariant} />
                    </TouchableOpacity>
                  </View>
                  </Swipeable>
                );
              })}

              <TouchableOpacity
                style={[styles.addSetBtn, { backgroundColor: colors.surfaceContainerLow }]}
                onPress={() => addSetToExercise(exIdx)}
              >
                <Text style={[styles.addSetText, { color: colors.onSurface, fontFamily: fontBold }]}>
                  + {t('add_set')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.addExerciseBtn, { backgroundColor: colors.surfaceContainerLow }]}
          onPress={() => router.push('/select-exercise')}
        >
          <Text style={[styles.addExerciseText, { color: colors.onSurface, fontFamily: fontBold }]}>
            + {t('add_exercise')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  elapsedTimer: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Start / history screen
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 18,
    marginBottom: 20,
  },
  startBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 14 },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  emptyContainer: { alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 15 },

  // Session card
  card: {
    borderRadius: 10,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  ghostText: {
    position: 'absolute',
    top: -8,
    left: -8,
    fontSize: 60,
    fontFamily: 'SpaceGrotesk_700Bold',
    opacity: 0.03,
    letterSpacing: -2,
  },
  cardInner: { position: 'relative', zIndex: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, textTransform: 'uppercase', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12 },
  metaDot: { width: 3, height: 3, borderRadius: 2 },
  volumeContainer: { alignItems: 'flex-end' },
  volumeValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22 },
  volumeLabel: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 9, textTransform: 'uppercase', letterSpacing: 2 },
  chipsRow: { flexDirection: 'row', marginBottom: 16 },
  chip: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8, gap: 6 },
  chipName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11 },
  chipWeight: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11 },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 14,
  },
  repeatBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Rest timer
  restTimerContainer: { borderRadius: 12, padding: 24, marginBottom: 20, alignItems: 'center' },
  restTimerLabel: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 },
  restTimerValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 52, letterSpacing: -2, marginVertical: 4 },
  restTimerActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  restTimerBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  restTimerBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12 },

  // Exercise blocks
  exerciseBlock: { marginBottom: 28 },
  exerciseHeader: { marginBottom: 12 },
  exerciseLabel: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 },
  exerciseName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, textTransform: 'uppercase', letterSpacing: -0.5 },
  setRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  setNumberContainer: { width: 36, alignItems: 'center' },
  setNumber: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22 },
  inputsContainer: { flex: 1, flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  input: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, borderRadius: 8, padding: 8, textAlign: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  stepperBtn: { width: 28, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  stepperInput: { flex: 1, fontSize: 18, padding: 4 },
  deleteAction: { width: 72, marginBottom: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lastValue: { fontFamily: 'Manrope_400Regular', fontSize: 9, marginTop: 3 },
  checkBtn: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  checkIcon: { fontSize: 22, fontWeight: '800' },
  addSetBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  addSetText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  addExerciseBtn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  addExerciseText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
});
