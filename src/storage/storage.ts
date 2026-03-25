import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache for synchronous reads after hydration
const cache: Record<string, string> = {};

export function getJSON<T>(key: string): T | null {
  const raw = cache[key];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJSON<T>(key: string, value: T): void {
  const str = JSON.stringify(value);
  cache[key] = str;
  AsyncStorage.setItem(key, str).catch(() => {});
}

export async function hydrateCache(keys: string[]): Promise<void> {
  const results = await Promise.all(keys.map((k) => AsyncStorage.getItem(k)));
  for (let i = 0; i < keys.length; i++) {
    if (results[i] != null) {
      cache[keys[i]] = results[i]!;
    }
  }
}
