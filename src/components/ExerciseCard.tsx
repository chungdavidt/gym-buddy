import { useMemo } from 'react';
import type {
  CycleDay,
  Exercise,
  RoutineEntry,
  Session,
  Units,
  Variant,
} from '../types/workout';
import { formatRepRange } from '../utils/format';
import { prescribeForEntry } from '../utils/progression';

interface Props {
  exercise: Exercise;
  entry: RoutineEntry;
  units: Units;
  sessions: readonly Session[];
  cycleDay: CycleDay;
  variant: Variant;
}

export default function ExerciseCard({
  exercise,
  entry,
  units,
  sessions,
  cycleDay,
  variant,
}: Props) {
  const repText = formatRepRange(entry.repRange);

  const prescription = useMemo(
    () => prescribeForEntry(entry, exercise, sessions, cycleDay, variant),
    [entry, exercise, sessions, cycleDay, variant],
  );

  const loadText =
    exercise.type === 'weighted'
      ? prescription.weight != null
        ? `@ ${prescription.weight} ${units}`
        : '(weight TBD)'
      : '(bodyweight)';

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{exercise.name}</h3>

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

      <p className="mt-2 text-sm text-slate-700">
        {entry.sets} sets × {repText} {loadText}
      </p>

      {exercise.notes && (
        <p className="mt-1 text-xs italic text-slate-500">{exercise.notes}</p>
      )}
    </article>
  );
}
