import type {
  CycleDay,
  Exercise,
  RoutineEntry,
  Session,
  SessionSet,
  Variant,
} from '../types/workout';

export interface Prescription {
  weight: number | null;
  repsPerSet: number[];
  bumped: boolean;
}

function findLastCompletedSession(
  sessions: readonly Session[],
  cycleDay: CycleDay,
  variant: Variant,
): Session | null {
  let best: Session | null = null;
  for (const s of sessions) {
    if (s.status !== 'complete') continue;
    if (s.cycleDay !== cycleDay) continue;
    if (s.variant !== variant) continue;
    if (!s.completedAt) continue;
    if (!best || (best.completedAt ?? '') < s.completedAt) {
      best = s;
    }
  }
  return best;
}

function setsForEntry(session: Session, exerciseId: string): SessionSet[] {
  return session.sets
    .filter((s) => s.exerciseId === exerciseId)
    .slice()
    .sort((a, b) => a.setNumber - b.setNumber);
}

function modeWithMaxTiebreak(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let bestCount = 0;
  let bestValue = -Infinity;
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && value > bestValue)) {
      bestCount = count;
      bestValue = value;
    }
  }
  return bestValue;
}

function padRepsTo(n: number, arr: number[], fill: number): number[] {
  if (arr.length >= n) return arr.slice(0, n);
  return [...arr, ...Array.from({ length: n - arr.length }, () => fill)];
}

export function prescribeForEntry(
  entry: RoutineEntry,
  exercise: Exercise,
  sessions: readonly Session[],
  cycleDay: CycleDay,
  variant: Variant,
): Prescription {
  const [low, high] = entry.repRange;
  const mid = Math.round((low + high) / 2);
  const isWeighted = exercise.type === 'weighted';
  const fallbackWeight = isWeighted ? entry.startingWeight ?? null : null;

  const firstSessionPrescription = (): Prescription => ({
    weight: fallbackWeight,
    repsPerSet: Array.from({ length: entry.sets }, () => mid),
    bumped: false,
  });

  const last = findLastCompletedSession(sessions, cycleDay, variant);
  if (!last) return firstSessionPrescription();

  const lastSets = setsForEntry(last, entry.exerciseId);
  if (lastSets.length === 0) return firstSessionPrescription();

  const lastReps = lastSets.map((s) => s.actual.reps);

  if (!isWeighted) {
    const hitTop =
      lastSets.length >= entry.sets &&
      lastSets.every((s) => s.actual.reps >= high);
    return {
      weight: null,
      repsPerSet: hitTop
        ? Array.from({ length: entry.sets }, () => high)
        : padRepsTo(entry.sets, lastReps, mid),
      bumped: false,
    };
  }

  const weights = lastSets
    .map((s) => s.actual.weight)
    .filter((w): w is number => w != null && Number.isFinite(w));
  if (weights.length === 0) return firstSessionPrescription();

  const lastWeight = modeWithMaxTiebreak(weights);
  const atLastWeight = lastSets.filter((s) => s.actual.weight === lastWeight);

  if (atLastWeight.length < entry.sets) {
    return {
      weight: lastWeight,
      repsPerSet: padRepsTo(entry.sets, lastReps, mid),
      bumped: false,
    };
  }

  const hitTop = atLastWeight.every((s) => s.actual.reps >= high);
  if (hitTop) {
    return {
      weight: lastWeight + exercise.weightIncrement,
      repsPerSet: Array.from({ length: entry.sets }, () => low),
      bumped: true,
    };
  }

  return {
    weight: lastWeight,
    repsPerSet: padRepsTo(entry.sets, lastReps, mid),
    bumped: false,
  };
}
