import type { Exercise } from '../types';
import type { TranslationKeys } from '../i18n';

export function getExerciseName(
  exercise: Exercise,
  t: (key: any) => string,
  language: string
): string {
  if (exercise.isCustom) {
    return exercise.customNames?.[language] ?? exercise.customNames?.en ?? 'Custom Exercise';
  }
  return t(exercise.nameKey as any);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}K`;
  }
  return kg.toLocaleString();
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
