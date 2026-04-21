import { useState } from 'react';
import type { SessionSet, SessionTag, Units } from '../types/workout';

interface Props {
  setNumber: number;
  target: { weight: number | null; reps: number };
  logged: SessionSet | null;
  weightIncrement: number;
  units: Units;
  isActive: boolean;
  onLog: (weight: number | null, reps: number) => void;
  onToggleTag: (tag: SessionTag) => void;
}

const STEP_BTN =
  'flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-semibold text-slate-700 shadow-sm active:bg-slate-100 disabled:opacity-30';

const TAG_BTN =
  'h-9 rounded-full px-3 text-xs font-medium border transition-colors';

export default function SetRow({
  setNumber,
  target,
  logged,
  weightIncrement,
  units,
  isActive,
  onLog,
  onToggleTag,
}: Props) {
  const hasWeight = weightIncrement > 0;
  const isLogged = logged !== null;

  const [draftWeight, setDraftWeight] = useState<number | null>(
    hasWeight ? target.weight ?? 0 : null,
  );
  const [draftReps, setDraftReps] = useState<number>(target.reps);

  const weight = isLogged ? logged.actual.weight : draftWeight;
  const reps = isLogged ? logged.actual.reps : draftReps;
  const disabled = !isActive && !isLogged;

  const bumpWeight = (delta: number) => {
    if (!hasWeight) return;
    setDraftWeight((w) => Math.max(0, (w ?? 0) + delta));
  };

  const bumpReps = (delta: number) => {
    setDraftReps((r) => Math.max(0, r + delta));
  };

  return (
    <div
      className={`rounded-lg border p-3 transition-opacity ${
        isLogged
          ? 'border-emerald-200 bg-emerald-50/60'
          : isActive
            ? 'border-slate-300 bg-white'
            : 'border-slate-200 bg-slate-50 opacity-50'
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Set {setNumber}
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-2">
        {hasWeight && (
          <>
            <div />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={STEP_BTN}
                onClick={() => bumpWeight(-weightIncrement)}
                disabled={disabled || isLogged}
                aria-label={`Decrease weight by ${weightIncrement} ${units}`}
              >
                −
              </button>
              <div className="min-w-[72px] text-center">
                <div className="text-base font-semibold tabular-nums text-slate-900">
                  {weight ?? 0}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  {units}
                </div>
              </div>
              <button
                type="button"
                className={STEP_BTN}
                onClick={() => bumpWeight(weightIncrement)}
                disabled={disabled || isLogged}
                aria-label={`Increase weight by ${weightIncrement} ${units}`}
              >
                +
              </button>
            </div>
            <div />
          </>
        )}

        <div />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={STEP_BTN}
            onClick={() => bumpReps(-1)}
            disabled={disabled || isLogged}
            aria-label="Decrease reps"
          >
            −
          </button>
          <div className="min-w-[72px] text-center">
            <div className="text-base font-semibold tabular-nums text-slate-900">
              {reps}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">
              reps
            </div>
          </div>
          <button
            type="button"
            className={STEP_BTN}
            onClick={() => bumpReps(1)}
            disabled={disabled || isLogged}
            aria-label="Increase reps"
          >
            +
          </button>
        </div>
        <div className="flex justify-end">
          {isLogged ? (
            <span
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-white"
              aria-label="Set logged"
            >
              ✓
            </span>
          ) : (
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-600 text-xl font-bold text-white shadow-sm active:bg-indigo-700 disabled:bg-slate-300"
              onClick={() => onLog(hasWeight ? weight : null, reps)}
              disabled={disabled}
              aria-label="Log set"
            >
              ✓
            </button>
          )}
        </div>
      </div>

      {isLogged && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => onToggleTag('too_heavy')}
            className={`${TAG_BTN} ${
              logged.tag === 'too_heavy'
                ? 'border-amber-400 bg-amber-100 text-amber-900'
                : 'border-slate-200 bg-white text-slate-500 active:bg-slate-100'
            }`}
          >
            too heavy
          </button>
          <button
            type="button"
            onClick={() => onToggleTag('too_easy')}
            className={`${TAG_BTN} ${
              logged.tag === 'too_easy'
                ? 'border-sky-400 bg-sky-100 text-sky-900'
                : 'border-slate-200 bg-white text-slate-500 active:bg-slate-100'
            }`}
          >
            too easy
          </button>
        </div>
      )}
    </div>
  );
}
