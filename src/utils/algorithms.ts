/**
 * Smart training algorithms.
 *
 * - Epley 1RM estimation
 * - Personal-record detection (heaviest weight, best reps@weight, best 1RM, biggest volume)
 * - Progressive-overload suggestion (next weight × reps target)
 * - Streak / weekly consistency calculations
 * - Muscle-balance scoring for the last N days
 */
import type {
  SetRecord,
  WorkoutSession,
  PersonalRecord,
  Exercise,
  BodyPart,
} from '../types';

/** Epley formula. Returns 0 if either input is missing. */
export function estimate1RM(weight: number | null | undefined, reps: number | null | undefined): number {
  if (!weight || !reps || weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** Brzycki — alternative, slightly more conservative at high reps. */
export function estimate1RMBrzycki(weight: number, reps: number): number {
  if (!weight || !reps || reps >= 37) return 0;
  return Math.round((weight * 36) / (37 - reps) * 10) / 10;
}

/** Volume for a single set (kg × reps). */
export function setVolume(set: SetRecord): number {
  if (!set.isCompleted || !set.weight || !set.reps) return 0;
  if (set.setType === 'warmup') return 0;
  return set.weight * set.reps;
}

/** Total volume for a session. */
export function sessionVolume(session: WorkoutSession): number {
  let total = 0;
  for (const ex of session.exercises) {
    for (const s of ex.sets) total += setVolume(s);
  }
  return total;
}

/**
 * Compute personal records for every exercise present in `sessions`.
 * Returns a map keyed by exerciseId.
 */
export function computePersonalRecords(sessions: WorkoutSession[]): Record<string, PersonalRecord> {
  const records: Record<string, PersonalRecord> = {};

  for (const session of sessions) {
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (!set.isCompleted || !set.weight || !set.reps) continue;
        if (set.setType === 'warmup') continue;

        const existing = records[ex.exerciseId];
        const oneRm = estimate1RM(set.weight, set.reps);
        const volume = set.weight * set.reps;

        if (!existing) {
          records[ex.exerciseId] = {
            exerciseId: ex.exerciseId,
            bestWeight: set.weight,
            bestReps: set.reps,
            bestVolume: volume,
            estimated1RM: oneRm,
            achievedDate: session.date,
            sessionId: session.id,
          };
          continue;
        }

        if (set.weight > existing.bestWeight) {
          existing.bestWeight = set.weight;
          existing.achievedDate = session.date;
          existing.sessionId = session.id;
        }
        if (set.reps > existing.bestReps) existing.bestReps = set.reps;
        if (volume > existing.bestVolume) existing.bestVolume = volume;
        if (oneRm > existing.estimated1RM) existing.estimated1RM = oneRm;
      }
    }
  }

  return records;
}

/**
 * Detect PR kinds for a single set, relative to prior records.
 * Returns the kinds achieved (empty if none).
 */
export function detectPRKinds(
  set: SetRecord,
  priorRecord: PersonalRecord | undefined
): Array<'1rm' | 'weight' | 'reps' | 'volume'> {
  if (!set.weight || !set.reps || set.setType === 'warmup') return [];
  if (!priorRecord) return ['weight', 'reps', '1rm', 'volume'];

  const kinds: Array<'1rm' | 'weight' | 'reps' | 'volume'> = [];
  if (set.weight > priorRecord.bestWeight) kinds.push('weight');
  if (set.reps > priorRecord.bestReps) kinds.push('reps');
  if (estimate1RM(set.weight, set.reps) > priorRecord.estimated1RM) kinds.push('1rm');
  if (set.weight * set.reps > priorRecord.bestVolume) kinds.push('volume');
  return kinds;
}

/**
 * Suggest the next training target for an exercise based on the most recent
 * completed session. Uses the "double progression" rule of thumb:
 *   - If last session was logged at or above the rep target → bump weight 2.5kg.
 *   - Otherwise → keep weight, add one rep.
 *   - If RPE ≥ 9.5 → repeat the same weight×reps (avoid overreaching).
 */
export interface OverloadSuggestion {
  weight: number;
  reps: number;
  reason: 'increase_weight' | 'increase_reps' | 'hold' | 'first_time';
}

