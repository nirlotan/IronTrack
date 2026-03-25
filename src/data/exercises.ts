import type { Exercise, BodyPart } from '../types';

export const defaultExercises: Exercise[] = [
  // Chest
  { id: 'ex_bench_press', nameKey: 'ex_bench_press', bodyPart: 'chest', isCustom: false },
  { id: 'ex_incline_bench', nameKey: 'ex_incline_bench', bodyPart: 'chest', isCustom: false },
  { id: 'ex_cable_fly', nameKey: 'ex_cable_fly', bodyPart: 'chest', isCustom: false },
  { id: 'ex_chest_dip', nameKey: 'ex_chest_dip', bodyPart: 'chest', isCustom: false },
  { id: 'ex_pushup', nameKey: 'ex_pushup', bodyPart: 'chest', isCustom: false },
  { id: 'ex_pec_deck', nameKey: 'ex_pec_deck', bodyPart: 'chest', isCustom: false },
  { id: 'ex_decline_bench', nameKey: 'ex_decline_bench', bodyPart: 'chest', isCustom: false },

  // Back
  { id: 'ex_lat_pulldown', nameKey: 'ex_lat_pulldown', bodyPart: 'back', isCustom: false },
  { id: 'ex_deadlift', nameKey: 'ex_deadlift', bodyPart: 'back', isCustom: false },
  { id: 'ex_barbell_row', nameKey: 'ex_barbell_row', bodyPart: 'back', isCustom: false },
  { id: 'ex_pullup', nameKey: 'ex_pullup', bodyPart: 'back', isCustom: false },
  { id: 'ex_seated_row', nameKey: 'ex_seated_row', bodyPart: 'back', isCustom: false },
  { id: 'ex_face_pull', nameKey: 'ex_face_pull', bodyPart: 'back', isCustom: false },
  { id: 'ex_tbar_row', nameKey: 'ex_tbar_row', bodyPart: 'back', isCustom: false },

  // Legs
  { id: 'ex_squat', nameKey: 'ex_squat', bodyPart: 'legs', isCustom: false },
  { id: 'ex_leg_press', nameKey: 'ex_leg_press', bodyPart: 'legs', isCustom: false },
  { id: 'ex_romanian_deadlift', nameKey: 'ex_romanian_deadlift', bodyPart: 'legs', isCustom: false },
  { id: 'ex_leg_extension', nameKey: 'ex_leg_extension', bodyPart: 'legs', isCustom: false },
  { id: 'ex_leg_curl', nameKey: 'ex_leg_curl', bodyPart: 'legs', isCustom: false },
  { id: 'ex_calf_raise', nameKey: 'ex_calf_raise', bodyPart: 'legs', isCustom: false },
  { id: 'ex_lunge', nameKey: 'ex_lunge', bodyPart: 'legs', isCustom: false },

  // Shoulders
  { id: 'ex_overhead_press', nameKey: 'ex_overhead_press', bodyPart: 'shoulders', isCustom: false },
  { id: 'ex_lateral_raise', nameKey: 'ex_lateral_raise', bodyPart: 'shoulders', isCustom: false },
  { id: 'ex_front_raise', nameKey: 'ex_front_raise', bodyPart: 'shoulders', isCustom: false },
  { id: 'ex_rear_delt_fly', nameKey: 'ex_rear_delt_fly', bodyPart: 'shoulders', isCustom: false },
  { id: 'ex_shrug', nameKey: 'ex_shrug', bodyPart: 'shoulders', isCustom: false },

  // Arms
  { id: 'ex_barbell_curl', nameKey: 'ex_barbell_curl', bodyPart: 'arms', isCustom: false },
  { id: 'ex_hammer_curl', nameKey: 'ex_hammer_curl', bodyPart: 'arms', isCustom: false },
  { id: 'ex_tricep_pushdown', nameKey: 'ex_tricep_pushdown', bodyPart: 'arms', isCustom: false },
  { id: 'ex_skull_crusher', nameKey: 'ex_skull_crusher', bodyPart: 'arms', isCustom: false },
  { id: 'ex_preacher_curl', nameKey: 'ex_preacher_curl', bodyPart: 'arms', isCustom: false },
  { id: 'ex_overhead_tricep', nameKey: 'ex_overhead_tricep', bodyPart: 'arms', isCustom: false },

  // Core
  { id: 'ex_plank', nameKey: 'ex_plank', bodyPart: 'core', isCustom: false },
  { id: 'ex_crunch', nameKey: 'ex_crunch', bodyPart: 'core', isCustom: false },
  { id: 'ex_hanging_leg_raise', nameKey: 'ex_hanging_leg_raise', bodyPart: 'core', isCustom: false },
  { id: 'ex_russian_twist', nameKey: 'ex_russian_twist', bodyPart: 'core', isCustom: false },
  { id: 'ex_cable_crunch', nameKey: 'ex_cable_crunch', bodyPart: 'core', isCustom: false },
];

export const bodyPartKeys: BodyPart[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'];

export const bodyPartNameKeys: Record<BodyPart, string> = {
  chest: 'bp_chest',
  back: 'bp_back',
  legs: 'bp_legs',
  shoulders: 'bp_shoulders',
  arms: 'bp_arms',
  core: 'bp_core',
  cardio: 'bp_cardio',
  other: 'bp_other',
};
