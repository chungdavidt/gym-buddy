import { useMemo, useState } from 'react';
import { workout } from '../data/sampleWorkout';
import type { Exercise, Variant } from '../types/workout';
import VariantToggle from '../components/VariantToggle';
import ExerciseCard from '../components/ExerciseCard';

const dayLabel: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
};

export default function TodayScreen() {
  const cycleDay = workout.state.nextCycleDay;
  const [variant, setVariant] = useState<Variant>(workout.settings.lastVariant);

  const exerciseById = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const ex of workout.exercises) map.set(ex.id, ex);
    return map;
  }, []);

  const entries = workout.routine.days[cycleDay][variant];

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Today</p>
        <h1 className="text-2xl font-bold text-slate-900">
          {dayLabel[cycleDay] ?? cycleDay} — {variant === 'gym' ? 'Gym' : 'Home'}
        </h1>
      </header>

      <div className="mb-5">
        <VariantToggle value={variant} onChange={setVariant} />
      </div>

      <ul className="flex flex-col gap-3">
        {entries.map((entry, idx) => {
          const exercise = exerciseById.get(entry.exerciseId);
          if (!exercise) {
            return (
              <li key={`${entry.exerciseId}-${idx}`}>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Unknown exercise: <code>{entry.exerciseId}</code>
                </div>
              </li>
            );
          }
          return (
            <li key={`${entry.exerciseId}-${idx}`}>
              <ExerciseCard
                exercise={exercise}
                entry={entry}
                units={workout.settings.units}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
