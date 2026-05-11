export type BodyPart = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'other';

export type SetType = 'warmup' | 'working' | 'drop' | 'failure';

export interface Exercise {
  id: string;
  nameKey: string;
  bodyPart: BodyPart;
  isCustom: boolean;
  customName?: string;
  customNames?: Record<string, string>;
}

export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number | null;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt: number;
  updatedAt: number;
  programId?: string;
  dayIndex?: number;
  colorTag?: string;
  emoji?: string;
}

export interface SetRecord {
  id: string;
  exerciseId: string;
  weight: number | null;
  reps: number | null;
  isCompleted: boolean;
  /** Rate of Perceived Exertion 1-10 */
  rpe?: number;
  setType?: SetType;
  isPR?: boolean;
  prKinds?: Array<'1rm' | 'weight' | 'reps' | 'volume'>;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: SetRecord[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  name: string;
  date: string;
  startTime: number;
  endTime?: number;
  templateId?: string;
  programId?: string;
  exercises: WorkoutExercise[];
  totalVolume?: number;
  durationMinutes?: number;
  isHiddenFromRecent?: boolean;
  rating?: number;
  notes?: string;
}

export type ActiveWorkoutMode = 'draft' | 'inProgress';

export interface ActiveWorkout {
  id: string;
  name: string;
  templateId?: string;
  programId?: string;
  mode: ActiveWorkoutMode;
  createdAt: number;
  startedAt?: number;
  exercises: WorkoutExercise[];
}

export interface Program {
  id: string;
  nameKey: string;
  descriptionKey?: string;
  daysPerWeek: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  isBuiltIn: boolean;
  emoji: string;
  templateIds: string[];
}

export interface BodyWeightEntry {
  id: string;
  date: string;
  weightKg: number;
}

export interface PersonalRecord {
  exerciseId: string;
  bestWeight: number;
  bestReps: number;
  bestVolume: number;
  estimated1RM: number;
  achievedDate: string;
  sessionId?: string;
}

export interface Achievement {
  id: string;
  unlockedAt: number;
}
