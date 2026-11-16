import {
  err,
  ok,
  type Ev,
  type Result,
  type SnapshotV1,
  type DayRecord,
} from '@arunodaya/contracts';

export type Occurrence = Ev;

/**
 * Checks whether an Ev series is sorted ascending by displayMs.
 * @param series Array of Ev occurrences
 */
export function isAscending(series: readonly Ev[]): boolean {
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const curr = series[i];
    if (prev && curr && curr.displayMs < prev.displayMs) {
      return false;
    }
  }
  return true;
}

/**
 * Finds the next occurrence strictly after nowMs (displayMs > nowMs).
 * @param nowMs Current instant in epoch milliseconds
 * @param series Ascending series of occurrences
 */
export function nextOccurrence(
  nowMs: number,
  series: readonly Ev[],
): Result<Ev, 'horizon_exhausted'> {
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs) || !Number.isInteger(nowMs)) {
    throw new RangeError(`nowMs must be a finite integer, got: ${String(nowMs)}`);
  }

  for (const item of series) {
    if (item.displayMs > nowMs) {
      return ok(item);
    }
  }

  return err('horizon_exhausted');
}

/**
 * Finds the previous occurrence at or before nowMs (displayMs <= nowMs).
 * @param nowMs Current instant in epoch milliseconds
 * @param series Ascending series of occurrences
 */
export function previousOccurrence(
  nowMs: number,
  series: readonly Ev[],
): Result<Ev, 'horizon_before_start'> {
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs) || !Number.isInteger(nowMs)) {
    throw new RangeError(`nowMs must be a finite integer, got: ${String(nowMs)}`);
  }

  for (let i = series.length - 1; i >= 0; i--) {
    const item = series[i];
    if (item && item.displayMs <= nowMs) {
      return ok(item);
    }
  }

  return err('horizon_before_start');
}

export interface OccurrenceSeries {
  readonly sunrise: Ev[];
  readonly navkarshi: Ev[];
  readonly sunset: Ev[];
  readonly moonrise: Ev[];
}

/**
 * Extracts chronological occurrence series from a snapshot.
 * Moonrise extracts events with kind 'rise' from moonEvents.
 * @param snapshot Precomputed snapshot
 */
export function buildOccurrenceSeries(snapshot: SnapshotV1): OccurrenceSeries {
  const sunrise: Ev[] = [];
  const navkarshi: Ev[] = [];
  const sunset: Ev[] = [];
  const moonrise: Ev[] = [];

  for (const day of snapshot.days) {
    sunrise.push(day.sunrise);
    navkarshi.push(day.navkarshi);
    sunset.push(day.sunset);
  }

  for (const m of snapshot.moonEvents) {
    if (m.kind === 'rise') {
      moonrise.push(m.ev);
    }
  }

  return {
    sunrise,
    navkarshi,
    sunset,
    moonrise,
  };
}

/**
 * Finds the day record corresponding to an IST date (YYYY-MM-DD).
 * @param snapshot Precomputed snapshot
 * @param istDate Date string in YYYY-MM-DD format
 */
export function findDay(snapshot: SnapshotV1, istDate: string): DayRecord | undefined {
  return snapshot.days.find((d) => d.istDate === istDate);
}
