import { describe, expect, it } from 'vitest';
import {
  computePersonalRecords,
  computeStreak,
  detectPRKinds,
  estimate1RM,
  sessionsPerDay,
  suggestProgression,
} from '../algorithms';
import { localISODate } from '../helpers';
import type { SetRecord, WorkoutSession } from '../../types';

const set = (over: Partial<SetRecord>): SetRecord => ({
  id: 'x',
  exerciseId: 'ex_bench_press',
  weight: 60,
  reps: 8,
  isCompleted: true,
  ...over,
});

const session = (date: string, sets: SetRecord[]): WorkoutSession => ({
  id: `s_${date}`,
  name: 'W',
  date,
  startTime: 0,
  exercises: [{ exerciseId: 'ex_bench_press', sets }],
});

describe('estimate1RM (Epley)', () => {
  it('returns weight at 1 rep', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });
  it('60×8 ≈ 76kg', () => {
    expect(estimate1RM(60, 8)).toBeCloseTo(76, 0);
  });
  it('guards missing inputs', () => {
    expect(estimate1RM(null, 5)).toBe(0);
    expect(estimate1RM(60, 0)).toBe(0);
  });
});

describe('PR detection', () => {
  it('first-ever completed set is every PR kind', () => {
    expect(detectPRKinds(set({}), undefined)).toEqual(['weight', 'reps', '1rm', 'volume']);
  });

  it('warmups never PR', () => {
    expect(detectPRKinds(set({ setType: 'warmup' }), undefined)).toEqual([]);
  });

  it('detects only the exceeded kinds', () => {
    const prior = computePersonalRecords([session('2026-07-01', [set({})])]).ex_bench_press;
    expect(detectPRKinds(set({ weight: 62.5, reps: 6 }), prior)).toEqual(['weight']);
    expect(detectPRKinds(set({ weight: 55, reps: 12 }), prior)).toEqual(['reps', '1rm', 'volume']);
    expect(detectPRKinds(set({ weight: 60, reps: 8 }), prior)).toEqual([]);
  });
});

describe('progression suggestion', () => {
  it('bumps weight after hitting rep target', () => {
    expect(suggestProgression([{ weight: 60, reps: 8 }])).toEqual({
      weight: 62.5,
      reps: 8,
      reason: 'increase_weight',
    });
  });

  it('adds a rep below target', () => {
    expect(suggestProgression([{ weight: 60, reps: 6 }])).toEqual({
      weight: 60,
      reps: 7,
      reason: 'increase_reps',
    });
  });

  it('holds at RPE ≥ 9.5', () => {
    expect(suggestProgression([{ weight: 60, reps: 8, rpe: 10 }])?.reason).toBe('hold');
  });
});

describe('sessionsPerDay — local timezone', () => {
  it("includes today's session (regression: UTC keying dropped it east of Greenwich)", () => {
    const today = localISODate();
    const series = sessionsPerDay(
      [{ ...session(today, [set({})]), totalVolume: 480 }],
      30
    );
    const last = series[series.length - 1];
    expect(last.date).toBe(today);
    expect(last.volume).toBe(480);
    expect(last.count).toBe(1);
  });

  it('produces exactly N days ending today', () => {
    const series = sessionsPerDay([], 7);
    expect(series).toHaveLength(7);
    expect(series[6].date).toBe(localISODate());
  });
});

describe('streak', () => {
  it('counts current week with a session today', () => {
    const s = computeStreak([session(localISODate(), [set({})])]);
    expect(s.currentWeeks).toBe(1);
    expect(s.daysSinceLastWorkout).toBe(0);
  });

  it('empty history → zeroes', () => {
    expect(computeStreak([])).toEqual({
      currentWeeks: 0,
      longestWeeks: 0,
      daysSinceLastWorkout: null,
    });
  });
});
