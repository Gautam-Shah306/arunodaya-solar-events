import {
  addDaysToCivilDate,
  civilFromDays,
  daysFromCivil,
  formatCivilDate,
  parseCivilDate,
  weekdayFromDays,
  type CivilDateParts,
  type Result,
  ok,
  err,
} from '@arunodaya/contracts';
import { SUPPORTED_YEARS } from '../config.js';

/**
 * Fixed Indian Standard Time offset ahead of UTC in milliseconds (+05:30 = 19,800,000 ms).
 */
export const IST_OFFSET_MS = 19_800_000 as const;

export const MS_PER_MINUTE = 60_000 as const;
export const MS_PER_HOUR = 3_600_000 as const;
export const MS_PER_DAY = 86_400_000 as const;

/**
 * Decomposed Indian Standard Time parts.
 */
export interface IstParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
  readonly weekday: number;
  readonly minuteOfDay: number;
  readonly istDate: string;
}

/**
 * Decomposes an epoch millisecond instant into Indian Standard Time (+05:30) components.
 * Pure integer arithmetic, zero runtime Date allocations.
 * Supports negative epoch values. Rejects NaN, non-finite, and fractional instants with RangeError.
 * @param epochMs Integer epoch milliseconds
 */
export function istParts(epochMs: number): IstParts {
  if (typeof epochMs !== 'number' || !Number.isFinite(epochMs) || !Number.isInteger(epochMs)) {
    throw new RangeError(`Instant must be a finite integer, got: ${String(epochMs)}`);
  }

  const istMs = epochMs + IST_OFFSET_MS;
  const epochDays = Math.floor(istMs / MS_PER_DAY);
  const dayMs = istMs - epochDays * MS_PER_DAY;

  const millisecond = dayMs % 1000;
  const totalSeconds = Math.floor(dayMs / 1000);
  const second = totalSeconds % 60;
  const minuteOfDay = Math.floor(totalSeconds / 60);
  const minute = minuteOfDay % 60;
  const hour = Math.floor(minuteOfDay / 60);

  const civil = civilFromDays(epochDays);
  const weekday = weekdayFromDays(epochDays);
  const istDate = formatCivilDate(civil);

  return {
    year: civil.year,
    month: civil.month,
    day: civil.day,
    hour,
    minute,
    second,
    millisecond,
    weekday,
    minuteOfDay,
    istDate,
  };
}

/**
 * Parses an ISO 8601 IST calendar date string (YYYY-MM-DD).
 * @param str Date string in YYYY-MM-DD format
 */
export function parseIstDate(str: string): Result<CivilDateParts, 'format' | 'calendar'> {
  return parseCivilDate(str);
}

/**
 * Returns the epoch milliseconds of the start of the IST day (00:00:00.000 IST) for an instant.
 * @param epochMs Instant in epoch milliseconds
 */
export function istDayStartMs(epochMs: number): number {
  if (typeof epochMs !== 'number' || !Number.isFinite(epochMs) || !Number.isInteger(epochMs)) {
    throw new RangeError(`Instant must be a finite integer, got: ${String(epochMs)}`);
  }
  const epochDays = Math.floor((epochMs + IST_OFFSET_MS) / MS_PER_DAY);
  return epochDays * MS_PER_DAY - IST_OFFSET_MS;
}

/**
 * Converts an IST date string (YYYY-MM-DD) to its start-of-day epoch instant (00:00:00.000 IST).
 * @param istDate Date string
 */
export function istDateToStartMs(istDate: string): Result<number, 'format' | 'calendar'> {
  const parsed = parseCivilDate(istDate);
  if (!parsed.ok) {
    return err(parsed.error);
  }
  const days = daysFromCivil(parsed.value.year, parsed.value.month, parsed.value.day);
  return ok(days * MS_PER_DAY - IST_OFFSET_MS);
}

/**
 * Adds integer days to an IST date string (YYYY-MM-DD).
 * @param istDate Date string
 * @param n Days to add
 */
export function addIstDays(istDate: string, n: number): string {
  return addDaysToCivilDate(istDate, n);
}

/**
 * Returns the epoch minute index (floor of epoch minutes).
 * Since 19_800_000 ms is an exact multiple of 60_000 ms, epoch minutes and IST minutes coincide.
 * @param epochMs Instant in epoch milliseconds
 */
export function istMinuteIndex(epochMs: number): number {
  if (typeof epochMs !== 'number' || !Number.isFinite(epochMs) || !Number.isInteger(epochMs)) {
    throw new RangeError(`Instant must be a finite integer, got: ${String(epochMs)}`);
  }
  return Math.floor(epochMs / MS_PER_MINUTE);
}

/**
 * Formats an epoch millisecond instant into an IST clock string.
 * @param epochMs Instant in epoch milliseconds
 * @param mode '24h' for HH:mm or '12h' for h:mm AM/PM (12:00 AM at midnight, 12:00 PM at noon, no leading zero on hour)
 */
export function formatIstClock(epochMs: number, mode: '24h' | '12h'): string {
  const parts = istParts(epochMs);
  const mm = String(parts.minute).padStart(2, '0');

  if (mode === '24h') {
    const hh = String(parts.hour).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // 12-hour mode
  const period = parts.hour >= 12 ? 'PM' : 'AM';
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  return `${String(hour12)}:${mm} ${period}`;
}

/**
 * Validates whether an IST date falls within the supported calendar years (2000 to 2100 inclusive).
 * @param istDate Date string in YYYY-MM-DD format
 */
export function isSupportedIstDate(istDate: string): boolean {
  const parsed = parseCivilDate(istDate);
  if (!parsed.ok) return false;
  return parsed.value.year >= SUPPORTED_YEARS.first && parsed.value.year <= SUPPORTED_YEARS.last;
}
