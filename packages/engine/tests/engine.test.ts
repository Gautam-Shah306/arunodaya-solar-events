import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  ENGINE_API_VERSION,
  PACKAGE_NAME,
  addIstDays,
  buildOccurrenceSeries,
  countdownParts,
  createFixedClock,
  createManualClock,
  dayNight,
  daylightMinutes,
  displayRound,
  findDay,
  formatCountdown,
  formatIstClock,
  getCountdownTargets,
  getSnapshotStatus,
  isAscending,
  isSupportedIstDate,
  istDateToStartMs,
  istDayStartMs,
  istMinuteIndex,
  istParts,
  makeEvent,
  makeNavkarshi,
  nextOccurrence,
  parseIstDate,
  previousOccurrence,
  progress,
  remainingMinutes,
  selectGreeting,
  IST_OFFSET_MS,
  MS_PER_DAY,
} from '../src/index.js';
import { makeSnapshotFixture } from './fixtures.js';

describe('Engine time core', () => {
  it('engine exposes its package name and API version', () => {
    expect(PACKAGE_NAME).toBe('@arunodaya/engine');
    expect(ENGINE_API_VERSION).toBe(1);
  });

  // ==========================================
  // IST helper tests
  // ==========================================

  it('IST offset is exactly 19800000 milliseconds', () => {
    expect(IST_OFFSET_MS).toBe(19_800_000);
    // 5.5 hours = 5 * 3600000 + 30 * 60000 = 19800000
    expect(5 * 3_600_000 + 30 * 60_000).toBe(19_800_000);
  });

  it('istParts converts the Unix epoch to 05:30 on 1970-01-01', () => {
    const parts = istParts(0);
    expect(parts.year).toBe(1970);
    expect(parts.month).toBe(1);
    expect(parts.day).toBe(1);
    expect(parts.hour).toBe(5);
    expect(parts.minute).toBe(30);
    expect(parts.second).toBe(0);
    expect(parts.millisecond).toBe(0);
    expect(parts.istDate).toBe('1970-01-01');
    expect(parts.minuteOfDay).toBe(5 * 60 + 30);
  });

  it('istParts converts 2026-11-15T18:29:59.999Z to 23:59:59 on 15 November', () => {
    // 2026-11-15 is 20772 days from 1970-01-01
    // 18:29:59.999 UTC + 5:30 = 23:59:59.999 IST
    const epochMs = 1794767399999;
    const parts = istParts(epochMs);
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(11);
    expect(parts.day).toBe(15);
    expect(parts.hour).toBe(23);
    expect(parts.minute).toBe(59);
    expect(parts.second).toBe(59);
    expect(parts.millisecond).toBe(999);
    expect(parts.istDate).toBe('2026-11-15');
  });

  it('istParts rolls to the next IST day at 18:30 UTC', () => {
    // 18:30:00.000 UTC on 2026-11-15 = 00:00:00.000 IST on 2026-11-16
    const epochMs = 1794767400000;
    const parts = istParts(epochMs);
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(11);
    expect(parts.day).toBe(16);
    expect(parts.hour).toBe(0);
    expect(parts.minute).toBe(0);
    expect(parts.second).toBe(0);
    expect(parts.millisecond).toBe(0);
    expect(parts.istDate).toBe('2026-11-16');
  });

  it('istParts handles the leap day 2028-02-29', () => {
    const dayStartRes = istDateToStartMs('2028-02-29');
    expect(dayStartRes.ok).toBe(true);
    if (dayStartRes.ok) {
      const parts = istParts(dayStartRes.value + 12 * 3600 * 1000);
      expect(parts.year).toBe(2028);
      expect(parts.month).toBe(2);
      expect(parts.day).toBe(29);
      expect(parts.hour).toBe(12);
      expect(parts.istDate).toBe('2028-02-29');
    }
  });

  it('istParts treats 2100 as a common year', () => {
    // 2100 is not a leap year. 2100-03-01 minus 1ms is 2100-02-28 23:59:59.999
    const mar1Res = istDateToStartMs('2100-03-01');
    expect(mar1Res.ok).toBe(true);
    if (mar1Res.ok) {
      const prev = istParts(mar1Res.value - 1);
      expect(prev.year).toBe(2100);
      expect(prev.month).toBe(2);
      expect(prev.day).toBe(28);
      expect(prev.istDate).toBe('2100-02-28');
    }
  });

  it('istParts treats 2000 as a leap year', () => {
    // 2000 is a 400-year leap year. 2000-03-01 minus 1ms is 2000-02-29 23:59:59.999
    const mar1Res = istDateToStartMs('2000-03-01');
    expect(mar1Res.ok).toBe(true);
    if (mar1Res.ok) {
      const prev = istParts(mar1Res.value - 1);
      expect(prev.year).toBe(2000);
      expect(prev.month).toBe(2);
      expect(prev.day).toBe(29);
      expect(prev.istDate).toBe('2000-02-29');
    }
  });

  it('istParts returns weekday 0 for Sunday 2026-11-15', () => {
    const dayStartRes = istDateToStartMs('2026-11-15');
    expect(dayStartRes.ok).toBe(true);
    if (dayStartRes.ok) {
      const parts = istParts(dayStartRes.value);
      expect(parts.weekday).toBe(0); // 0 = Sunday
    }
  });

  it('istParts handles instants before 1970', () => {
    // -86,400,000 is 1969-12-31 00:00:00 UTC = 1969-12-31 05:30:00 IST
    const parts = istParts(-86_400_000);
    expect(parts.year).toBe(1969);
    expect(parts.month).toBe(12);
    expect(parts.day).toBe(31);
    expect(parts.hour).toBe(5);
    expect(parts.minute).toBe(30);
    expect(parts.istDate).toBe('1969-12-31');
  });

  it('istParts rejects NaN and fractional instants with RangeError', () => {
    expect(() => istParts(NaN)).toThrow(RangeError);
    expect(() => istParts(1234.56)).toThrow(RangeError);
    expect(() => istParts(Infinity)).toThrow(RangeError);
    expect(() => istParts(-Infinity)).toThrow(RangeError);
    expect(() => istParts('1234' as unknown as number)).toThrow(RangeError);
    expect(() => istDayStartMs(NaN)).toThrow(RangeError);
    expect(() => istDayStartMs(1234.5)).toThrow(RangeError);
    expect(() => istMinuteIndex(NaN)).toThrow(RangeError);
    expect(() => istMinuteIndex(1234.5)).toThrow(RangeError);
    expect(istDateToStartMs('invalid-date').ok).toBe(false);
  });

  it('istDateToStartMs and istParts round-trip for every day of 2028', () => {
    for (let i = 0; i < 366; i++) {
      const dateStr = addIstDays('2028-01-01', i);
      const startMsRes = istDateToStartMs(dateStr);
      expect(startMsRes.ok).toBe(true);
      if (startMsRes.ok) {
        const parts = istParts(startMsRes.value);
        expect(parts.istDate).toBe(dateStr);
        expect(parts.hour).toBe(0);
        expect(parts.minute).toBe(0);
        expect(parts.second).toBe(0);
        expect(parts.millisecond).toBe(0);
      }
    }
  });

  it('parseIstDate rejects 2026-13-01 and 2026-02-30', () => {
    expect(parseIstDate('2026-13-01').ok).toBe(false);
    expect(parseIstDate('2026-02-30').ok).toBe(false);
    expect(parseIstDate('2026-11-15').ok).toBe(true);
  });

  it('addIstDays crosses month and year boundaries', () => {
    expect(addIstDays('2026-01-30', 2)).toBe('2026-02-01');
    expect(addIstDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addIstDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('istMinuteIndex equals the floor of epoch minutes', () => {
    expect(istMinuteIndex(0)).toBe(0);
    expect(istMinuteIndex(59_999)).toBe(0);
    expect(istMinuteIndex(60_000)).toBe(1);
    expect(istMinuteIndex(125_000)).toBe(2);
    expect(istMinuteIndex(-1)).toBe(-1);
    expect(istMinuteIndex(-60_000)).toBe(-1);
    expect(istMinuteIndex(-60_001)).toBe(-2);
  });

  it('formatIstClock formats 24-hour time as HH:mm', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    expect(formatIstClock(dayStart + (4 * 3600 + 5 * 60) * 1000, '24h')).toBe('04:05');
    expect(formatIstClock(dayStart + (17 * 3600 + 30 * 60) * 1000, '24h')).toBe('17:30');
    expect(formatIstClock(dayStart, '24h')).toBe('00:00');
  });

  it('formatIstClock formats noon and midnight in 12-hour mode', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    expect(formatIstClock(dayStart, '12h')).toBe('12:00 AM');
    expect(formatIstClock(dayStart + 12 * 3600 * 1000, '12h')).toBe('12:00 PM');
  });

  it('formatIstClock formats 06:05 and 18:05 in 12-hour mode', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    expect(formatIstClock(dayStart + (6 * 3600 + 5 * 60) * 1000, '12h')).toBe('6:05 AM');
    expect(formatIstClock(dayStart + (18 * 3600 + 5 * 60) * 1000, '12h')).toBe('6:05 PM');
  });

  it('isSupportedIstDate accepts 2000-01-01 and 2100-12-31 and rejects 1999-12-31 and 2101-01-01', () => {
    expect(isSupportedIstDate('2000-01-01')).toBe(true);
    expect(isSupportedIstDate('2100-12-31')).toBe(true);
    expect(isSupportedIstDate('1999-12-31')).toBe(false);
    expect(isSupportedIstDate('2101-01-01')).toBe(false);
  });

  it('IST helper results do not depend on the process timezone', () => {
    const testInstant = 1763184000000;
    const partsA = istParts(testInstant);
    const clockA = formatIstClock(testInstant, '24h');

    // Simulate different TZ env in-process if global process is available
    const proc = (
      globalThis as unknown as { process?: { env: Record<string, string | undefined> } }
    ).process;
    if (proc) {
      const origTz = proc.env['TZ'];
      try {
        proc.env['TZ'] = 'America/New_York';
        const partsB = istParts(testInstant);
        const clockB = formatIstClock(testInstant, '24h');
        expect(partsB).toEqual(partsA);
        expect(clockB).toBe(clockA);
      } finally {
        proc.env['TZ'] = origTz;
      }
    }
  });

  // ==========================================
  // Rounding tests
  // ==========================================

  it('displayRound start ceils to the next whole minute', () => {
    expect(displayRound('start', 60001)).toBe(120000);
    expect(displayRound('start', 60000 * 10 + 1)).toBe(60000 * 11);
    expect(displayRound('start', 60000 * 10 + 59999)).toBe(60000 * 11);
  });

  it('displayRound start keeps an exact minute unchanged', () => {
    expect(displayRound('start', 60000 * 5)).toBe(60000 * 5);
    expect(displayRound('start', 0)).toBe(0);
  });

  it('displayRound end floors to the previous whole minute', () => {
    expect(displayRound('end', 60001)).toBe(60000);
    expect(displayRound('end', 60000 * 10 + 59999)).toBe(60000 * 10);
  });

  it('displayRound end keeps an exact minute unchanged', () => {
    expect(displayRound('end', 60000 * 5)).toBe(60000 * 5);
    expect(displayRound('end', 0)).toBe(0);
  });

  it('displayRound nearest rounds half up', () => {
    expect(displayRound('nearest', 60000 + 29999)).toBe(60000);
    expect(displayRound('nearest', 60000 + 30000)).toBe(120000); // 30s rounds up
    expect(displayRound('nearest', 60000 + 30001)).toBe(120000);
    expect(displayRound('nearest', 60000)).toBe(60000);
  });

  it('makeEvent builds exact and displayed instants for a start event', () => {
    const ev = makeEvent('start', 60001);
    expect(ev.exactMs).toBe(60001);
    expect(ev.displayMs).toBe(120000);
  });

  it('makeEvent builds exact and displayed instants for an end event', () => {
    const ev = makeEvent('end', 60001);
    expect(ev.exactMs).toBe(60001);
    expect(ev.displayMs).toBe(60000);
  });

  it('navkarshi is exact sunrise plus 48 minutes then ceiled', () => {
    // 06:48:20 -> exact sunrise 24500000 ms
    const sunriseExact = 24500000;
    const nav = makeNavkarshi(sunriseExact);
    expect(nav.exactMs).toBe(sunriseExact + 48 * 60000);
    expect(nav.displayMs).toBe(Math.ceil((sunriseExact + 48 * 60000) / 60000) * 60000);
  });

  it('PROPERTY displayed navkarshi minus displayed sunrise is exactly 48 minutes', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000_000, max: 2_000_000_000 }), (sunriseExact) => {
        const sunrise = makeEvent('start', sunriseExact);
        const navkarshi = makeNavkarshi(sunriseExact);
        expect(navkarshi.displayMs - sunrise.displayMs).toBe(48 * 60_000);
      }),
      { numRuns: 1000 },
    );
  });

  it('PROPERTY ceiling sunrise then adding 48 minutes equals adding 48 minutes then ceiling', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000_000, max: 2_000_000_000 }), (sunriseExact) => {
        const ceilThenAdd = displayRound('start', sunriseExact) + 48 * 60_000;
        const addThenCeil = displayRound('start', sunriseExact + 48 * 60_000);
        expect(ceilThenAdd).toBe(addThenCeil);
      }),
      { numRuns: 1000 },
    );
  });

  it('PROPERTY start events never display earlier than exact and end events never display later', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000_000, max: 2_000_000_000 }), (exactMs) => {
        const start = makeEvent('start', exactMs);
        expect(start.displayMs).toBeGreaterThanOrEqual(exactMs);
        const end = makeEvent('end', exactMs);
        expect(end.displayMs).toBeLessThanOrEqual(exactMs);
      }),
      { numRuns: 1000 },
    );
  });

  it('daylight duration is computed from displayed sunrise and sunset', () => {
    const sunriseDisplay = 6 * 3600 * 1000; // 06:00
    const sunsetDisplay = 18 * 3600 * 1000 + 30 * 60 * 1000; // 18:30
    expect(daylightMinutes(sunriseDisplay, sunsetDisplay)).toBe(750); // 12h 30m = 750 min
  });

  it('daylight duration is zero when displayed sunset is not after displayed sunrise', () => {
    expect(daylightMinutes(60000 * 500, 60000 * 500)).toBe(0);
    expect(daylightMinutes(60000 * 600, 60000 * 500)).toBe(0);
    expect(() => daylightMinutes(NaN, 100)).toThrow(RangeError);
  });

  // ==========================================
  // Occurrences and countdown tests
  // ==========================================

  it('nextOccurrence returns the first occurrence strictly after now', () => {
    const series = [
      { exactMs: 59000, displayMs: 60000 },
      { exactMs: 119000, displayMs: 120000 },
      { exactMs: 179000, displayMs: 180000 },
    ];
    const res = nextOccurrence(59999, series);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.displayMs).toBe(60000);
    }
  });

  it('nextOccurrence skips an occurrence exactly at now', () => {
    const series = [
      { exactMs: 59000, displayMs: 60000 },
      { exactMs: 119000, displayMs: 120000 },
    ];
    const res = nextOccurrence(60000, series);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.displayMs).toBe(120000);
    }
  });

  it('previousOccurrence returns the last occurrence at or before now', () => {
    const series = [
      { exactMs: 59000, displayMs: 60000 },
      { exactMs: 119000, displayMs: 120000 },
    ];
    const res = previousOccurrence(60000, series);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.displayMs).toBe(60000);
    }
  });

  it('nextOccurrence reports horizon_exhausted after the last occurrence', () => {
    const series = [{ exactMs: 59000, displayMs: 60000 }];
    const res = nextOccurrence(60000, series);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('horizon_exhausted');
    }
    expect(() => nextOccurrence(NaN, series)).toThrow(RangeError);
  });

  it('previousOccurrence reports horizon_before_start before the first occurrence', () => {
    const series = [{ exactMs: 59000, displayMs: 60000 }];
    const res = previousOccurrence(59999, series);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('horizon_before_start');
    }
    expect(() => previousOccurrence(NaN, series)).toThrow(RangeError);
  });

  it('remainingMinutes counts whole IST clock minutes', () => {
    expect(remainingMinutes(0, 120000)).toBe(2);
    expect(remainingMinutes(30000, 120000)).toBe(2);
    expect(remainingMinutes(60000, 120000)).toBe(1);
    expect(() => remainingMinutes(NaN, 100)).toThrow(RangeError);
  });

  it('remainingMinutes is 1 throughout the last minute and the target rolls at the displayed instant', () => {
    const target = 120000; // 00:02:00.000
    // Throughout the entire 00:01:XX minute, remaining is 1
    expect(remainingMinutes(60000, target)).toBe(1);
    expect(remainingMinutes(90000, target)).toBe(1);
    expect(remainingMinutes(119999, target)).toBe(1);
    // At the exact displayed instant 00:02:00, remaining is 0
    expect(remainingMinutes(120000, target)).toBe(0);
  });

  it('remainingMinutes changes exactly on the wall clock minute', () => {
    const target = 180000;
    expect(remainingMinutes(59999, target)).toBe(3);
    expect(remainingMinutes(60000, target)).toBe(2);
    expect(remainingMinutes(119999, target)).toBe(2);
    expect(remainingMinutes(120000, target)).toBe(1);
  });

  it('PROPERTY a countdown never reaches zero before the displayed minute', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }).map((m) => m * 60_000),
        fc.integer({ min: 1, max: 59_999 }),
        (targetMs, offsetBefore) => {
          const nowMs = targetMs - offsetBefore;
          expect(remainingMinutes(nowMs, targetMs)).toBeGreaterThan(0);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('progress is 0 at the previous occurrence and below 1 just before the next', () => {
    const prev = { exactMs: 0, displayMs: 0 };
    const next = { exactMs: 60000, displayMs: 60000 };
    expect(progress(0, prev, next)).toBe(0);
    const justBefore = progress(59999, prev, next);
    expect(justBefore).toBeLessThan(1);
    expect(justBefore).toBeGreaterThan(0.99);
  });

  it('progress clamps to the range 0 to 1', () => {
    const prev = { exactMs: 60000, displayMs: 60000 };
    const next = { exactMs: 120000, displayMs: 120000 };
    expect(progress(50000, prev, next)).toBe(0);
    expect(progress(130000, prev, next)).toBe(1);
    expect(progress(90000, prev, next)).toBe(0.5);
  });

  it('progress is 0 for a degenerate interval', () => {
    const ev = { exactMs: 60000, displayMs: 60000 };
    expect(progress(60000, ev, ev)).toBe(0);
    expect(
      progress(70000, { exactMs: 1000, displayMs: 120000 }, { exactMs: 1000, displayMs: 60000 }),
    ).toBe(0);
  });

  it('formatCountdown pads hours and minutes as 02h 48m', () => {
    expect(formatCountdown(2 * 60 + 48)).toBe('02h 48m');
    expect(formatCountdown(0)).toBe('00h 00m');
    expect(() => countdownParts(-5)).toThrow(RangeError);
  });

  it('formatCountdown shows 00h 01m in the last minute', () => {
    expect(formatCountdown(1)).toBe('00h 01m');
  });

  it('formatCountdown supports more than 99 hours', () => {
    expect(formatCountdown(105 * 60 + 15)).toBe('105h 15m');
  });

  it('countdown targets at 04:00 are all today', () => {
    // Snapshot includes yesterday (2026-11-14) per SNAPSHOT_POLICY so previous occurrences exist
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-14', dayCount: 4 });
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const nowMs = dayStart + 4 * 3600 * 1000; // 04:00 IST

    const targets = getCountdownTargets(fixture, nowMs);
    expect(targets.sunrise.status).toBe('ready');
    expect(targets.navkarshi.status).toBe('ready');
    expect(targets.sunset.status).toBe('ready');

    if (targets.sunrise.status === 'ready') {
      expect(istParts(targets.sunrise.next.displayMs).istDate).toBe('2026-11-15');
    }
    if (targets.navkarshi.status === 'ready') {
      expect(istParts(targets.navkarshi.next.displayMs).istDate).toBe('2026-11-15');
    }
    if (targets.sunset.status === 'ready') {
      expect(istParts(targets.sunset.next.displayMs).istDate).toBe('2026-11-15');
    }
  });

  it('countdown targets between sunrise and navkarshi', () => {
    // Snapshot includes yesterday (2026-11-14) per SNAPSHOT_POLICY so previous occurrences exist
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-14', dayCount: 4 });
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    // Between sunrise (06:48) and navkarshi (07:36): 07:00 IST
    const nowMs = dayStart + 7 * 3600 * 1000;

    const targets = getCountdownTargets(fixture, nowMs);
    expect(targets.sunrise.status).toBe('ready');
    expect(targets.navkarshi.status).toBe('ready');
    expect(targets.sunset.status).toBe('ready');

    if (targets.sunrise.status === 'ready') {
      // Sunrise for today has passed, so next sunrise is tomorrow
      expect(istParts(targets.sunrise.next.displayMs).istDate).toBe('2026-11-16');
    }
    if (targets.navkarshi.status === 'ready') {
      // Navkarshi is still today
      expect(istParts(targets.navkarshi.next.displayMs).istDate).toBe('2026-11-15');
    }
    if (targets.sunset.status === 'ready') {
      // Sunset is still today
      expect(istParts(targets.sunset.next.displayMs).istDate).toBe('2026-11-15');
    }
  });

  it('countdown targets between navkarshi and sunset', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-14', dayCount: 4 });
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    // Between navkarshi and sunset: 12:00 IST
    const nowMs = dayStart + 12 * 3600 * 1000;

    const targets = getCountdownTargets(fixture, nowMs);
    expect(targets.sunrise.status).toBe('ready');
    expect(targets.navkarshi.status).toBe('ready');
    expect(targets.sunset.status).toBe('ready');

    if (targets.sunrise.status === 'ready') {
      expect(istParts(targets.sunrise.next.displayMs).istDate).toBe('2026-11-16');
    }
    if (targets.navkarshi.status === 'ready') {
      expect(istParts(targets.navkarshi.next.displayMs).istDate).toBe('2026-11-16');
    }
    if (targets.sunset.status === 'ready') {
      expect(istParts(targets.sunset.next.displayMs).istDate).toBe('2026-11-15');
    }
  });

  it('countdown targets after sunset are all tomorrow', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-14', dayCount: 4 });
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    // After sunset: 20:00 IST
    const nowMs = dayStart + 20 * 3600 * 1000;

    const targets = getCountdownTargets(fixture, nowMs);
    expect(targets.sunrise.status).toBe('ready');
    expect(targets.navkarshi.status).toBe('ready');
    expect(targets.sunset.status).toBe('ready');

    if (targets.sunrise.status === 'ready') {
      expect(istParts(targets.sunrise.next.displayMs).istDate).toBe('2026-11-16');
    }
    if (targets.navkarshi.status === 'ready') {
      expect(istParts(targets.navkarshi.next.displayMs).istDate).toBe('2026-11-16');
    }
    if (targets.sunset.status === 'ready') {
      expect(istParts(targets.sunset.next.displayMs).istDate).toBe('2026-11-16');
    }
  });

  it('countdown rolls over at midnight and across a month and a year boundary', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-12-31', dayCount: 5 });
    const dec31Start = (istDateToStartMs('2026-12-31') as { ok: true; value: number }).value;
    const justBeforeMidnight = dec31Start + MS_PER_DAY - 1000; // 23:59:59 IST
    const justAfterMidnight = dec31Start + MS_PER_DAY + 1000; // 00:00:01 IST on 2027-01-01

    const targetsBefore = getCountdownTargets(fixture, justBeforeMidnight);
    const targetsAfter = getCountdownTargets(fixture, justAfterMidnight);

    expect(targetsBefore.sunrise.status).toBe('ready');
    expect(targetsAfter.sunrise.status).toBe('ready');

    if (targetsBefore.sunrise.status === 'ready' && targetsAfter.sunrise.status === 'ready') {
      expect(targetsBefore.sunrise.next.displayMs).toBe(targetsAfter.sunrise.next.displayMs);
      expect(istParts(targetsAfter.sunrise.next.displayMs).istDate).toBe('2027-01-01');
    }
  });

  it('getCountdownTargets reports horizon_exhausted when the snapshot runs out', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-15', dayCount: 1 });
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const pastHorizon = dayStart + 2 * MS_PER_DAY;

    const targets = getCountdownTargets(fixture, pastHorizon);
    expect(targets.sunrise.status).toBe('horizon_exhausted');
    expect(targets.navkarshi.status).toBe('horizon_exhausted');
    expect(targets.sunset.status).toBe('horizon_exhausted');
  });

  it('buildOccurrenceSeries extracts sunrise navkarshi sunset and moonrise in ascending order', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-15', dayCount: 5 });
    const series = buildOccurrenceSeries(fixture);

    expect(isAscending(series.sunrise)).toBe(true);
    expect(isAscending(series.navkarshi)).toBe(true);
    expect(isAscending(series.sunset)).toBe(true);
    expect(isAscending(series.moonrise)).toBe(true);
    expect(
      isAscending([
        { exactMs: 100, displayMs: 200 },
        { exactMs: 50, displayMs: 100 },
      ]),
    ).toBe(false);
    expect(series.sunrise.length).toBe(5);
    expect(series.moonrise.length).toBe(5);
  });

  it('moonrise series ignores moon set events', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-15', dayCount: 3 });
    const series = buildOccurrenceSeries(fixture);
    expect(fixture.moonEvents.some((m) => m.kind === 'set')).toBe(true);
    // Moonrise must contain only 3 items (one per day), ignoring the 3 set items
    expect(series.moonrise.length).toBe(3);
  });

  it('findDay returns the day record for an IST date', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-15', dayCount: 3 });
    const found = findDay(fixture, '2026-11-16');
    expect(found).toBeDefined();
    expect(found?.istDate).toBe('2026-11-16');
    expect(findDay(fixture, '2099-01-01')).toBeUndefined();
  });

  // ==========================================
  // Greeting, day/night, snapshot status, clock
  // ==========================================

  it('greeting is night at 03:59 IST', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const nowMs = dayStart + (3 * 3600 + 59 * 60) * 1000;
    const anchors = {
      solarNoonMs: dayStart + (12 * 3600 + 15 * 60) * 1000,
      sunsetMs: dayStart + (17 * 3600 + 50 * 60) * 1000,
    };
    expect(selectGreeting(nowMs, anchors)).toBe('night');
  });

  it('greeting is morning at 04:00 IST', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const nowMs = dayStart + 4 * 3600 * 1000;
    const anchors = {
      solarNoonMs: dayStart + (12 * 3600 + 15 * 60) * 1000,
      sunsetMs: dayStart + (17 * 3600 + 50 * 60) * 1000,
    };
    expect(selectGreeting(nowMs, anchors)).toBe('morning');
  });

  it('greeting is morning one minute before solar noon', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const noon = dayStart + (12 * 3600 + 15 * 60) * 1000;
    const anchors = {
      solarNoonMs: noon,
      sunsetMs: dayStart + (17 * 3600 + 50 * 60) * 1000,
    };
    expect(selectGreeting(noon - 60000, anchors)).toBe('morning');
  });

  it('greeting is afternoon at solar noon', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const noon = dayStart + (12 * 3600 + 15 * 60) * 1000;
    const anchors = {
      solarNoonMs: noon,
      sunsetMs: dayStart + (17 * 3600 + 50 * 60) * 1000,
    };
    expect(selectGreeting(noon, anchors)).toBe('afternoon');
  });

  it('greeting is afternoon one minute before 17:00 when sunset is later', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const sunset = dayStart + (17 * 3600 + 50 * 60) * 1000; // sunset at 17:50
    const anchors = {
      solarNoonMs: dayStart + (12 * 3600 + 15 * 60) * 1000,
      sunsetMs: sunset,
    };
    // 16:59 IST is one minute before 17:00
    const nowMs = dayStart + (16 * 3600 + 59 * 60) * 1000;
    expect(selectGreeting(nowMs, anchors)).toBe('afternoon');
  });

  it('greeting is evening at 17:00 when sunset is later', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const sunset = dayStart + (17 * 3600 + 50 * 60) * 1000; // 17:50
    const anchors = {
      solarNoonMs: dayStart + (12 * 3600 + 15 * 60) * 1000,
      sunsetMs: sunset,
    };
    const nowMs = dayStart + 17 * 3600 * 1000; // exactly 17:00
    expect(selectGreeting(nowMs, anchors)).toBe('evening');
  });

  it('greeting is evening at sunset when sunset is before 17:00', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    // Northeast winter sunset at 16:40
    const sunset = dayStart + (16 * 3600 + 40 * 60) * 1000;
    const anchors = {
      solarNoonMs: dayStart + (11 * 3600 + 45 * 60) * 1000,
      sunsetMs: sunset,
    };
    // At sunset (16:40), earlier-of rule selects 16:40 as evening start
    expect(selectGreeting(sunset, anchors)).toBe('evening');
  });

  it('greeting stays afternoon until 17:00 when the earlier-of rule is disabled', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const sunset = dayStart + (16 * 3600 + 40 * 60) * 1000; // 16:40
    const anchors = {
      solarNoonMs: dayStart + (11 * 3600 + 45 * 60) * 1000,
      sunsetMs: sunset,
    };
    // At 16:50 with earlier-of disabled, evening starts strictly at 17:00
    const nowMs = dayStart + (16 * 3600 + 50 * 60) * 1000;
    expect(selectGreeting(nowMs, anchors, { eveningStartsAtEarlierOfFixedAndSunset: false })).toBe(
      'afternoon',
    );
  });

  it('greeting is evening until sunset plus three hours and night from then', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const sunset = dayStart + (17 * 3600 + 50 * 60) * 1000; // 17:50
    const anchors = {
      solarNoonMs: dayStart + (12 * 3600 + 15 * 60) * 1000,
      sunsetMs: sunset,
    };
    const eveningEnd = sunset + 3 * 3600 * 1000; // 20:50

    expect(selectGreeting(eveningEnd - 1000, anchors)).toBe('evening');
    expect(selectGreeting(eveningEnd, anchors)).toBe('night');
  });

  it('greeting is night at 00:30 IST', () => {
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    const nowMs = dayStart + 30 * 60 * 1000; // 00:30
    const anchors = {
      solarNoonMs: dayStart + (12 * 3600 + 15 * 60) * 1000,
      sunsetMs: dayStart + (17 * 3600 + 50 * 60) * 1000,
    };
    expect(selectGreeting(nowMs, anchors)).toBe('night');
  });

  it('greeting boundaries hold for a Dwarka summer day with sunset at 19:35', () => {
    const dayStart = (istDateToStartMs('2026-06-21') as { ok: true; value: number }).value;
    const sunset = dayStart + (19 * 3600 + 35 * 60) * 1000; // 19:35
    const noon = dayStart + (12 * 3600 + 45 * 60) * 1000;
    const anchors = { solarNoonMs: noon, sunsetMs: sunset };

    // Morning
    expect(selectGreeting(dayStart + 5 * 3600 * 1000, anchors)).toBe('morning');
    // Afternoon
    expect(selectGreeting(dayStart + 14 * 3600 * 1000, anchors)).toBe('afternoon');
    // Evening starts at 17:00 (earlier of 17:00 and 19:35)
    expect(selectGreeting(dayStart + 17 * 3600 * 1000, anchors)).toBe('evening');
    // Sunset (19:35) is still evening
    expect(selectGreeting(sunset, anchors)).toBe('evening');
    // Evening lasts until sunset + 3h = 22:35
    const eveningEnd = sunset + 3 * 3600 * 1000;
    expect(selectGreeting(eveningEnd - 1000, anchors)).toBe('evening');
    expect(selectGreeting(eveningEnd, anchors)).toBe('night');
  });

  it('dayNight is night before the displayed sunrise minute and day from it', () => {
    const sunriseDisplay = 60000 * 400; // 06:40
    const sunsetDisplay = 60000 * 1070; // 17:50
    const endpoints = { sunriseDisplayMs: sunriseDisplay, sunsetDisplayMs: sunsetDisplay };

    expect(dayNight(sunriseDisplay - 1, endpoints)).toBe('night');
    expect(dayNight(sunriseDisplay, endpoints)).toBe('day');
    expect(dayNight(sunriseDisplay + 60000, endpoints)).toBe('day');
  });

  it('dayNight switches to night at the displayed sunset minute', () => {
    const sunriseDisplay = 60000 * 400;
    const sunsetDisplay = 60000 * 1070;
    const endpoints = { sunriseDisplayMs: sunriseDisplay, sunsetDisplayMs: sunsetDisplay };

    expect(dayNight(sunsetDisplay - 1, endpoints)).toBe('day');
    expect(dayNight(sunsetDisplay, endpoints)).toBe('night');
    expect(dayNight(sunsetDisplay + 60000, endpoints)).toBe('night');
    expect(() => dayNight(NaN, endpoints)).toThrow(RangeError);
  });

  it('getSnapshotStatus is not_started before the first day', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-15', dayCount: 30 });
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    expect(getSnapshotStatus(fixture, dayStart - 1000)).toBe('not_started');
  });

  it('getSnapshotStatus is ready in the middle of the horizon', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-15', dayCount: 30 });
    const dayStart = (istDateToStartMs('2026-11-15') as { ok: true; value: number }).value;
    // Day 10 is well within the 30-day horizon (> 7 days remaining)
    expect(getSnapshotStatus(fixture, dayStart + 10 * MS_PER_DAY)).toBe('ready');
  });

  it('getSnapshotStatus is expiring within seven days of the last day', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-15', dayCount: 30 });
    const lastDay = fixture.days[fixture.days.length - 1];
    expect(lastDay).toBeDefined();
    if (lastDay) {
      const lastDayRes = istDateToStartMs(lastDay.istDate);
      expect(lastDayRes.ok).toBe(true);
      if (lastDayRes.ok) {
        const lastDayEnd = lastDayRes.value + MS_PER_DAY;
        // 5 days before end of last day (<= 7 days)
        const expiringNow = lastDayEnd - 5 * MS_PER_DAY;
        expect(getSnapshotStatus(fixture, expiringNow)).toBe('expiring');
      }
    }
  });

  it('getSnapshotStatus is expired after the last day ends', () => {
    const fixture = makeSnapshotFixture({ startIstDate: '2026-11-15', dayCount: 30 });
    const lastDay = fixture.days[fixture.days.length - 1];
    expect(lastDay).toBeDefined();
    if (lastDay) {
      const lastDayRes = istDateToStartMs(lastDay.istDate);
      expect(lastDayRes.ok).toBe(true);
      if (lastDayRes.ok) {
        const lastDayEnd = lastDayRes.value + MS_PER_DAY;
        expect(getSnapshotStatus(fixture, lastDayEnd)).toBe('expired');
        expect(getSnapshotStatus(fixture, lastDayEnd + 10000)).toBe('expired');
      }
    }
    expect(() => getSnapshotStatus(fixture, NaN)).toThrow(RangeError);
    expect(getSnapshotStatus({ ...fixture, days: [] }, 1000)).toBe('expired');
    expect(
      getSnapshotStatus(
        { ...fixture, days: [{ istDate: 'invalid' } as unknown as (typeof fixture.days)[0]] },
        1000,
      ),
    ).toBe('expired');
  });

  it('fixed clock returns the configured instant', () => {
    const clock = createFixedClock(1763184000000);
    expect(clock.nowMs()).toBe(1763184000000);
    expect(() => createFixedClock(NaN)).toThrow(RangeError);
  });

  it('manual clock advances by the requested milliseconds', () => {
    const clock = createManualClock(1000);
    expect(clock.nowMs()).toBe(1000);
    clock.advance(500);
    expect(clock.nowMs()).toBe(1500);
    clock.set(5000);
    expect(clock.nowMs()).toBe(5000);
    expect(() => createManualClock(NaN)).toThrow(RangeError);
    expect(() => {
      clock.advance(NaN);
    }).toThrow(RangeError);
    expect(() => {
      clock.set(NaN);
    }).toThrow(RangeError);
  });
});
