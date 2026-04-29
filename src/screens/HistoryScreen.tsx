import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { CycleDay } from '../types/workout';
import { useWorkout } from '../state/sessionStore';
import { formatSessionDate, formatSessionDuration } from '../utils/format';

const dayLabel: Record<CycleDay, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
};

const dayPillStyle: Record<CycleDay, string> = {
  push: 'bg-rose-100 text-rose-700',
  pull: 'bg-sky-100 text-sky-700',
  legs: 'bg-violet-100 text-violet-700',
};

export default function HistoryScreen() {
  const { workout } = useWorkout();

  const completed = useMemo(
    () =>
      workout.sessions
        .filter((s) => s.status === 'complete')
        .slice()
        .sort((a, b) => {
          const aKey = a.completedAt ?? a.date;
          const bKey = b.completedAt ?? b.date;
          return bKey.localeCompare(aKey);
        }),
    [workout.sessions],
  );

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">History</h1>
      </header>

      {completed.length === 0 ? (
        <p className="mt-2 text-slate-500">
          No completed workouts yet. Start one from Today.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {completed.map((s) => {
            const dateText = formatSessionDate(s.completedAt ?? s.date);
            const durationText = formatSessionDuration(s.startedAt, s.completedAt);
            const setCount = s.sets.length;
            return (
              <li key={s.id}>
                <Link
                  to={`/history/${s.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
                >
                  <p className="text-base font-semibold text-slate-900">{dateText}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${dayPillStyle[s.cycleDay]}`}
                    >
                      {dayLabel[s.cycleDay]}
                    </span>
                    <span className="text-sm text-slate-600">
                      {s.variant === 'gym' ? 'Gym' : 'Home'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {setCount} {setCount === 1 ? 'set' : 'sets'} · {durationText}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
