import { useMemo } from 'react';
import type {
  CycleDay,
  Exercise,
  RoutineEntry,
  Session,
  SessionSet,
  SessionTag,
  Units,
  Variant,
} from '../types/workout';
import { formatRepRange } from '../utils/format';
import { prescribeForEntry } from '../utils/progression';
import SetRow from './SetRow';

interface Props {
  exercise: Exercise;
  entry: RoutineEntry;
  entryIndex: number;
  units: Units;
  loggedSets: SessionSet[];
  sessions: readonly Session[];
  cycleDay: CycleDay;
  variant: Variant;
  onLogSet: (
    setNumber: number,
    weight: number | null,
    reps: number,
    target: { weight: number | null; reps: number },
  ) => void;
  onToggleTag: (setNumber: number, tag: SessionTag) => void;
}

export default function InteractiveExerciseCard({
  exercise,
  entry,
  entryIndex,
  units,
  loggedSets,
  sessions,
  cycleDay,
  variant,
  onLogSet,
  onToggleTag,
}: Props) {
  const weightIncrement = exercise.type === 'weighted' ? exercise.weightIncrement : 0;
  const repText = formatRepRange(entry.repRange);

  const prescription = useMemo(
    () => prescribeForEntry(entry, exercise, sessions, cycleDay, variant),
    [entry, exercise, sessions, cycleDay, variant],
  );

  const loggedBySetNumber = new Map<number, SessionSet>();
  for (const s of loggedSets) loggedBySetNumber.set(s.setNumber, s);

  const nextActiveSetNumber = loggedSets.length + 1;

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

      <div className="mt-3 flex flex-col gap-2">
        {Array.from({ length: entry.sets }, (_, i) => {
          const setNumber = i + 1;
          const logged = loggedBySetNumber.get(setNumber) ?? null;
          const isActive = !logged && setNumber === nextActiveSetNumber;
          const target = {
            weight: prescription.weight,
            reps: prescription.repsPerSet[i] ?? 0,
          };
          return (
            <SetRow
              key={`${entryIndex}-${setNumber}`}
              setNumber={setNumber}
              target={target}
              logged={logged}
              weightIncrement={weightIncrement}
              units={units}
              isActive={isActive}
              onLog={(weight, reps) => onLogSet(setNumber, weight, reps, target)}
              onToggleTag={(tag) => onToggleTag(setNumber, tag)}
            />
          );
        })}
      </div>
    </article>
  );
}
