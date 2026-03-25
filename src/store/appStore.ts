import { create } from 'zustand';
import { getJSON, setJSON, hydrateCache } from '../storage/storage';
import { defaultExercises } from '../data/exercises';
import * as Crypto from 'expo-crypto';

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

type ThemeMode = 'dark' | 'light' | 'system';

const defaultTemplates: WorkoutTemplate[] = [
  {
    id: 'tpl_push_day',
    name: 'Push Day',
    exercises: [
      { exerciseId: 'ex_bench_press',     targetSets: 4, targetReps: 8  },
      { exerciseId: 'ex_incline_bench',   targetSets: 3, targetReps: 10 },
      { exerciseId: 'ex_overhead_press',  targetSets: 3, targetReps: 10 },
      { exerciseId: 'ex_lateral_raise',   targetSets: 3, targetReps: 15 },
      { exerciseId: 'ex_tricep_pushdown', targetSets: 3, targetReps: 12 },
      { exerciseId: 'ex_cable_fly',       targetSets: 3, targetReps: 12 },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'tpl_pull_legs',
    name: 'Pull & Legs',
    exercises: [
      { exerciseId: 'ex_deadlift',             targetSets: 4, targetReps: 5  },
      { exerciseId: 'ex_lat_pulldown',         targetSets: 4, targetReps: 10 },
      { exerciseId: 'ex_barbell_row',          targetSets: 3, targetReps: 8  },
      { exerciseId: 'ex_squat',                targetSets: 4, targetReps: 6  },
      { exerciseId: 'ex_romanian_deadlift',    targetSets: 3, targetReps: 10 },
      { exerciseId: 'ex_barbell_curl',         targetSets: 3, targetReps: 12 },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
];

interface AppState {
  language: 'en' | 'he';
  themeMode: ThemeMode;
  restTimerSeconds: number;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  activeWorkout: ActiveWorkout | null;

  // Actions
  setLanguage: (lang: 'en' | 'he') => void;
  setThemeMode: (mode: ThemeMode) => void;
  setRestTimerSeconds: (s: number) => void;

  // Exercises
  addCustomExercise: (name: string, bodyPart: BodyPart, language: string) => void;

  // Templates
  addTemplate: (template: WorkoutTemplate) => void;
  updateTemplate: (template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;

  // Active Workout
  startWorkoutFromTemplate: (templateId: string) => void;
  startEmptyWorkout: () => void;
  startWorkoutFromSession: (sessionId: string) => void;
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

  // Hydrate
  hydrate: () => Promise<void>;
}

const KEYS = {
  language: 'app_language',
  theme: 'app_theme',
  restTimer: 'app_rest_timer',
  exercises: 'app_exercises',
  templates: 'app_templates',
  sessions: 'app_sessions',
  activeWorkout: 'app_active_workout',
};

export const useAppStore = create<AppState>((set, get) => ({
  language: 'he',
  themeMode: 'dark',
  restTimerSeconds: 90,
  exercises: defaultExercises,
  templates: defaultTemplates,
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

  setRestTimerSeconds: (s) => {
    set({ restTimerSeconds: s });
    setJSON(KEYS.restTimer, s);
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

  addTemplate: (template) => {
    const templates = [...get().templates, template];
    set({ templates });
    setJSON(KEYS.templates, templates);
  },

  updateTemplate: (template) => {
    const templates = get().templates.map((t) => (t.id === template.id ? template : t));
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

    const lastSession = get().getLastSessionForTemplate(templateId);

    const exercises: WorkoutExercise[] = template.exercises.map((te) => {
      const lastExSets = lastSession?.exercises.find((e) => e.exerciseId === te.exerciseId)?.sets;
      const sets: SetRecord[] = Array.from({ length: te.targetSets }, (_, i) => ({
        id: uuid(),
        exerciseId: te.exerciseId,
        weight: null,
        reps: null,
        isCompleted: false,
      }));
      return { exerciseId: te.exerciseId, sets };
    });

    const workout: ActiveWorkout = {
      id: uuid(),
      name: template.name,
      templateId,
      startTime: Date.now(),
      exercises,
    };
    set({ activeWorkout: workout });
    setJSON(KEYS.activeWorkout, workout);
  },

  startEmptyWorkout: () => {
    const workout: ActiveWorkout = {
      id: uuid(),
      name: '',
      startTime: Date.now(),
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
        weight: null,
        reps: null,
        isCompleted: false,
      })),
    }));

    const workout: ActiveWorkout = {
      id: uuid(),
      name: session.name,
      templateId: session.templateId,
      startTime: Date.now(),
      exercises,
    };
    set({ activeWorkout: workout });
    setJSON(KEYS.activeWorkout, workout);
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
    if (!aw) return;
    const newSet: SetRecord = {
      id: uuid(),
      exerciseId,
      weight: null,
      reps: null,
      isCompleted: false,
    };
    const updated = {
      ...aw,
      exercises: [...aw.exercises, { exerciseId, sets: [newSet, { ...newSet, id: uuid() }, { ...newSet, id: uuid() }] }],
    };
    set({ activeWorkout: updated });
    setJSON(KEYS.activeWorkout, updated);
  },

  addSetToExercise: (exerciseIndex) => {
    const aw = get().activeWorkout;
    if (!aw) return;
    const exercises = [...aw.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    exercise.sets = [
      ...exercise.sets,
      {
        id: uuid(),
        exerciseId: exercise.exerciseId,
        weight: null,
        reps: null,
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
    if (!aw) return;
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
    if (!aw) return;
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
    if (!aw) return;
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
    if (!aw) return;
    const endTime = Date.now();
    const durationMinutes = Math.round((endTime - aw.startTime) / 60000);
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
      startTime: aw.startTime,
      endTime,
      templateId: aw.templateId,
      exercises: aw.exercises,
      totalVolume,
      durationMinutes,
    };
    const sessions = [session, ...get().sessions];
    set({ sessions, activeWorkout: null });
    setJSON(KEYS.sessions, sessions);
    setJSON(KEYS.activeWorkout, null);

    // Update template with last used data
    if (aw.templateId) {
      const template = get().templates.find((t) => t.id === aw.templateId);
      if (template) {
        const updatedExercises = template.exercises.map((te) => {
          const sessionEx = aw.exercises.find((e) => e.exerciseId === te.exerciseId);
          if (sessionEx) {
            const completedSets = sessionEx.sets.filter((s) => s.isCompleted);
            const lastSet = completedSets[completedSets.length - 1];
            return {
              ...te,
              targetSets: sessionEx.sets.length,
              lastWeight: lastSet?.weight ?? te.lastWeight,
              lastReps: lastSet?.reps ?? te.lastReps,
            };
          }
          return te;
        });
        get().updateTemplate({ ...template, exercises: updatedExercises, updatedAt: Date.now() });
      }
    }
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

  getLastSessionForTemplate: (templateId) => {
    return get().sessions.find((s) => s.templateId === templateId) ?? null;
  },

  hydrate: async () => {
    const allKeys = Object.values(KEYS);
    await hydrateCache(allKeys);

    const language = getJSON<'en' | 'he'>(KEYS.language);
    const theme = getJSON<ThemeMode>(KEYS.theme);
    const restTimer = getJSON<number>(KEYS.restTimer);
    const customExercises = getJSON<Exercise[]>(KEYS.exercises) ?? [];
    const templates = getJSON<WorkoutTemplate[]>(KEYS.templates) ?? defaultTemplates;
    const sessions = getJSON<WorkoutSession[]>(KEYS.sessions) ?? [];
    const activeWorkout = getJSON<ActiveWorkout>(KEYS.activeWorkout);

    set({
      language: language ?? 'he',
      themeMode: theme ?? 'dark',
      restTimerSeconds: restTimer ?? 90,
      exercises: [...defaultExercises, ...customExercises],
      templates,
      sessions,
      activeWorkout,
    });
  },
}));
