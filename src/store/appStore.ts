import { create } from 'zustand';
import { getJSON, setJSON, hydrateCache } from '../storage/storage';
import { defaultExercises } from '../data/exercises';
import * as Crypto from 'expo-crypto';
import type { LocaleCode } from '../i18n/locales';
import { saveStrengthWorkout, initHealthKit } from '../utils/health';

const uuid = () => Crypto.randomUUID();
import type {
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  ActiveWorkout,
  SetRecord,
  WorkoutExercise,
  BodyPart,
} from '../types';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'green' | 'purple' | 'orange';

interface AppState {
  language: LocaleCode;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  restTimerSeconds: number;
  autoStartRestTimer: boolean;
  weeklyGoal: number;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  activeWorkout: ActiveWorkout | null;

  // Actions
  setLanguage: (lang: LocaleCode) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (accent: AccentColor) => void;
  setRestTimerSeconds: (s: number) => void;
  setAutoStartRestTimer: (enabled: boolean) => void;
  setWeeklyGoal: (goal: number) => void;

  // Exercises
  addCustomExercise: (name: string, bodyPart: BodyPart, language: string) => void;
  deleteCustomExercise: (exerciseId: string) => void;

  // Templates
  addTemplate: (template: WorkoutTemplate) => void;
  updateTemplate: (template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;

  // Active Workout
  startWorkoutFromTemplate: (templateId: string) => void;
  startEmptyWorkout: () => void;
  startWorkoutFromSession: (sessionId: string) => void;
  saveActiveWorkout: () => void;
  startActiveWorkout: () => void;
  renameActiveWorkout: (name: string) => void;
  addExerciseToWorkout: (exerciseId: string) => void;
  addSetToExercise: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number | null) => void;
  toggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
  finishWorkout: () => void;
  discardWorkout: () => void;

  // History helpers
  getLastSessionForExercise: (exerciseId: string) => SetRecord[] | null;
  getLastSessionForTemplate: (templateId: string) => WorkoutSession | null;
  hideRecentSession: (id: string) => void;
  deleteSession: (id: string) => void;

  // Hydrate
  hydrate: () => Promise<void>;
}

const KEYS = {
  language: 'app_language',
  theme: 'app_theme',
  accent: 'app_accent_color',
  restTimer: 'app_rest_timer',
  autoStartRestTimer: 'app_auto_start_rest_timer',
  weeklyGoal: 'app_weekly_goal',
  exercises: 'app_exercises',
  templates: 'app_templates',
  sessions: 'app_sessions',
  activeWorkout: 'app_active_workout',
};

