import { useRestTimer } from '../hooks/useRestTimer';
import { formatDuration } from '../utils/format';

export default function RestTimer() {
  const { remaining, isActive, isDone, skip } = useRestTimer();

  if (!isActive) return null;

  return (
    <button
      type="button"
      onClick={skip}
      className={`fixed inset-x-0 bottom-16 z-20 mx-auto grid max-w-md grid-cols-3 items-center gap-3 border-t px-5 py-3 text-white shadow-lg ${
        isDone
          ? 'border-emerald-300 bg-emerald-600 active:bg-emerald-700'
          : 'border-indigo-200 bg-indigo-600 active:bg-indigo-700'
      }`}
      aria-label={isDone ? 'Dismiss rest timer' : 'Skip rest timer'}
    >
      <span
        className={`text-left text-xs font-medium uppercase tracking-wide ${
          isDone ? 'text-emerald-100' : 'text-indigo-100'
        }`}
      >
        Rest
      </span>
      <span className="text-center text-2xl font-bold tabular-nums">
        {isDone ? 'Done' : formatDuration(remaining)}
      </span>
      <span
        className={`text-right text-xs font-medium uppercase tracking-wide ${
          isDone ? 'text-emerald-100' : 'text-indigo-100'
        }`}
      >
        {isDone ? 'Tap to dismiss' : 'Tap to skip'}
      </span>
    </button>
  );
}
