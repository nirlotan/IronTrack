import { create } from 'zustand';
import { getJSON, setJSON, hydrateCache } from '../storage/storage';
import { defaultExercises } from '../data/exercises';
import { seedPrograms, seedTemplates } from '../data/programs';
import { computeNewlyUnlocked } from '../data/achievements';
import { computePersonalRecords, detectPRKinds } from '../utils/algorithms';
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
  Program,
  BodyWeightEntry,
  Achievement,
  SetType,
} from '../types';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'green' | 'purple' | 'orange';
export type Units = 'metric' | 'imperial';
export type BodyPartFilter = BodyPart | 'all';

interface AppState {
  language: LocaleCode;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  restTimerSeconds: number;
  autoStartRestTimer: boolean;
  weeklyGoal: number;
  units: Units;
  healthSyncEnabled: boolean;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  activeWorkout: ActiveWorkout | null;
  programs: Program[];
  installedProgramIds: string[];
  bodyWeightLog: BodyWeightEntry[];
  unlockedAchievements: Achievement[];
  /** Set of session ids that triggered new PR celebrations not yet dismissed. */
  recentPRBanner: { sessionId: string; prCount: number } | null;
  /** Achievements that unlocked on the latest finishWorkout but not yet shown. */
  recentlyUnlockedAchievements: string[];

  // Actions
  setLanguage: (lang: LocaleCode) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (accent: AccentColor) => void;
  setRestTimerSeconds: (s: number) => void;
  setAutoStartRestTimer: (enabled: boolean) => void;
  setWeeklyGoal: (goal: number) => void;
  setUnits: (units: Units) => void;
  setHealthSyncEnabled: (enabled: boolean) => void;

  // Exercises
  addCustomExercise: (name: string, bodyPart: BodyPart, language: string) => string;
  updateCustomExercise: (exerciseId: string, name: string, language: string) => void;
  deleteCustomExercise: (exerciseId: string) => void;

  // Body part filter
  lastSelectedBodyPart: BodyPartFilter;
  setLastSelectedBodyPart: (bp: BodyPartFilter) => void;

  // Templates
  addTemplate: (template: WorkoutTemplate) => void;
  updateTemplate: (template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;

  // Programs
  installProgram: (programId: string) => void;
  uninstallProgram: (programId: string) => void;

  // Body weight
  addBodyWeight: (weightKg: number) => void;
  deleteBodyWeight: (id: string) => void;

  // Active Workout
  startWorkoutFromTemplate: (templateId: string) => void;
  startEmptyWorkout: () => void;
  startWorkoutFromSession: (sessionId: string) => void;
  saveActiveWorkout: () => void;
  startActiveWorkout: () => void;
  renameActiveWorkout: (name: string) => void;
  addExerciseToWorkout: (exerciseId: string) => void;
  moveExerciseInWorkout: (fromIndex: number, toIndex: number) => void;
  addSetToExercise: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number | null) => void;
  updateSetRPE: (exerciseIndex: number, setIndex: number, rpe: number | undefined) => void;
  updateSetType: (exerciseIndex: number, setIndex: number, type: SetType) => void;
  toggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
  finishWorkout: () => void;
  discardWorkout: () => void;

  // History helpers
  getLastSessionForExercise: (exerciseId: string) => SetRecord[] | null;
  getLastSessionForTemplate: (templateId: string) => WorkoutSession | null;
  hideRecentSession: (id: string) => void;
  deleteSession: (id: string) => void;

  // Banners
  dismissPRBanner: () => void;
  dismissAchievementBanner: () => void;

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
  units: 'app_units',
  healthSync: 'app_health_sync',
  exercises: 'app_exercises',
  templates: 'app_templates',
  sessions: 'app_sessions',
  activeWorkout: 'app_active_workout',
  installedPrograms: 'app_installed_programs',
  bodyWeightLog: 'app_body_weight_log',
  achievements: 'app_unlocked_achievements',
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
  units: 'metric',
  healthSyncEnabled: true,
  exercises: defaultExercises,
  templates: [],
  sessions: [],
  activeWorkout: null,
  programs: seedPrograms,
  installedProgramIds: [],
  bodyWeightLog: [],
  unlockedAchievements: [],
  recentPRBanner: null,
  recentlyUnlockedAchievements: [],
  lastSelectedBodyPart: 'all',

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

