import type { Session, Units } from '../types/workout';

const LB_TO_KG = 0.453592;

/** Session left running overnight would otherwise produce an absurd figure. */
const MAX_EFFECTIVE_HOURS = 3;

/**
 * MET ramp, selected by set density (sets per minute).
 *
 * The Compendium of Physical Activities puts resistance training at 3.5 METs
 * (light/moderate effort) to 6.0 (vigorous). This ramp sits deliberately below
 * that band: the output is destined for a MyFitnessPal calorie budget, where
 * over-reporting silently grants extra food. Under-reporting is the safer
 * failure direction.
 *
 * Density is the only intensity proxy available — sets carry no timestamps,
 * only the session's start and end.
 */
const MIN_DENSITY = 0.2;
const MAX_DENSITY = 0.45;
const MIN_MET = 3.0;
const MAX_MET = 4.5;

export function metForDensity(setsPerMinute: number): number {
  if (setsPerMinute <= MIN_DENSITY) return MIN_MET;
  if (setsPerMinute >= MAX_DENSITY) return MAX_MET;
  const t = (setsPerMinute - MIN_DENSITY) / (MAX_DENSITY - MIN_DENSITY);
  return MIN_MET + t * (MAX_MET - MIN_MET);
}

/**
 * Net active energy for a completed session, or null when it can't be computed.
 *
 * Net, not gross: `MET - 1` removes resting metabolism, which the raw MET
 * figure includes. An exercise adjustment is meant to represent energy burned
 * *above* rest, so subtracting it is both correct and the smaller number.
 */
export function estimateSessionCalories(
  session: Session,
  bodyWeight: number | null | undefined,
  units: Units,
): number | null {
  if (session.status !== 'complete') return null;
  if (!session.completedAt) return null;
  if (bodyWeight == null || !Number.isFinite(bodyWeight) || bodyWeight <= 0) {
    return null;
  }
  if (session.sets.length === 0) return null;

  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.completedAt).getTime();
  const minutes = (end - start) / 60000;
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

  const hours = Math.min(minutes / 60, MAX_EFFECTIVE_HOURS);
  const met = metForDensity(session.sets.length / minutes);
  const kg = units === 'lb' ? bodyWeight * LB_TO_KG : bodyWeight;

  const kcal = Math.round((met - 1) * kg * hours);
  return kcal > 0 ? kcal : null;
}
