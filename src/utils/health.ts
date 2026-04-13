import AppleHealthKit from 'react-native-health';
import type { HealthKitPermissions } from 'react-native-health';
import { Platform } from 'react-native';

const permissions: HealthKitPermissions = {
  permissions: {
    read: [AppleHealthKit.Constants.Permissions.Workout],
    write: [AppleHealthKit.Constants.Permissions.Workout],
  },
};

export const initHealthKit = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios') {
      return resolve();
    }

    if (!AppleHealthKit || typeof AppleHealthKit.initHealthKit !== 'function') {
      console.log('[HealthKit] Native module not found. Ensure you are using a development build (Prebuild) and not Expo Go.');
      return resolve(); // Resolve instead of reject to avoid crashing the app startup
    }

    AppleHealthKit.initHealthKit(permissions, (error) => {
      if (error) {
        console.log('[HealthKit] Initialization failed:', error);
        return reject(error);
      }
      resolve();
    });
  });
};

export const saveStrengthWorkout = async (
  startTime: number,
  endTime: number,
  energyBurned: number = 0
): Promise<void> => {
  if (Platform.OS !== 'ios') return;

  if (!AppleHealthKit || typeof AppleHealthKit.saveWorkout !== 'function') {
    console.log('[HealthKit] saveWorkout not available.');
    return;
  }

  // Ensure initialized
  try {
    await initHealthKit();
  } catch (e) {
    return;
  }

  const workoutOptions = {
    type: AppleHealthKit.Constants.Activities.TraditionalStrengthTraining || 'TraditionalStrengthTraining',
    startDate: new Date(startTime).toISOString(),
    endDate: new Date(endTime).toISOString(),
    energyBurned: energyBurned > 0 ? energyBurned : undefined,
    energyBurnedUnit: 'calorie',
  };

  return new Promise((resolve, reject) => {
    AppleHealthKit.saveWorkout(workoutOptions, (error: any) => {
      if (error) {
        console.log('[HealthKit] Failed to save workout:', error);
        return reject(error);
      }
      console.log('[HealthKit] Workout saved successfully');
      resolve();
    });
  });
};