  setUnits: (units) => {
    set({ units });
    setJSON(KEYS.units, units);
  },

  setHealthSyncEnabled: (enabled) => {
    set({ healthSyncEnabled: enabled });
    setJSON(KEYS.healthSync, enabled);
    if (enabled) {
      initHealthKit().catch(() => { });
    }
  },

  installProgram: (programId) => {
    const program = get().programs.find((p) => p.id === programId);
    if (!program) return;

    const now = Date.now();
    const existingIds = new Set(get().templates.map((t) => t.id));
    const seedById = new Map(seedTemplates.map((t) => [t.id, t]));

    // Clone each seed template into the user's library with a fresh id.
    const cloned: WorkoutTemplate[] = program.templateIds
      .map((id) => seedById.get(id))
      .filter((t): t is WorkoutTemplate => !!t)
      .map((seed) => ({
        ...seed,
        id: `tpl_${uuid()}`,
        createdAt: now,
        updatedAt: now,
      }));

    const templates = [...cloned, ...get().templates].filter(
      (t) => !existingIds.has(t.id) || cloned.every((c) => c.id !== t.id)
    );
    const installedProgramIds = Array.from(
      new Set([...get().installedProgramIds, programId])
    );

    set({ templates, installedProgramIds });
    setJSON(KEYS.templates, templates);
    setJSON(KEYS.installedPrograms, installedProgramIds);
  },

  uninstallProgram: (programId) => {
    const installedProgramIds = get().installedProgramIds.filter((id) => id !== programId);
    set({ installedProgramIds });
    setJSON(KEYS.installedPrograms, installedProgramIds);
  },

  addBodyWeight: (weightKg) => {
    if (!isFinite(weightKg) || weightKg <= 0) return;
    const entry: BodyWeightEntry = {
      id: uuid(),
      date: new Date().toISOString().split('T')[0],
      weightKg: Math.round(weightKg * 10) / 10,
    };
    const bodyWeightLog = [entry, ...get().bodyWeightLog];
    set({ bodyWeightLog });
    setJSON(KEYS.bodyWeightLog, bodyWeightLog);
  },

  deleteBodyWeight: (id) => {
    const bodyWeightLog = get().bodyWeightLog.filter((e) => e.id !== id);
    set({ bodyWeightLog });
    setJSON(KEYS.bodyWeightLog, bodyWeightLog);
  },

  dismissPRBanner: () => set({ recentPRBanner: null }),
  dismissAchievementBanner: () => set({ recentlyUnlockedAchievements: [] }),

