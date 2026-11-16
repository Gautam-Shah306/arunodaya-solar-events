import type { Ev, SnapshotV1 } from '@arunodaya/contracts';
import { MS_PER_MINUTE } from './ist.js';
import { buildOccurrenceSeries, nextOccurrence, previousOccurrence } from './occurrences.js';

/**
 * Calculates remaining whole clock minutes until the next displayed instant.
 * Changes strictly on wall-clock minute boundaries.
 * Returns 1 throughout the entire last minute before target.
 * @param nowMs Current instant in epoch milliseconds
 * @param nextDisplayMs Target event display instant (multiple of 60000)
 */
export function remainingMinutes(nowMs: number, nextDisplayMs: number): number {
  if (
    typeof nowMs !== 'number' ||
    typeof nextDisplayMs !== 'number' ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(nextDisplayMs)
  ) {
    throw new RangeError('Instants must be finite numbers');
  }

  const currentMinute = Math.floor(nowMs / MS_PER_MINUTE);
  const targetMinute = Math.floor(nextDisplayMs / MS_PER_MINUTE);

  return Math.max(0, targetMinute - currentMinute);
}

/**
 * Computes live countdown progress in [0, 1] across a displayed interval.
 * Returns 0 for degenerate intervals where next.displayMs <= previous.displayMs.
 * @param nowMs Current instant in epoch milliseconds
 * @param previous Previous occurrence
 * @param next Next occurrence
 */
export function progress(nowMs: number, previous: Ev, next: Ev): number {
  const total = next.displayMs - previous.displayMs;
  if (total <= 0) {
    return 0;
  }

  const elapsed = nowMs - previous.displayMs;
  const fraction = elapsed / total;

  if (fraction <= 0) return 0;
  if (fraction >= 1) return 1;
  return fraction;
}

export interface CountdownParts {
  readonly hours: number;
  readonly minutes: number;
}

/**
 * Decomposes countdown minutes into hours and minutes components.
 * @param minutes Whole countdown minutes
 */
export function countdownParts(minutes: number): CountdownParts {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
    throw new RangeError(
      `Countdown minutes must be non-negative finite number, got: ${String(minutes)}`,
    );
  }
  const total = Math.floor(minutes);
  const hours = Math.floor(total / 60);
  const m = total % 60;
  return { hours, minutes: m };
}

/**
 * Formats countdown minutes into "02h 48m" display pattern.
 * Hours has at least two digits (can expand above 99), minutes always two digits.
 * @param minutes Whole countdown minutes
 */
export function formatCountdown(minutes: number): string {
  const parts = countdownParts(minutes);
  const hh = String(parts.hours).padStart(2, '0');
  const mm = String(parts.minutes).padStart(2, '0');
  return `${hh}h ${mm}m`;
}

export type CountdownState =
  | {
      readonly status: 'ready';
      readonly next: Ev;
      readonly previous: Ev;
      readonly remainingMinutes: number;
      readonly progress: number;
    }
  | { readonly status: 'horizon_exhausted' }
  | { readonly status: 'horizon_before_start' };

/**
 * Evaluates live countdown state for a given chronological event series.
 * @param series Ascending series of occurrences
 * @param nowMs Current epoch instant in milliseconds
 */
export function getCountdownState(series: readonly Ev[], nowMs: number): CountdownState {
  const nextRes = nextOccurrence(nowMs, series);
  if (!nextRes.ok) {
    return { status: 'horizon_exhausted' };
  }

  const prevRes = previousOccurrence(nowMs, series);
  if (!prevRes.ok) {
    return { status: 'horizon_before_start' };
  }

  const rem = remainingMinutes(nowMs, nextRes.value.displayMs);
  const prog = progress(nowMs, prevRes.value, nextRes.value);

  return {
    status: 'ready',
    next: nextRes.value,
    previous: prevRes.value,
    remainingMinutes: rem,
    progress: prog,
  };
}

export interface CountdownTargets {
  readonly sunrise: CountdownState;
  readonly navkarshi: CountdownState;
  readonly sunset: CountdownState;
  readonly moonrise: CountdownState;
}

/**
 * Computes live countdown targets for sunrise, navkarshi, sunset, and moonrise from snapshot.
 * @param snapshot Precomputed multi-day snapshot
 * @param nowMs Current instant in epoch milliseconds
 */
export function getCountdownTargets(snapshot: SnapshotV1, nowMs: number): CountdownTargets {
  const series = buildOccurrenceSeries(snapshot);

  return {
    sunrise: getCountdownState(series.sunrise, nowMs),
    navkarshi: getCountdownState(series.navkarshi, nowMs),
    sunset: getCountdownState(series.sunset, nowMs),
    moonrise: getCountdownState(series.moonrise, nowMs),
  };
}
