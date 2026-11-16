export const IST_OFFSET_MS = 19_800_000;
export const MS_PER_DAY = 86_400_000;
export const MS_PER_HOUR = 3_600_000;

/**
 * Computes days from Unix epoch (1970-01-01) for a civil Gregorian date.
 * Pure integer arithmetic (Howard Hinnant algorithm); no Date or local time APIs.
 * @param {number} y Year
 * @param {number} m Month (1..12)
 * @param {number} d Day (1..31)
 * @returns {number}
 */
export function daysFromCivil(y, m, d) {
  let year = y;
  if (m <= 2) year -= 1;
  const era = Math.floor((year >= 0 ? year : year - 399) / 400);
  const yoe = year - era * 400;
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/**
 * Parses an ISO date string (YYYY-MM-DD) into year, month, day numbers.
 * @param {string} dateStr
 * @returns {{ year: number, month: number, day: number }}
 */
export function parseCivilDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid civil date string: ${dateStr}`);
  }
  const [yStr, mStr, dStr] = parts;
  if (yStr === undefined || mStr === undefined || dStr === undefined) {
    throw new Error(`Invalid civil date string: ${dateStr}`);
  }
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error(`Invalid civil date values: ${dateStr}`);
  }
  return { year, month, day };
}

/**
 * Returns UTC epoch milliseconds for 00:00:00 IST of the given civil date.
 * @param {string} istDate YYYY-MM-DD
 * @returns {number}
 */
export function istDayStartMs(istDate) {
  const { year, month, day } = parseCivilDate(istDate);
  const days = daysFromCivil(year, month, day);
  return days * MS_PER_DAY - IST_OFFSET_MS;
}

/**
 * Returns UTC epoch milliseconds for 24:00:00 IST (next 00:00:00 IST) of the given civil date.
 * @param {string} istDate YYYY-MM-DD
 * @returns {number}
 */
export function istDayEndMs(istDate) {
  return istDayStartMs(istDate) + MS_PER_DAY;
}

/**
 * Returns UTC epoch milliseconds for 12:00:00 IST (civil noon) of the given civil date.
 * @param {string} istDate YYYY-MM-DD
 * @returns {number}
 */
export function istNoonMs(istDate) {
  return istDayStartMs(istDate) + 12 * MS_PER_HOUR;
}