function normalizeTemplate(template: WorkoutTemplate & { exercises: any[] }): WorkoutTemplate {
  return {
    ...template,
    exercises: template.exercises.map((exercise: any) => ({
      exerciseId: exercise.exerciseId,
      sets: exercise.sets ?? exercise.targetSets ?? 3,
      reps: exercise.reps ?? exercise.targetReps ?? exercise.lastReps ?? 10,
      weight:
        exercise.weight != null
          ? exercise.weight
          : exercise.lastWeight != null
            ? exercise.lastWeight
            : null,
    })),
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  language: 'he',
  themeMode: 'dark',
  accentColor: 'green',
  restTimerSeconds: 90,
  autoStartRestTimer: true,
  weeklyGoal: 4,
  exercises: defaultExercises,
  templates: [],
  sessions: [],
  activeWorkout: null,

  setLanguage: (lang) => {
    set({ language: lang });
    setJSON(KEYS.language, lang);
  },

  setThemeMode: (mode) => {
    set({ themeMode: mode });
    setJSON(KEYS.theme, mode);
  },

  setAccentColor: (accent) => {
    set({ accentColor: accent });
    setJSON(KEYS.accent, accent);
  },

  setRestTimerSeconds: (s) => {
    set({ restTimerSeconds: s });
    setJSON(KEYS.restTimer, s);
  },

  setAutoStartRestTimer: (enabled) => {
    set({ autoStartRestTimer: enabled });
    setJSON(KEYS.autoStartRestTimer, enabled);
  },

  setWeeklyGoal: (goal) => {
    const safeGoal = Math.max(1, Math.min(14, Math.round(goal)));
    set({ weeklyGoal: safeGoal });
    setJSON(KEYS.weeklyGoal, safeGoal);
  },

  addCustomExercise: (name, bodyPart, language) => {
    const id = `custom_${uuid()}`;
    const exercise: Exercise = {
      id,
      nameKey: id,
      bodyPart,
      isCustom: true,
      customNames: { [language]: name },
    };
    const exercises = [...get().exercises, exercise];
    set({ exercises });
    setJSON(KEYS.exercises, exercises.filter((e) => e.isCustom));
  },

  deleteCustomExercise: (exerciseId) => {
    const exercises = get().exercises.filter((exercise) => exercise.id !== exerciseId);
    const templates = get().templates
      .map((template) => ({
        ...template,
        exercises: template.exercises.filter((exercise) => exercise.exerciseId !== exerciseId),
      }))
      .filter((template) => template.exercises.length > 0);
    const activeWorkout = get().activeWorkout
      ? {
        ...get().activeWorkout!,
        exercises: get().activeWorkout!.exercises.filter((exercise) => exercise.exerciseId !== exerciseId),
      }
      : null;

    set({
      exercises,
      templates,
      activeWorkout: activeWorkout && activeWorkout.exercises.length > 0 ? activeWorkout : null,
    });
    setJSON(KEYS.exercises, exercises.filter((exercise) => exercise.isCustom));
    setJSON(KEYS.templates, templates);
    setJSON(KEYS.activeWorkout, activeWorkout && activeWorkout.exercises.length > 0 ? activeWorkout : null);
  },

  addTemplate: (template) => {
    const templates = [...get().templates, normalizeTemplate(template as WorkoutTemplate & { exercises: any[] })];
    set({ templates });
    setJSON(KEYS.templates, templates);
  },

  updateTemplate: (template) => {
    const normalized = normalizeTemplate(template as WorkoutTemplate & { exercises: any[] });
    const templates = get().templates.map((t) => (t.id === normalized.id ? normalized : t));
    set({ templates });
    setJSON(KEYS.templates, templates);
  },

  deleteTemplate: (id) => {
    const templates = get().templates.filter((t) => t.id !== id);
    set({ templates });
    setJSON(KEYS.templates, templates);
  },

  startWorkoutFromTemplate: (templateId) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return;

    const exercises: WorkoutExercise[] = template.exercises.map((te) => {
      const sets: SetRecord[] = Array.from({ length: te.sets }, () => ({
        id: uuid(),
        exerciseId: te.exerciseId,
        weight: te.weight,
        reps: te.reps,
        isCompleted: false,
      }));
      return { exerciseId: te.exerciseId, sets };
    });

    const workout: ActiveWorkout = {
      id: uuid(),
      name: template.name,
      templateId,
      mode: 'inProgress',
      createdAt: Date.now(),
      startedAt: Date.now(),
      exercises,
    };
    set({ activeWorkout: workout });
    setJSON(KEYS.activeWorkout, workout);
  },

  startEmptyWorkout: () => {
    const workout: ActiveWorkout = {
      id: uuid(),
      name: 'Workout',
      mode: 'inProgress',
      createdAt: Date.now(),
      startedAt: Date.now(),
      exercises: [],
    };
    set({ activeWorkout: workout });
    setJSON(KEYS.activeWorkout, workout);
  },

  startWorkoutFromSession: (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const exercises: WorkoutExercise[] = session.exercises.map((se) => ({
      exerciseId: se.exerciseId,
      sets: se.sets.map((s) => ({
        id: uuid(),
        exerciseId: se.exerciseId,
        weight: s.weight,
        reps: s.reps,
        isCompleted: false,
      })),
    }));

    const workout: ActiveWorkout = {
      id: uuid(),
      name: session.name,
      templateId: session.templateId,
      mode: 'inProgress',
      createdAt: Date.now(),
      startedAt: Date.now(),
      exercises,
    };
    set({ activeWorkout: workout });
    setJSON(KEYS.activeWorkout, workout);
  },

  saveActiveWorkout: () => {
    const aw = get().activeWorkout;
    if (!aw || aw.exercises.length === 0) return;

    const now = Date.now();
    const templateId = aw.templateId ?? `tpl_${uuid()}`;
    const existing = get().templates.find((t) => t.id === templateId);

    const template: WorkoutTemplate = {
      id: templateId,
      name: aw.name || 'Workout',
      exercises: aw.exercises.map((ex) => {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          exerciseId: ex.exerciseId,
          sets: ex.sets.length,
          reps: lastSet?.reps ?? 10,
          weight: lastSet?.weight ?? null,
        };
      }),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const templates = existing
      ? get().templates.map((t) => (t.id === template.id ? template : t))
      : [template, ...get().templates];

    const updatedActiveWorkout: ActiveWorkout = {
      ...aw,
      templateId: template.id,
      name: template.name,
    };

    set({ templates, activeWorkout: updatedActiveWorkout });
    setJSON(KEYS.templates, templates);
    setJSON(KEYS.activeWorkout, updatedActiveWorkout);
  },

  startActiveWorkout: () => {
    const aw = get().activeWorkout;
    if (!aw || aw.mode !== 'draft') return;

    if (aw.exercises.length === 0) return;

    get().saveActiveWorkout();
    const latest = get().activeWorkout;
    if (!latest) return;

    const startedWorkout: ActiveWorkout = {
      ...latest,
      mode: 'inProgress',
      startedAt: Date.now(),
      exercises: latest.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s, isCompleted: false })),
      })),
    };

    set({ activeWorkout: startedWorkout });
    setJSON(KEYS.activeWorkout, startedWorkout);
  },

  renameActiveWorkout: (name) => {
    const aw = get().activeWorkout;
    if (!aw) return;
    const updated = { ...aw, name };
    set({ activeWorkout: updated });
    setJSON(KEYS.activeWorkout, updated);
  },

  addExerciseToWorkout: (exerciseId) => {
    const aw = get().activeWorkout;
    if (!aw || (aw.mode !== 'draft' && aw.mode !== 'inProgress')) return;

    const templateExercise = aw.templateId
      ? get()
        .templates
        .find((t) => t.id === aw.templateId)
        ?.exercises.find((ex) => ex.exerciseId === exerciseId)
      : null;

    const newSet: SetRecord = {
      id: uuid(),
      exerciseId,
      weight: templateExercise?.weight ?? null,
      reps: templateExercise?.reps ?? null,
      isCompleted: false,
    };
    const updated = {
      ...aw,
      exercises: [...aw.exercises, { exerciseId, sets: [newSet] }],
    };
    set({ activeWorkout: updated });
    setJSON(KEYS.activeWorkout, updated);
  },

  addSetToExercise: (exerciseIndex) => {
    const aw = get().activeWorkout;
    if (!aw || (aw.mode !== 'draft' && aw.mode !== 'inProgress')) return;
    const exercises = [...aw.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const lastSet = exercise.sets[exercise.sets.length - 1];
    exercise.sets = [
      ...exercise.sets,
      {
        id: uuid(),
        exerciseId: exercise.exerciseId,
        weight: lastSet?.weight ?? null,
        reps: lastSet?.reps ?? null,
        isCompleted: false,
      },
    ];
    exercises[exerciseIndex] = exercise;
    const updated = { ...aw, exercises };
    set({ activeWorkout: updated });
    setJSON(KEYS.activeWorkout, updated);
  },

  removeSet: (exerciseIndex, setIndex) => {
    const aw = get().activeWorkout;
    if (!aw || (aw.mode !== 'draft' && aw.mode !== 'inProgress')) return;
    const exercises = [...aw.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    exercise.sets = exercise.sets.filter((_, i) => i !== setIndex);
    exercises[exerciseIndex] = exercise;
    const updated = { ...aw, exercises };
    set({ activeWorkout: updated });
    setJSON(KEYS.activeWorkout, updated);
  },

  updateSet: (exerciseIndex, setIndex, field, value) => {
    const aw = get().activeWorkout;
    if (!aw || (aw.mode !== 'draft' && aw.mode !== 'inProgress')) return;
    const exercises = [...aw.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = [...exercise.sets];
    sets[setIndex] = { ...sets[setIndex], [field]: value };
    exercise.sets = sets;
    exercises[exerciseIndex] = exercise;
    const updated = { ...aw, exercises };
    set({ activeWorkout: updated });
    setJSON(KEYS.activeWorkout, updated);
  },

  toggleSetComplete: (exerciseIndex, setIndex) => {
    const aw = get().activeWorkout;
    if (!aw || aw.mode !== 'inProgress') return;
    const exercises = [...aw.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = [...exercise.sets];
    sets[setIndex] = { ...sets[setIndex], isCompleted: !sets[setIndex].isCompleted };
    exercise.sets = sets;
    exercises[exerciseIndex] = exercise;
    const updated = { ...aw, exercises };
    set({ activeWorkout: updated });
    setJSON(KEYS.activeWorkout, updated);
  },

  finishWorkout: () => {
    const aw = get().activeWorkout;
    if (!aw || aw.mode !== 'inProgress') return;

    const startTime = aw.startedAt ?? Date.now();
    const endTime = Date.now();
    const durationMinutes = Math.round((endTime - startTime) / 60000);
    let totalVolume = 0;
    for (const ex of aw.exercises) {
      for (const s of ex.sets) {
        if (s.isCompleted && s.weight && s.reps) {
          totalVolume += s.weight * s.reps;
        }
      }
    }

    const session: WorkoutSession = {
      id: aw.id,
      name: aw.name || 'Workout',
      date: new Date().toISOString().split('T')[0],
      startTime,
      endTime,
      templateId: aw.templateId,
      exercises: aw.exercises,
      totalVolume,
      durationMinutes,
    };

    // Save to Apple Health
    saveStrengthWorkout(startTime, endTime).catch((err) => {
      console.log('[AppStore] HealthKit save failed:', err);
    });

    const sessions = [session, ...get().sessions];
    set({ sessions, activeWorkout: null });
    setJSON(KEYS.sessions, sessions);
    setJSON(KEYS.activeWorkout, null);
  },

  discardWorkout: () => {
    set({ activeWorkout: null });
    setJSON(KEYS.activeWorkout, null);
  },

  getLastSessionForExercise: (exerciseId) => {
    for (const session of get().sessions) {
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex) return ex.sets.filter((s) => s.isCompleted);
    }
    return null;
  },

  getLastSessionForTemplate: (templateIdId) => {
    return get().sessions.find((s) => s.templateId === templateIdId) ?? null;
  },

  hideRecentSession: (id) => {
    const sessions = get().sessions.map((s) => (s.id === id ? { ...s, isHiddenFromRecent: true } : s));
    set({ sessions });
    setJSON(KEYS.sessions, sessions);
  },

  deleteSession: (id) => {
    const sessions = get().sessions.filter((s) => s.id !== id);
    set({ sessions });
    setJSON(KEYS.sessions, sessions);
  },

  hydrate: async () => {
    const allKeys = Object.values(KEYS);
    await hydrateCache(allKeys);

    // Initialize HealthKit
    initHealthKit().catch(console.error);

    const language = getJSON<LocaleCode>(KEYS.language);
    const theme = getJSON<ThemeMode>(KEYS.theme);
    const accentColor = getJSON<AccentColor>(KEYS.accent);
    const restTimer = getJSON<number>(KEYS.restTimer);
    const autoStartRestTimer = getJSON<boolean>(KEYS.autoStartRestTimer);
    const weeklyGoal = getJSON<number>(KEYS.weeklyGoal);
    const customExercises = getJSON<Exercise[]>(KEYS.exercises) ?? [];
    const templates = (getJSON<(WorkoutTemplate & { exercises: any[] })[]>(KEYS.templates) ?? []).map(normalizeTemplate);
    const sessions = getJSON<WorkoutSession[]>(KEYS.sessions) ?? [];
    const storedActiveWorkout = getJSON<ActiveWorkout & { startTime?: number; mode?: 'draft' | 'inProgress'; createdAt?: number; startedAt?: number }>(KEYS.activeWorkout);

    const activeWorkout = storedActiveWorkout
      ? {
        ...storedActiveWorkout,
        mode: storedActiveWorkout.mode ?? 'inProgress',
        createdAt: storedActiveWorkout.createdAt ?? storedActiveWorkout.startTime ?? Date.now(),
        startedAt: storedActiveWorkout.startedAt ?? storedActiveWorkout.startTime,
      }
      : null;

    set({
      language: language ?? 'he',
      themeMode: theme ?? 'dark',
      accentColor: accentColor ?? 'green',
      restTimerSeconds: restTimer ?? 90,
      autoStartRestTimer: autoStartRestTimer ?? true,
      weeklyGoal: weeklyGoal ?? 4,
      exercises: [...defaultExercises, ...customExercises],
      templates,
      sessions,
      activeWorkout,
    });
  },
}));
