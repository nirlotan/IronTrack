export type BodyPart = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'other';

export interface Exercise {
  id: string;
  nameKey: string; // i18n key for built-in, raw name for custom
  bodyPart: BodyPart;
  isCustom: boolean;
  customName?: string; // only for custom exercises, stored per-language
  customNames?: Record<string, string>; // { en: "...", he: "..." }
}

export interface TemplateExercise {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  lastWeight?: number;
  lastReps?: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt: number;
  updatedAt: number;
}

export interface SetRecord {
  id: string;
  exerciseId: string;
  weight: number | null;
  reps: number | null;
  isCompleted: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: SetRecord[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  date: string; // ISO date
  startTime: number; // timestamp
  endTime?: number;
  templateId?: string;
  exercises: WorkoutExercise[];
  totalVolume?: number;
  durationMinutes?: number;
}

export interface ActiveWorkout {
  id: string;
  name: string;
  templateId?: string;
  startTime: number;
  exercises: WorkoutExercise[];
}
