import {
  type DayRecord,
  type MoonEvent,
  type Result,
  type SnapshotLocation,
  type SnapshotV1,
  type ValidationIssue,
  err,
  ok,
  validateSnapshot,
} from '@arunodaya/contracts';
import type { Clock } from '../clock.js';
import { ASTRONOMY_ENGINE, SNAPSHOT_POLICY } from '../config.js';
import { addIstDays, isSupportedIstDate, istParts, parseIstDate } from '../time/ist.js';
import { makeEvent } from '../time/rounding.js';
import { computeAstroDay } from './astro-day.js';
import { toDayRecord } from './day-record.js';
import type { AstroError, Observer } from './types.js';

/**
 * Union error type returned when snapshot construction fails.
 */
export type SnapshotBuildError =
  | AstroError
  | {
      code: 'invalid_snapshot';
      issues: readonly ValidationIssue[];
    };

/**
 * Input parameters for building a snapshot.
 */
export interface BuildSnapshotOptions {
  location: SnapshotLocation;
  startIstDate: string;
  dayCount: number;
  generatedAtMs: number;
}

/**
 * Computes the recommended snapshot calendar date window around an epoch instant.
 * Starts `SNAPSHOT_POLICY.daysBehind` before today's IST date and spans
 * `daysBehind + 1 + daysAhead` (default 92 days).
 *
 * @param nowMs Current epoch milliseconds
 * @returns Object with startIstDate and dayCount
 */
export function planSnapshotWindow(nowMs: number): {
  startIstDate: string;
  dayCount: number;
} {
  const parts = istParts(nowMs);
  const startIstDate = addIstDays(parts.istDate, -SNAPSHOT_POLICY.daysBehind);
  const dayCount = SNAPSHOT_POLICY.daysBehind + 1 + SNAPSHOT_POLICY.daysAhead;
  return { startIstDate, dayCount };
}

/**
 * Constructs a fully validated multi-day astronomical snapshot payload.
 * Pure and synchronous. Invariant-compliant: uses injected parameters, never system clock.
 *
 * @param options Snapshot creation options
 * @returns Result with validated SnapshotV1 or SnapshotBuildError
 */
export function buildSnapshot(
  options: BuildSnapshotOptions,
): Result<SnapshotV1, SnapshotBuildError> {
  const { location, startIstDate, dayCount, generatedAtMs } = options;

  // 1. Validate dayCount
  if (
    typeof dayCount !== 'number' ||
    !Number.isFinite(dayCount) ||
    !Number.isInteger(dayCount) ||
    dayCount < 1 ||
    dayCount > 400
  ) {
    return err({
      code: 'invalid_input',
      message: `dayCount must be an integer between 1 and 400, got: ${String(dayCount)}`,
    });
  }

  // 2. Validate startIstDate
  const parsedStart = parseIstDate(startIstDate);
  if (!parsedStart.ok || !isSupportedIstDate(startIstDate)) {
    return err({
      code: 'invalid_date',
      istDate: startIstDate,
      message: `Invalid or unsupported start date: ${startIstDate}`,
    });
  }

  // 3. Validate location basic coordinates
  if (
    typeof location.lat !== 'number' ||
    !Number.isFinite(location.lat) ||
    location.lat < -90 ||
    location.lat > 90 ||
    typeof location.lon !== 'number' ||
    !Number.isFinite(location.lon) ||
    location.lon < -180 ||
    location.lon > 180
  ) {
    return err({
      code: 'invalid_observer',
      message: `Invalid location coordinates: lat=${String(location.lat)}, lon=${String(location.lon)}`,
    });
  }

  // 4. Validate generatedAtMs
  if (
    typeof generatedAtMs !== 'number' ||
    !Number.isFinite(generatedAtMs) ||
    !Number.isInteger(generatedAtMs)
  ) {
    return err({
      code: 'invalid_input',
      message: `generatedAtMs must be an integer, got: ${String(generatedAtMs)}`,
    });
  }

  const observer: Observer = {
    lat: location.lat,
    lon: location.lon,
    elevationM: location.elevationM,
  };

  const totalDays = dayCount + SNAPSHOT_POLICY.moonLookaheadDays;
  const days: DayRecord[] = [];
  const moonEvents: MoonEvent[] = [];

  for (let i = 0; i < totalDays; i++) {
    const curDate = addIstDays(startIstDate, i);
    const astroRes = computeAstroDay(observer, curDate);
    if (!astroRes.ok) {
      return astroRes;
    }
    const astroDay = astroRes.value;

    if (i < dayCount) {
      days.push(toDayRecord(astroDay));
    }

    for (const riseMs of astroDay.moonrise) {
      moonEvents.push({
        kind: 'rise',
        ev: makeEvent('start', riseMs),
      });
    }
    for (const setMs of astroDay.moonset) {
      moonEvents.push({
        kind: 'set',
        ev: makeEvent('end', setMs),
      });
    }
  }

  moonEvents.sort((a, b) => a.ev.displayMs - b.ev.displayMs || a.ev.exactMs - b.ev.exactMs);

  const candidate: SnapshotV1 = {
    schemaVersion: 1,
    generatedAtMs,
    engine: {
      name: ASTRONOMY_ENGINE.name,
      version: ASTRONOMY_ENGINE.version,
    },
    location,
    days,
    moonEvents,
  };

  const validation = validateSnapshot(candidate);
  if (!validation.ok) {
    return err({
      code: 'invalid_snapshot',
      issues: validation.error,
    });
  }

  return ok(validation.value);
}

/**
 * Builds a standard multi-day snapshot anchored at the current clock instant.
 * Uses `planSnapshotWindow` with `clock.nowMs()`.
 *
 * @param clock Time source implementing Clock
 * @param location Geographic location metadata
 * @returns Result with validated SnapshotV1 or SnapshotBuildError
 */
export function buildSnapshotAround(
  clock: Clock,
  location: SnapshotLocation,
): Result<SnapshotV1, SnapshotBuildError> {
  const nowMs = clock.nowMs();
  const { startIstDate, dayCount } = planSnapshotWindow(nowMs);
  return buildSnapshot({
    location,
    startIstDate,
    dayCount,
    generatedAtMs: nowMs,
  });
}
