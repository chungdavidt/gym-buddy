import type { Exercise, RoutineEntry, Units } from '../types/workout';

interface Props {
  exercise: Exercise;
  entry: RoutineEntry;
  units: Units;
}

export default function ExerciseCard({ exercise, entry, units }: Props) {
  const [low, high] = entry.repRange;
  const repText = low === high ? `${low} reps` : `${low}-${high} reps`;

  const loadText =
    exercise.type === 'weighted'
      ? entry.startingWeight != null
        ? `@ ${entry.startingWeight} ${units}`
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