export function suggestProgression(
  history: Array<{ weight: number | null; reps: number | null; rpe?: number }>,
  options: { repTarget?: number; weightIncrementKg?: number } = {}
): OverloadSuggestion | null {
  const { repTarget = 8, weightIncrementKg = 2.5 } = options;
  const last = history[0];
  if (!last || !last.weight || !last.reps) {
    return { weight: 0, reps: repTarget, reason: 'first_time' };
  }

  if (last.rpe != null && last.rpe >= 9.5) {
    return { weight: last.weight, reps: last.reps, reason: 'hold' };
  }

  if (last.reps >= repTarget) {
    return {
      weight: Math.round((last.weight + weightIncrementKg) * 2) / 2,
      reps: repTarget,
      reason: 'increase_weight',
    };
  }

  return { weight: last.weight, reps: last.reps + 1, reason: 'increase_reps' };
}

/**
 * Current and longest streak of weeks with ≥1 workout.
 * "Week" = Mon-Sun. Uses local timezone.
 */
export function computeStreak(sessions: WorkoutSession[]): {
  currentWeeks: number;
  longestWeeks: number;
  daysSinceLastWorkout: number | null;
} {
  if (sessions.length === 0) {
    return { currentWeeks: 0, longestWeeks: 0, daysSinceLastWorkout: null };
  }

  const weekKey = (d: Date): string => {
    const monday = new Date(d);
    monday.setHours(0, 0, 0, 0);
    const offset = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - offset);
    return `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
  };

  const trainedWeeks = new Set<string>();
  let mostRecent = 0;
  for (const s of sessions) {
    const d = new Date(`${s.date}T00:00:00`);
    trainedWeeks.add(weekKey(d));
    if (d.getTime() > mostRecent) mostRecent = d.getTime();
  }

  // Walk back from this week.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = new Date(today);
  let current = 0;
  while (trainedWeeks.has(weekKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  // Longest historical streak.
  const sortedWeeks = Array.from(trainedWeeks)
    .map((k) => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  for (const t of sortedWeeks) {
    if (prev != null && t - prev === WEEK_MS) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = t;
  }

  const days = Math.floor((today.getTime() - mostRecent) / (24 * 60 * 60 * 1000));
  return {
    currentWeeks: current,
    longestWeeks: Math.max(longest, current),
    daysSinceLastWorkout: Number.isFinite(days) ? days : null,
  };
}

/** Volume per body-part over the last N days, normalized to a 0-1 score. */
export function computeMuscleBalance(
  sessions: WorkoutSession[],
  exercises: Exercise[],
  windowDays = 14
): Record<BodyPart, number> {
  const byPart: Record<BodyPart, number> = {
    chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0, core: 0, cardio: 0, other: 0,
  };
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  for (const s of sessions) {
    const t = new Date(`${s.date}T00:00:00`).getTime();
    if (t < cutoff) continue;
    for (const ex of s.exercises) {
      const info = exerciseMap.get(ex.exerciseId);
      if (!info) continue;
      for (const set of ex.sets) byPart[info.bodyPart] += setVolume(set);
    }
  }

  const max = Math.max(1, ...Object.values(byPart));
  const normalized: Record<BodyPart, number> = { ...byPart };
  for (const key of Object.keys(byPart) as BodyPart[]) {
    normalized[key] = byPart[key] / max;
  }
  return normalized;
}

/** Sessions count grouped by ISO date within the last N days. */
export function sessionsPerDay(sessions: WorkoutSession[], days = 30): Array<{ date: string; count: number; volume: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: Array<{ date: string; count: number; volume: number }> = [];
  const byDate = new Map<string, { count: number; volume: number }>();
  for (const s of sessions) {
    const v = s.totalVolume ?? sessionVolume(s);
    const e = byDate.get(s.date) ?? { count: 0, volume: 0 };
    e.count += 1;
    e.volume += v;
    byDate.set(s.date, e);
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const stat = byDate.get(iso) ?? { count: 0, volume: 0 };
    out.push({ date: iso, ...stat });
  }
  return out;
}
