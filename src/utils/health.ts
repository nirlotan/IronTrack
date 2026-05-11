import AppleHealthKit from 'react-native-health';
import type { HealthKitPermissions } from 'react-native-health';
import { Platform } from 'react-native';

/**
 * Permissions we ask for on first launch.
 * - Workout (read/write): required to log strength training sessions.
 * - ActiveEnergyBurned (write): adds calorie burn to each workout in Health.
 * - BodyMass (read): lets us auto-estimate calories from the user's weight.
 */
const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.Weight,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
  },
};

let initPromise: Promise<boolean> | null = null;

function isAvailable(): boolean {
  return (
    Platform.OS === 'ios' &&
    !!AppleHealthKit &&
    typeof AppleHealthKit.initHealthKit === 'function'
  );
}

/**
 * Initialize HealthKit and request permissions. Memoized so we only ask once
 * per app session. Resolves to `true` when the bridge is wired up, `false` on
 * unsupported platforms (Android / Expo Go / web).
 */
export const initHealthKit = (): Promise<boolean> => {
  if (initPromise) return initPromise;

  initPromise = new Promise<boolean>((resolve) => {
    if (!isAvailable()) {
      console.log('[HealthKit] Not available on this platform/build.');
      return resolve(false);
    }

    AppleHealthKit.initHealthKit(permissions, (error) => {
      if (error) {
        console.log('[HealthKit] Init failed:', error);
        // Reset so we can retry later (e.g., after the user enables it in Settings).
        initPromise = null;
        return resolve(false);
      }
      console.log('[HealthKit] Initialized.');
      resolve(true);
    });
  });

  return initPromise;
};

/**
 * Read the user's most recent body-mass entry from Health.
 * Returns kilograms, or `null` if unavailable or not granted.
 */
function getLatestBodyMassKg(): Promise<number | null> {
  return new Promise((resolve) => {
    if (!isAvailable() || typeof AppleHealthKit.getLatestWeight !== 'function') {
      return resolve(null);
    }
    AppleHealthKit.getLatestWeight({ unit: 'gram' as any }, (err, results: any) => {
      if (err || !results?.value) return resolve(null);
      // react-native-health returns pounds by default; if we asked for grams
      // we receive grams, otherwise we receive pounds. Be defensive.
      const grams = Number(results.value);
      if (!isFinite(grams) || grams <= 0) return resolve(null);
      // Heuristic: a body-mass value > 500 is almost certainly grams,
      // anything below is pounds (libs are inconsistent across versions).
      const kg = grams > 500 ? grams / 1000 : grams * 0.45359237;
      resolve(kg);
    });
  });
}

/**
 * Rough calorie estimate for traditional strength training.
 * MET ≈ 5.0 for moderate-intensity weight training. Falls back to 75kg if
 * we can't read body-mass from Health.
 *
 *   kcal = MET × weightKg × hours
 */
function estimateStrengthCalories(durationMs: number, bodyMassKg: number | null): number {
  const hours = Math.max(0, durationMs / (1000 * 60 * 60));
  const weight = bodyMassKg && bodyMassKg > 0 ? bodyMassKg : 75;
  const MET = 5.0;
  return Math.round(MET * weight * hours);
}

interface SaveStrengthWorkoutOptions {
  /** Total volume (kg × reps) for the session — included in workout metadata. */
  totalVolume?: number;
  /** Override the estimated calorie burn. */
  energyBurned?: number;
}

/**
 * Save a completed strength-training session to Apple Health.
 * Safe to call on non-iOS — it becomes a no-op.
 */
export const saveStrengthWorkout = async (
  startTime: number,
  endTime: number,
  options: SaveStrengthWorkoutOptions = {}
): Promise<void> => {
  if (!isAvailable()) return;
  if (typeof AppleHealthKit.saveWorkout !== 'function') {
    console.log('[HealthKit] saveWorkout unavailable.');
    return;
  }

  const ready = await initHealthKit();
  if (!ready) return;

  const durationMs = Math.max(0, endTime - startTime);
  if (durationMs < 60 * 1000) {
    // Health rejects workouts shorter than ~1 minute — skip silently.
    console.log('[HealthKit] Skipping save: workout under 1 minute.');
    return;
  }

  const bodyMassKg = await getLatestBodyMassKg();
  const energyBurned =
    options.energyBurned != null && options.energyBurned > 0
      ? options.energyBurned
      : estimateStrengthCalories(durationMs, bodyMassKg);

  const workoutOptions: any = {
    type:
      AppleHealthKit.Constants.Activities.TraditionalStrengthTraining ||
      'TraditionalStrengthTraining',
    startDate: new Date(startTime).toISOString(),
    endDate: new Date(endTime).toISOString(),
    energyBurned,
    energyBurnedUnit: 'calorie',
  };

  return new Promise((resolve) => {
    AppleHealthKit.saveWorkout(workoutOptions, (error: any, _result: any) => {
      if (error) {
        console.log('[HealthKit] Failed to save workout:', error);
        return resolve(); // never reject — Health failures must not break finish flow
      }
      console.log(
        `[HealthKit] Saved strength workout: ${Math.round(durationMs / 60000)}min, ` +
          `${energyBurned}kcal${options.totalVolume ? `, ${Math.round(options.totalVolume)}kg volume` : ''}`
      );
      resolve();
    });
  });
};

/** True when running on a platform where HealthKit will function. */
export const isHealthKitSupported = (): boolean => isAvailable();

