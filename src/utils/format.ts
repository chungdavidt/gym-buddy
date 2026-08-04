import type { SessionSet } from '../types/workout';

export function formatRepRange(range: readonly [number, number]): string {
  const [low, high] = range;
  return low === high ? `${low} reps` : `${low}-${high} reps`;
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatSessionDate(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const a = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Round to absorb DST hour shifts (23h or 25h days).
  const days = Math.round((b - a) / MS_PER_DAY);

  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days <= 6) return `${days} days ago`;
  return then.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatSessionDuration(
  startedAt: string,
  completedAt: string | null,
): string {
  if (!completedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const minutes = Math.floor(Math.max(0, end - start) / 60000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** `~` marks it as an estimate, matching the `~155 lb` 1RM label on charts. */
export function formatCalories(kcal: number): string {
  return `~${kcal} kcal`;
}

export function setHitTarget(set: SessionSet): boolean {
  return (
    set.actual.reps >= set.target.reps && set.actual.weight === set.target.weight
  );
}
