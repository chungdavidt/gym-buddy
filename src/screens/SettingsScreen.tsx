import { useEffect, useState } from 'react';
import type { Units } from '../types/workout';
import { parseWorkoutJSON, useWorkout } from '../state/sessionStore';
import { clearWorkout } from '../data/storage';
import { downloadJSON } from '../utils/download';

const unitOptions: { value: Units; label: string }[] = [
  { value: 'lb', label: 'lb' },
  { value: 'kg', label: 'kg' },
];

const MIN_REST = 30;
const MAX_REST = 300;
const REST_STEP = 15;

const STEP_BTN =
  'flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-semibold text-slate-700 shadow-sm active:bg-slate-100 disabled:opacity-30';

const INPUT =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-300 focus:border-indigo-500 focus:outline-none';

export default function SettingsScreen() {
  const { workout, dispatch } = useWorkout();
  const { settings, sessions, state, version } = workout;

  const [importDraft, setImportDraft] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast === null) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const handleUnits = (u: Units) => {
    dispatch({ type: 'UPDATE_SETTINGS', patch: { units: u } });
  };

  const handleRestBump = (delta: number) => {
    const next = Math.min(
      MAX_REST,
      Math.max(MIN_REST, settings.defaultRestSeconds + delta),
    );
    if (next === settings.defaultRestSeconds) return;
    dispatch({ type: 'UPDATE_SETTINGS', patch: { defaultRestSeconds: next } });
  };

  const handleGistToken = (value: string) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      patch: { gistToken: value === '' ? null : value },
    });
  };

  const handleGistId = (value: string) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      patch: { gistId: value === '' ? null : value },
    });
  };

  const handleExport = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadJSON(`gym-buddy-${dateStr}.json`, workout);
    setToast('Exported');
  };

  const handleImport = () => {
    setImportError(null);
    const result = parseWorkoutJSON(importDraft);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    const inProgress = state.inProgressSessionId !== null;
    const msg = inProgress
      ? 'Importing will replace all data, including your in-progress workout. Continue?'
      : 'Importing will replace all existing data. Continue?';
    if (!window.confirm(msg)) return;
    dispatch({ type: 'IMPORT_WORKOUT', data: result.data });
    setImportDraft('');
    setToast('Imported');
  };

  const handleClear = () => {
    const inProgress = state.inProgressSessionId !== null;
    const msg = inProgress
      ? 'This will erase every logged workout, your in-progress workout, and all settings. This cannot be undone.'
      : 'This will erase every logged workout and all settings. This cannot be undone.';
    if (!window.confirm(msg)) return;
    clearWorkout();
    window.location.reload();
  };

  const completedCount = sessions.filter((s) => s.status === 'complete').length;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {toast && (
        <div
          role="status"
          className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {toast}
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Units
        </h2>
        <div className="mt-2 inline-flex rounded-full bg-slate-200 p-1">
          {unitOptions.map((opt) => {
            const active = opt.value === settings.units;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleUnits(opt.value)}
                className={`min-w-[80px] rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active ? 'bg-white text-slate-900 shadow' : 'text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Display label only; historical weights are not converted.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Default rest
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className={STEP_BTN}
            onClick={() => handleRestBump(-REST_STEP)}
            disabled={settings.defaultRestSeconds <= MIN_REST}
            aria-label={`Decrease rest by ${REST_STEP} seconds`}
          >
            −
          </button>
          <div className="min-w-[80px] text-center">
            <div className="text-base font-semibold tabular-nums text-slate-900">
              {settings.defaultRestSeconds}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">
              seconds
            </div>
          </div>
          <button
            type="button"
            className={STEP_BTN}
            onClick={() => handleRestBump(REST_STEP)}
            disabled={settings.defaultRestSeconds >= MAX_REST}
            aria-label={`Increase rest by ${REST_STEP} seconds`}
          >
            +
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Range {MIN_REST}–{MAX_REST}s. Changes apply to the next rest timer
          you start.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Cloud backup <span className="text-slate-400">(preview)</span>
        </h2>
        <div className="mt-2 flex flex-col gap-3">
          <label className="flex flex-col text-sm text-slate-700">
            <span className="mb-1 text-xs font-medium text-slate-600">
              Gist token
            </span>
            <input
              type="password"
              value={settings.gistToken ?? ''}
              onChange={(e) => handleGistToken(e.target.value)}
              placeholder="ghp_…"
              className={INPUT}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </label>
          <label className="flex flex-col text-sm text-slate-700">
            <span className="mb-1 text-xs font-medium text-slate-600">
              Gist ID
            </span>
            <input
              type="text"
              value={settings.gistId ?? ''}
              onChange={(e) => handleGistId(e.target.value)}
              placeholder="1a2b3c…"
              className={INPUT}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Sync coming in the next update.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Manual backup
        </h2>
        <button
          type="button"
          onClick={handleExport}
          className="mt-2 h-11 w-full rounded-xl bg-slate-800 text-sm font-semibold text-white shadow-sm active:bg-slate-900"
        >
          Export workout
        </button>
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-600">
            Import workout
          </label>
          <textarea
            value={importDraft}
            onChange={(e) => {
              setImportDraft(e.target.value);
              if (importError) setImportError(null);
            }}
            placeholder="Paste a gym-buddy-*.json blob here…"
            rows={6}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-300 focus:border-indigo-500 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {importError && (
            <p className="mt-1 text-xs text-red-600">{importError}</p>
          )}
          <button
            type="button"
            onClick={handleImport}
            disabled={importDraft.trim() === ''}
            className="mt-2 h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm active:bg-indigo-700 disabled:bg-slate-300"
          >
            Apply import
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-red-600">
          Danger zone
        </h2>
        <button
          type="button"
          onClick={handleClear}
          className="mt-2 h-11 w-full rounded-xl border border-red-300 bg-white text-sm font-semibold text-red-600 active:bg-red-50"
        >
          Clear all data
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Erases every logged workout and all settings. Cannot be undone.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          About
        </h2>
        <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-slate-500">App version</dt>
          <dd className="text-right tabular-nums text-slate-900">{version}</dd>
          <dt className="text-slate-500">Last session</dt>
          <dd className="text-right tabular-nums text-slate-900">
            {state.lastSessionDate ?? 'never'}
          </dd>
          <dt className="text-slate-500">Completed workouts</dt>
          <dd className="text-right tabular-nums text-slate-900">
            {completedCount}
          </dd>
        </dl>
      </section>
    </div>
  );
}
