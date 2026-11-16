import { err, ok, type Result } from './result.js';

/**
 * Parts of a Gregorian civil date.
 */
export interface CivilDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/**
 * Checks whether a Gregorian year is a leap year.
 * @param year Integer year
 */
export function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year)) return false;
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the number of days in a given Gregorian month (1 = Jan, 12 = Dec).
 * @param year Integer year
 * @param month Integer month (1 to 12)
 */
export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return 0;
  }
  switch (month) {
    case 1: // January
    case 3: // March
    case 5: // May
    case 7: // July
    case 8: // August
    case 10: // October
    case 12: // December
      return 31;
    case 4: // April
    case 6: // June
    case 9: // September
    case 11: // November
      return 30;
    case 2: // February
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

/**
 * Validates whether year, month, and day form a valid calendar date in years 1 to 9999.
 * @param year Integer year (1..9999)
 * @param month Integer month (1..12)
 * @param day Integer day (1..daysInMonth)
 */
export function isValidCivilDate(year: number, month: number, day: number): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false;
  }
  return day <= daysInMonth(year, month);
}

/**
 * Computes days elapsed since the Unix epoch (1970-01-01) for a valid Gregorian civil date.
 * Uses Howard Hinnant's pure integer civil date algorithm.
 * @param year Integer year
 * @param month Integer month (1..12)
 * @param day Integer day (1..31)
 */
export function daysFromCivil(year: number, month: number, day: number): number {
  let y = year;
  const m = month;
  const d = day;
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor((y >= 0 ? y : y - 399) / 400);
  const yoe = y - era * 400; // [0, 399]
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1; // [0, 365]
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; // [0, 146096]
  return era * 146097 + doe - 719468;
}

/**
 * Computes Gregorian civil date parts from days elapsed since 1970-01-01.
 * Uses Howard Hinnant's pure integer algorithm.
 * @param days Integer days since 1970-01-01
 */
export function civilFromDays(days: number): CivilDateParts {
  const z = days + 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097; // [0, 146096]
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  ); // [0, 399]
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
  const mp = Math.floor((5 * doy + 2) / 153); // [0, 11]
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1; // [1, 31]
  const m = mp < 10 ? mp + 3 : mp - 9; // [1, 12]
  return {
    year: y + (m <= 2 ? 1 : 0),
    month: m,
    day: d,
  };
}

/**
 * Returns weekday index (0 = Sunday to 6 = Saturday) for days elapsed since 1970-01-01.
 * (1970-01-01 was a Thursday = 4).
 * @param days Integer days since 1970-01-01
 */
export function weekdayFromDays(days: number): number {
  return (((days + 4) % 7) + 7) % 7;
}

/**
 * Parses an ISO 8601 calendar date string (YYYY-MM-DD) into integer parts.
 * Supported years: 1 to 9999.
 * @param str Date string in YYYY-MM-DD format
 * @returns Result with CivilDateParts on success, or 'format' | 'calendar' error
 */
export function parseCivilDate(str: string): Result<CivilDateParts, 'format' | 'calendar'> {
  if (typeof str !== 'string') {
    return err('format');
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
    return err('format');
  }
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (year < 1 || year > 9999 || !isValidCivilDate(year, month, day)) {
    return err('calendar');
  }

  return ok({ year, month, day });
}

/**
 * Formats civil date parts as a YYYY-MM-DD string.
 * @param parts Date parts { year, month, day }
 */
export function formatCivilDate(parts: CivilDateParts): string {
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds an integer number of days to an ISO civil date string (YYYY-MM-DD).
 * @param isoString Initial date in YYYY-MM-DD format
 * @param n Integer days to add (can be negative)
 */
export function addDaysToCivilDate(isoString: string, n: number): string {
  const parsed = parseCivilDate(isoString);
  if (!parsed.ok) {
    throw new RangeError(`Invalid civil date string: ${isoString}`);
  }
  const days = daysFromCivil(parsed.value.year, parsed.value.month, parsed.value.day);
  const newParts = civilFromDays(days + n);
  return formatCivilDate(newParts);
}
