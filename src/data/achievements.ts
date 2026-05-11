/**
 * Achievement catalog. Each achievement has a predicate evaluated against
 * the user's session/PR state. Unlocks are persisted in the app store.
 */
import type { WorkoutSession, PersonalRecord } from '../types';
import { computeStreak } from '../utils/algorithms';

export interface AchievementDef {
  id: string;
  emoji: string;
  titleKey: string;
  descriptionKey: string;
  isUnlocked: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  sessions: WorkoutSession[];
  records: Record<string, PersonalRecord>;
}

export const achievements: AchievementDef[] = [
  {
    id: 'first_workout',
    emoji: '🎉',
    titleKey: 'ach_first_workout_title',
    descriptionKey: 'ach_first_workout_desc',
    isUnlocked: (ctx) => ctx.sessions.length >= 1,
  },
  {
    id: 'ten_workouts',
    emoji: '🔟',
    titleKey: 'ach_ten_workouts_title',
    descriptionKey: 'ach_ten_workouts_desc',
    isUnlocked: (ctx) => ctx.sessions.length >= 10,
  },
  {
    id: 'fifty_workouts',
    emoji: '🏆',
    titleKey: 'ach_fifty_workouts_title',
    descriptionKey: 'ach_fifty_workouts_desc',
    isUnlocked: (ctx) => ctx.sessions.length >= 50,
  },
  {
    id: 'hundred_workouts',
    emoji: '💯',
    titleKey: 'ach_hundred_workouts_title',
    descriptionKey: 'ach_hundred_workouts_desc',
    isUnlocked: (ctx) => ctx.sessions.length >= 100,
  },
  {
    id: 'streak_4w',
    emoji: '🔥',
    titleKey: 'ach_streak_4w_title',
    descriptionKey: 'ach_streak_4w_desc',
    isUnlocked: (ctx) => computeStreak(ctx.sessions).longestWeeks >= 4,
  },
  {
    id: 'streak_12w',
    emoji: '☄️',
    titleKey: 'ach_streak_12w_title',
    descriptionKey: 'ach_streak_12w_desc',
    isUnlocked: (ctx) => computeStreak(ctx.sessions).longestWeeks >= 12,
  },
  {
    id: 'volume_10k',
    emoji: '📦',
    titleKey: 'ach_volume_10k_title',
    descriptionKey: 'ach_volume_10k_desc',
    isUnlocked: (ctx) =>
      ctx.sessions.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0) >= 10_000,
  },
  {
    id: 'volume_100k',
    emoji: '🛢️',
    titleKey: 'ach_volume_100k_title',
    descriptionKey: 'ach_volume_100k_desc',
    isUnlocked: (ctx) =>
      ctx.sessions.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0) >= 100_000,
  },
  {
    id: 'bench_100',
    emoji: '🏋️',
    titleKey: 'ach_bench_100_title',
    descriptionKey: 'ach_bench_100_desc',
    isUnlocked: (ctx) => (ctx.records['ex_bench_press']?.bestWeight ?? 0) >= 100,
  },
  {
    id: 'squat_140',
    emoji: '🦵',
    titleKey: 'ach_squat_140_title',
    descriptionKey: 'ach_squat_140_desc',
    isUnlocked: (ctx) => (ctx.records['ex_squat']?.bestWeight ?? 0) >= 140,
  },
  {
    id: 'deadlift_180',
    emoji: '⚓',
    titleKey: 'ach_deadlift_180_title',
    descriptionKey: 'ach_deadlift_180_desc',
    isUnlocked: (ctx) => (ctx.records['ex_deadlift']?.bestWeight ?? 0) >= 180,
  },
  {
    id: 'early_bird',
    emoji: '🌅',
    titleKey: 'ach_early_bird_title',
    descriptionKey: 'ach_early_bird_desc',
    isUnlocked: (ctx) =>
      ctx.sessions.some((s) => new Date(s.startTime).getHours() < 7),
  },
  {
    id: 'night_owl',
    emoji: '🌙',
    titleKey: 'ach_night_owl_title',
    descriptionKey: 'ach_night_owl_desc',
    isUnlocked: (ctx) =>
      ctx.sessions.some((s) => new Date(s.startTime).getHours() >= 22),
  },
];

/** Returns the IDs of newly-unlocked achievements given prior state. */
export function computeNewlyUnlocked(
  ctx: AchievementContext,
  alreadyUnlocked: string[]
): string[] {
  const set = new Set(alreadyUnlocked);
  const newly: string[] = [];
  for (const def of achievements) {
    if (set.has(def.id)) continue;
    if (def.isUnlocked(ctx)) newly.push(def.id);
  }
  return newly;
}
