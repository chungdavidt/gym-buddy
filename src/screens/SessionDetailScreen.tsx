import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CycleDay, Exercise, SessionSet } from '../types/workout';
import { useWorkout } from '../state/sessionStore';
import {
  formatCalories,
  formatSessionDate,
  formatSessionDuration,
  setHitTarget,
} from '../utils/format';
import { estimateSessionCalories } from '../utils/calories';

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

export default function SessionDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { workout } = useWorkout();

  const session = useMemo(
    () => workout.sessions.find((s) => s.id === id) ?? null,
    [workout.sessions, id],
  );

  const exerciseById = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const ex of workout.exercises) map.set(ex.id, ex);
    return map;
  }, [workout.exercises]);

  const groupedSets = useMemo(() => {
    const map = new Map<number, SessionSet[]>();
    if (!session) return map;
    for (const s of session.sets) {
      const arr = map.get(s.routineEntryIndex);
      if (arr) arr.push(s);
      else map.set(s.routineEntryIndex, [s]);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.setNumber - b.setNumber);
    }
    return map;
  }, [session]);

  const orderedEntryIndices = useMemo(
    () => Array.from(groupedSets.keys()).sort((a, b) => a - b),
    [groupedSets],
  );

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6">
        <Link to="/history" className="text-sm text-indigo-600">
          ← Back to history
        </Link>
        <p className="mt-4 text-slate-500">Session not found.</p>
      </div>
    );
  }

  const dateText = formatSessionDate(session.completedAt ?? session.date);
  const durationText = formatSessionDuration(session.startedAt, session.completedAt);
  const units = workout.settings.units;
  const kcal = estimateSessionCalories(
    session,
    workout.settings.bodyWeight,
    units,
  );

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-4">
        <Link to="/history" className="text-sm text-indigo-600">
          ← Back to history
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{dateText}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${dayPillStyle[session.cycleDay]}`}
          >
            {dayLabel[session.cycleDay]}
          </span>
          <span className="text-sm text-slate-600">
            {session.variant === 'gym' ? 'Gym' : 'Home'}
          </span>
          <span className="ml-auto text-xs text-slate-500">
            {durationText}
            {kcal !== null && ` · ${formatCalories(kcal)}`}
          </span>
        </div>
      </header>

      {session.sets.length === 0 ? (
        <p className="text-slate-500">No sets recorded.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orderedEntryIndices.map((entryIdx) => {
            const sets = groupedSets.get(entryIdx) ?? [];
            const exerciseId = sets[0]?.exerciseId;
            const exercise = exerciseId ? exerciseById.get(exerciseId) : undefined;
            const name = exercise?.name ?? `Unknown exercise (${exerciseId ?? '—'})`;

            return (
              <li key={entryIdx}>
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">{name}</h3>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {sets.map((s) => {
                      const hit = setHitTarget(s);
                      const loadText =
                        s.actual.weight != null
                          ? `${s.actual.weight} ${units} × ${s.actual.reps}`
                          : `BW × ${s.actual.reps}`;
                      return (
                        <li
                          key={s.setNumber}
                          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                        >
                          <span className="w-12 text-xs uppercase tracking-wide text-slate-500">
                            Set {s.setNumber}
                          </span>
                          <span className="flex-1 tabular-nums text-slate-800">
                            {loadText}
                          </span>
                          {hit ? (
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-xs text-white"
                              aria-label="Hit target"
                            >
                              ✓
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              (target {s.target.reps})
                            </span>
                          )}
                          {s.tag === 'too_heavy' && (
                            <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                              too heavy
                            </span>
                          )}
                          {s.tag === 'too_easy' && (
                            <span className="rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-900">
                              too easy
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
