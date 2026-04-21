import type { WorkoutData } from '../types/workout';

const KEY = 'gym-buddy:workout:v1';

export function loadWorkout(seed: WorkoutData): WorkoutData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as WorkoutData;
    if (!parsed || typeof parsed !== 'object') return seed;
    return parsed;
  } catch {
    return seed;
  }
}

export function saveWorkout(data: WorkoutData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // quota / private mode — swallow; UI continues with in-memory state
  }
}

export function clearWorkout(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
