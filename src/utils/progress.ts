import type { Session, SessionSet } from '../types/workout';

export function setEstimatedOneRepMax(set: SessionSet): number | null {
  if (set.actual.weight == null) return null;
  return set.actual.weight * (1 + set.actual.reps / 30);
}

export interface ProgressPoint {
  date: string;
  value: number;
}

export function computeProgressSeries(
  exerciseId: string,
  exerciseType: 'weighted' | 'bodyweight',
  sessions: readonly Session[],
): ProgressPoint[] {
  const points: ProgressPoint[] = [];

  for (const session of sessions) {
    if (session.status !== 'complete') continue;
    if (!session.completedAt) continue;

    const sets = session.sets.filter((s) => s.exerciseId === exerciseId);
    if (sets.length === 0) continue;

    let value: number | null = null;
    if (exerciseType === 'weighted') {
      const oneRepMaxes = sets
        .map(setEstimatedOneRepMax)
        .filter((v): v is number => v != null && Number.isFinite(v));
      if (oneRepMaxes.length === 0) continue;
      value = Math.round(Math.max(...oneRepMaxes));
    } else {
      const reps = sets
        .map((s) => s.actual.reps)
        .filter((r) => Number.isFinite(r));
      if (reps.length === 0) continue;
      value = Math.max(...reps);
    }

    points.push({ date: session.completedAt.slice(0, 10), value });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}
