import { useMemo } from 'react';
import type { Exercise, Units, Variant } from '../types/workout';
import { useWorkout } from '../state/sessionStore';
import { computeProgressSeries, type ProgressPoint } from '../utils/progress';
import ProgressChart from '../components/ProgressChart';

interface Card {
  exercise: Exercise;
  series: ProgressPoint[];
}

const VARIANTS: Variant[] = ['gym', 'home'];

function formatLatest(
  value: number,
  exerciseType: 'weighted' | 'bodyweight',
  units: Units,
): string {
  if (exerciseType === 'weighted') return `~${value} ${units}`;
  return `${value} reps`;
}

export default function ProgressScreen() {
  const { workout } = useWorkout();
  const units = workout.settings.units;

  const cards = useMemo<Card[]>(() => {
    const cycleOrder = new Map<string, number>();
    workout.routine.cycle.forEach((day, dayRank) => {
      for (const variant of VARIANTS) {
        for (const entry of workout.routine.days[day][variant]) {
          if (!cycleOrder.has(entry.exerciseId)) {
            cycleOrder.set(entry.exerciseId, dayRank);
          }
        }
      }
    });

    const result: Card[] = [];
    for (const exercise of workout.exercises) {
      const series = computeProgressSeries(
        exercise.id,
        exercise.type,
        workout.sessions,
      );
      if (series.length < 2) continue;
      result.push({ exercise, series });
    }

    result.sort((a, b) => {
      const aRank = cycleOrder.get(a.exercise.id) ?? Infinity;
      const bRank = cycleOrder.get(b.exercise.id) ?? Infinity;
      if (aRank !== bRank) return aRank - bRank;
      return a.exercise.name.localeCompare(b.exercise.name);
    });

    return result;
  }, [workout.exercises, workout.sessions, workout.routine]);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Progress</h1>
      </header>

      {cards.length === 0 ? (
        <p className="mt-2 text-slate-500">
          Not enough data yet. Log a few sessions to see progress charts.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map(({ exercise, series }) => {
            const latest = series[series.length - 1].value;
            const sessionCount = series.length;
            return (
              <li key={exercise.id}>
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">
                    {exercise.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {exercise.muscles.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  <ProgressChart
                    data={series}
                    units={units}
                    exerciseType={exercise.type}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'} ·
                    Latest {formatLatest(latest, exercise.type, units)}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