  setLastSelectedBodyPart: (bp) => set({ lastSelectedBodyPart: bp }),

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
    return id;
  },

  updateCustomExercise: (exerciseId, name, language) => {
    const exercises = get().exercises.map((e) =>
      e.id === exerciseId
        ? { ...e, customNames: { ...e.customNames, [language]: name } }
        : e
    );
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

  moveExerciseInWorkout: (fromIndex, toIndex) => {
    const aw = get().activeWorkout;
    if (!aw || (aw.mode !== 'draft' && aw.mode !== 'inProgress')) return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= aw.exercises.length) return;
    if (toIndex < 0 || toIndex >= aw.exercises.length) return;
    const exercises = [...aw.exercises];
    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);
    const updated = { ...aw, exercises };
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

  updateSetRPE: (exerciseIndex, setIndex, rpe) => {
    const aw = get().activeWorkout;
    if (!aw) return;
    const exercises = [...aw.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = [...exercise.sets];
    sets[setIndex] = { ...sets[setIndex], rpe };
    exercise.sets = sets;
    exercises[exerciseIndex] = exercise;
    const updated = { ...aw, exercises };
    set({ activeWorkout: updated });
    setJSON(KEYS.activeWorkout, updated);
  },

  updateSetType: (exerciseIndex, setIndex, type) => {
    const aw = get().activeWorkout;
    if (!aw) return;
    const exercises = [...aw.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = [...exercise.sets];
    sets[setIndex] = { ...sets[setIndex], setType: type };
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

    // Detect PRs against history *before* this session is added.
    const priorRecords = computePersonalRecords(get().sessions);

    let totalVolume = 0;
    let prCount = 0;
    const exercisesWithPRs: WorkoutExercise[] = aw.exercises.map((ex) => {
      const prior = priorRecords[ex.exerciseId];
      const sets = ex.sets.map((s) => {
        if (!s.isCompleted || !s.weight || !s.reps || s.setType === 'warmup') return s;
        totalVolume += s.weight * s.reps;
        const kinds = detectPRKinds(s, prior);
        if (kinds.length > 0) {
          prCount += 1;
          return { ...s, isPR: true, prKinds: kinds };
        }
        return s;
      });
      return { ...ex, sets };
    });

    const session: WorkoutSession = {
      id: aw.id,
      name: aw.name || 'Workout',
      date: new Date().toISOString().split('T')[0],
      startTime,
      endTime,
      templateId: aw.templateId,
      programId: aw.programId,
      exercises: exercisesWithPRs,
      totalVolume,
      durationMinutes,
    };

    // Apple Health
    if (get().healthSyncEnabled) {
      saveStrengthWorkout(startTime, endTime, { totalVolume }).catch((err) => {
        console.log('[AppStore] HealthKit save failed:', err);
      });
    }

    const sessions = [session, ...get().sessions];

    // Achievements
    const records = computePersonalRecords(sessions);
    const newlyUnlocked = computeNewlyUnlocked(
      { sessions, records },
      get().unlockedAchievements.map((a) => a.id)
    );
    const unlockedAchievements = [
      ...get().unlockedAchievements,
      ...newlyUnlocked.map((id) => ({ id, unlockedAt: Date.now() })),
    ];

    set({
      sessions,
      activeWorkout: null,
      unlockedAchievements,
      recentPRBanner: prCount > 0 ? { sessionId: session.id, prCount } : null,
      recentlyUnlockedAchievements: newlyUnlocked,
    });
    setJSON(KEYS.sessions, sessions);
    setJSON(KEYS.activeWorkout, null);
    setJSON(KEYS.achievements, unlockedAchievements);
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

    const language = getJSON<LocaleCode>(KEYS.language);
    const theme = getJSON<ThemeMode>(KEYS.theme);
    const accentColor = getJSON<AccentColor>(KEYS.accent);
    const restTimer = getJSON<number>(KEYS.restTimer);
    const autoStartRestTimer = getJSON<boolean>(KEYS.autoStartRestTimer);
    const weeklyGoal = getJSON<number>(KEYS.weeklyGoal);
    const units = getJSON<Units>(KEYS.units);
    const healthSync = getJSON<boolean>(KEYS.healthSync);
    const customExercises = getJSON<Exercise[]>(KEYS.exercises) ?? [];
    const templates = (getJSON<(WorkoutTemplate & { exercises: any[] })[]>(KEYS.templates) ?? []).map(normalizeTemplate);
    const sessions = getJSON<WorkoutSession[]>(KEYS.sessions) ?? [];
    const installedProgramIds = getJSON<string[]>(KEYS.installedPrograms) ?? [];
    const bodyWeightLog = getJSON<BodyWeightEntry[]>(KEYS.bodyWeightLog) ?? [];
    const unlockedAchievements = getJSON<Achievement[]>(KEYS.achievements) ?? [];
    const storedActiveWorkout = getJSON<ActiveWorkout & { startTime?: number; mode?: 'draft' | 'inProgress'; createdAt?: number; startedAt?: number }>(KEYS.activeWorkout);

    const activeWorkout = storedActiveWorkout
      ? {
        ...storedActiveWorkout,
        mode: storedActiveWorkout.mode ?? 'inProgress',
        createdAt: storedActiveWorkout.createdAt ?? storedActiveWorkout.startTime ?? Date.now(),
        startedAt: storedActiveWorkout.startedAt ?? storedActiveWorkout.startTime,
      }
      : null;

    const enableHealthSync = healthSync ?? true;
    if (enableHealthSync) initHealthKit().catch(console.error);

    set({
      language: language ?? 'he',
      themeMode: theme ?? 'dark',
      accentColor: accentColor ?? 'green',
      restTimerSeconds: restTimer ?? 90,
      autoStartRestTimer: autoStartRestTimer ?? true,
      weeklyGoal: weeklyGoal ?? 4,
      units: units ?? 'metric',
      healthSyncEnabled: enableHealthSync,
      exercises: [...defaultExercises, ...customExercises],
      templates,
      sessions,
      activeWorkout,
      installedProgramIds,
      bodyWeightLog,
      unlockedAchievements,
    });
  },
}));
