import fs from 'node:fs';
import path from 'node:path';

let cachedDataset = null;

/**
 * Loads and caches the reference astronomical dataset.
 */
export function loadReferenceDataset() {
  if (!cachedDataset) {
    const filePath = path.resolve('packages/engine/tests/data/astro-reference-v1.json');
    cachedDataset = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return cachedDataset;
}

/**
 * Looks up a reference day record for Rajkot on the given IST date (YYYY-MM-DD).
 * @param {string} istDate
 */
export function findRajkotReferenceDay(istDate) {
  const dataset = loadReferenceDataset();
  const record = dataset.days.find((d) => d.c === 'rajkot' && d.d === istDate);
  if (!record) {
    throw new Error(`No Rajkot reference record found for IST date ${istDate}`);
  }
  return record;
}

/**
 * Converts an IST date (YYYY-MM-DD) and time (hh, mm, ss) to epoch milliseconds.
 * IST is fixed UTC+05:30 (+19800000 ms).
 * @param {string} istDate
 * @param {number} hour
 * @param {number} minute
 * @param {number} [second=0]
 */
export function istDateTimeToMs(istDate, hour, minute, second = 0) {
  const [y, m, d] = istDate.split('-').map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0);
  const istOffsetMs = 5.5 * 3600 * 1000;
  return utcMidnight - istOffsetMs + (hour * 3600 + minute * 60 + second) * 1000;
}

/**
 * Parses a displayed 12h or 24h time string (e.g. "07:21 AM", "18:05", "01:15 PM (+1)")
 * on the given IST date into epoch milliseconds.
 * @param {string} istDate
 * @param {string} timeText
 */
export function parseDisplayedTimeToMs(istDate, timeText) {
  const clean = timeText.trim();
  const isNextDay = clean.includes('(+1)');
  const m12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let hour;
  let minute;

  if (m12) {
    hour = parseInt(m12[1], 10);
    minute = parseInt(m12[2], 10);
    const period = m12[3].toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
  } else {
    const m24 = clean.match(/^(\d{1,2}):(\d{2})/);
    if (!m24) {
      throw new Error(`Cannot parse displayed time text: "${timeText}"`);
    }
    hour = parseInt(m24[1], 10);
    minute = parseInt(m24[2], 10);
  }

  let ms = istDateTimeToMs(istDate, hour, minute, 0);
  if (isNextDay) {
    ms += 86400 * 1000;
  }
  return ms;
}
