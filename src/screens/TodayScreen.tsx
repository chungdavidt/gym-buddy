import { useMemo, useState } from 'react';
import type {
  Exercise,
  SessionSet,
  SessionTag,
  Variant,
} from '../types/workout';
import VariantToggle from '../components/VariantToggle';
import ExerciseCard from '../components/ExerciseCard';
import InteractiveExerciseCard from '../components/InteractiveExerciseCard';
import RestTimer from '../components/RestTimer';
import { useWorkout } from '../state/sessionStore';
import { useRestTimer } from '../hooks/useRestTimer';

const dayLabel: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
};

export default function TodayScreen() {
  const { workout, inProgressSession, dispatch } = useWorkout();
  const timer = useRestTimer();

  const activeCycleDay = inProgressSession?.cycleDay ?? workout.state.nextCycleDay;
  const activeVariant = inProgressSession?.variant ?? workout.settings.lastVariant;

  const [previewVariant, setPreviewVariant] = useState<Variant>(activeVariant);
  const variant = inProgressSession ? inProgressSession.variant : previewVariant;

  const exerciseById = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const ex of workout.exercises) map.set(ex.id, ex);
    return map;
  }, [workout.exercises]);

  const entries = workout.routine.days[activeCycleDay][variant];

  const setsByEntryIndex = useMemo(() => {
    const map = new Map<number, SessionSet[]>();
    if (!inProgressSession) return map;
    for (const s of inProgressSession.sets) {
      const arr = map.get(s.routineEntryIndex);
      if (arr) arr.push(s);
      else map.set(s.routineEntryIndex, [s]);
    }
    return map;
  }, [inProgressSession]);

  const handleStart = () => {
    dispatch({ type: 'START_SESSION', variant: previewVariant });
  };

  const handleFinish = () => {
    if (timer.isActive) timer.stop();
    dispatch({ type: 'FINISH_SESSION' });
  };

  const handleCancel = () => {
    if (timer.isActive) timer.stop();
    dispatch({ type: 'CANCEL_SESSION' });
  };

  const handleLogSet = (
    routineEntryIndex: number,
    setNumber: number,
    weight: number | null,
    reps: number,
    target: { weight: number | null; reps: number },
  ) => {
    dispatch({
      type: 'LOG_SET',
      routineEntryIndex,
      setNumber,
      weight,
      reps,
      target,
    });
    timer.start(workout.settings.defaultRestSeconds);
  };

  const handleToggleTag = (
    routineEntryIndex: number,
    setNumber: number,
    tag: SessionTag,
  ) => {
    const current = setsByEntryIndex
      .get(routineEntryIndex)
      ?.find((s) => s.setNumber === setNumber)?.tag;
    dispatch({
      type: 'TAG_SET',
      routineEntryIndex,
      setNumber,
      tag: current === tag ? undefined : tag,
    });
  };

  const totalSets = entries.reduce((sum, e) => sum + e.sets, 0);
  const loggedSetCount = inProgressSession?.sets.length ?? 0;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Today</p>
        <h1 className="text-2xl font-bold text-slate-900">
          {dayLabel[activeCycleDay] ?? activeCycleDay} —{' '}
          {variant === 'gym' ? 'Gym' : 'Home'}
        </h1>
        {inProgressSession && (
          <p className="mt-1 text-xs text-slate-500">
            {loggedSetCount} / {totalSets} sets logged
          </p>
        )}
      </header>

      {!inProgressSession && (
        <div className="mb-5">
          <VariantToggle value={previewVariant} onChange={setPreviewVariant} />
        </div>
      )}

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
              {inProgressSession ? (
                <InteractiveExerciseCard
                  exercise={exercise}
                  entry={entry}
                  entryIndex={idx}
                  units={workout.settings.units}
                  loggedSets={setsByEntryIndex.get(idx) ?? []}
                  sessions={workout.sessions}
                  cycleDay={activeCycleDay}
                  variant={variant}
                  onLogSet={(setNumber, weight, reps, target) =>
                    handleLogSet(idx, setNumber, weight, reps, target)
                  }
                  onToggleTag={(setNumber, tag) =>
                    handleToggleTag(idx, setNumber, tag)
                  }
                />
              ) : (
                <ExerciseCard
                  exercise={exercise}
                  entry={entry}
                  units={workout.settings.units}
                  sessions={workout.sessions}
                  cycleDay={activeCycleDay}
                  variant={variant}
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 mb-4 flex flex-col gap-2">
        {inProgressSession ? (
          <>
            <button
              type="button"
              onClick={handleFinish}
              className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-sm active:bg-emerald-700"
            >
              Finish workout
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-500 active:bg-slate-100"
            >
              Cancel workout
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            className="h-12 w-full rounded-xl bg-indigo-600 text-base font-semibold text-white shadow-sm active:bg-indigo-700"
          >
            Start workout
          </button>
        )}
      </div>

      <RestTimer />
    </div>
  );
}
