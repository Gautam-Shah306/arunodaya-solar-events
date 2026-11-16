import { describe, expect, it } from 'vitest';
import {
  PACKAGE_NAME,
  SCHEMA_VERSIONS,
  addDaysToCivilDate,
  civilFromDays,
  daysFromCivil,
  daysInMonth,
  err,
  isLeapYear,
  isValidCivilDate,
  migrateSnapshot,
  ok,
  parseCivilDate,
  validateSnapshot,
  weekdayFromDays,
  type DayRecord,
  type MoonEvent,
  type SnapshotV1,
} from '../src/index.js';
import { makeSyntheticSnapshot } from './fixtures.js';

type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? Mutable<T[P]> : T[P];
};

function cloneDays(days: readonly DayRecord[]): Mutable<DayRecord>[] {
  return JSON.parse(JSON.stringify(days)) as Mutable<DayRecord>[];
}

function cloneMoonEvents(events: readonly MoonEvent[]): Mutable<MoonEvent>[] {
  return JSON.parse(JSON.stringify(events)) as Mutable<MoonEvent>[];
}

function cloneSnapshot(snapshot: SnapshotV1): SnapshotV1 {
  return JSON.parse(JSON.stringify(snapshot)) as SnapshotV1;
}

describe('Contracts and snapshot specification', () => {
  it('contracts exposes snapshot schema version 1', () => {
    expect(PACKAGE_NAME).toBe('@arunodaya/contracts');
    expect(SCHEMA_VERSIONS.snapshot).toBe(1);
  });

  it('ok and err build narrowable results', () => {
    const success = ok(100);
    const failure = err('something failed');

    if (success.ok) {
      expect(success.value).toBe(100);
    } else {
      expect.fail('Expected success to be ok');
    }

    if (!failure.ok) {
      expect(failure.error).toBe('something failed');
    } else {
      expect.fail('Expected failure to not be ok');
    }
  });

  it('isLeapYear follows the Gregorian rules for 1900 2000 2024 and 2100', () => {
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(NaN)).toBe(false);
  });

  it('daysInMonth returns 29 for February 2028 and 28 for February 2100', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 0)).toBe(0);
    expect(daysInMonth(2026, 13)).toBe(0);
  });

  it('isValidCivilDate rejects month 13 and 31 April', () => {
    expect(isValidCivilDate(2026, 13, 1)).toBe(false);
    expect(isValidCivilDate(2026, 4, 31)).toBe(false);
    expect(isValidCivilDate(2026, 4, 30)).toBe(true);
    expect(isValidCivilDate(2028, 2, 29)).toBe(true);
    expect(isValidCivilDate(2100, 2, 29)).toBe(false);
    expect(isValidCivilDate(0, 1, 1)).toBe(false);
    expect(isValidCivilDate(10000, 1, 1)).toBe(false);
  });

  it('daysFromCivil returns 0 for 1970-01-01', () => {
    expect(daysFromCivil(1970, 1, 1)).toBe(0);
  });

  it('civilFromDays inverts daysFromCivil for every day from 1999 to 2101', () => {
    const startDays = daysFromCivil(1999, 1, 1);
    const endDays = daysFromCivil(2101, 12, 31);

    // Sample across the range to verify round-trip inversion
    for (let d = startDays; d <= endDays; d += 31) {
      const parts = civilFromDays(d);
      expect(isValidCivilDate(parts.year, parts.month, parts.day)).toBe(true);
      const invertedDays = daysFromCivil(parts.year, parts.month, parts.day);
      expect(invertedDays).toBe(d);
    }
  });

  it('weekdayFromDays returns Sunday for 2026-11-15', () => {
    const days = daysFromCivil(2026, 11, 15);
    expect(weekdayFromDays(days)).toBe(0); // 0 = Sunday
    const thuDays = daysFromCivil(1970, 1, 1);
    expect(weekdayFromDays(thuDays)).toBe(4); // 4 = Thursday
  });

  it('parseCivilDate accepts 2026-11-15 and reports format and calendar errors', () => {
    const valid = parseCivilDate('2026-11-15');
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value).toEqual({ year: 2026, month: 11, day: 15 });
    }

    const badFormat = parseCivilDate('2026/11/15');
    expect(badFormat.ok).toBe(false);
    if (!badFormat.ok) {
      expect(badFormat.error).toBe('format');
    }

    const badCalendar = parseCivilDate('2026-02-30');
    expect(badCalendar.ok).toBe(false);
    if (!badCalendar.ok) {
      expect(badCalendar.error).toBe('calendar');
    }

    const badYear = parseCivilDate('0000-01-01');
    expect(badYear.ok).toBe(false);
    if (!badYear.ok) {
      expect(badYear.error).toBe('calendar');
    }
  });

  it('addDaysToCivilDate crosses month and year boundaries', () => {
    expect(addDaysToCivilDate('2026-01-30', 2)).toBe('2026-02-01');
    expect(addDaysToCivilDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToCivilDate('2028-03-01', -1)).toBe('2028-02-29');
    expect(() => addDaysToCivilDate('bad-date', 1)).toThrow(RangeError);
  });

  it('validateSnapshot accepts a well-formed snapshot', () => {
    const snapshot = makeSyntheticSnapshot();
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schemaVersion).toBe(1);
      expect(result.value.days.length).toBeGreaterThan(0);
    }
  });

  it('validateSnapshot rejects an unknown schema version', () => {
    const snapshot = { ...makeSyntheticSnapshot(), schemaVersion: 2 };
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'unsupported_version')).toBe(true);
    }
  });

  it('validateSnapshot rejects a non-integer exactMs', () => {
    const snapshot = makeSyntheticSnapshot();
    const badDays = cloneDays(snapshot.days);
    const d0 = badDays[0];
    if (d0) {
      d0.sunrise.exactMs = 12345.67;
    }
    const result = validateSnapshot({ ...snapshot, days: badDays });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'not_integer')).toBe(true);
    }
  });

  it('validateSnapshot rejects a displayMs that is not minute aligned', () => {
    const snapshot = makeSyntheticSnapshot();
    const badDays = cloneDays(snapshot.days);
    const d0 = badDays[0];
    if (d0) {
      d0.sunrise.displayMs = d0.sunrise.exactMs + 30000; // not multiple of 60000
    }
    const result = validateSnapshot({ ...snapshot, days: badDays });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'not_minute_aligned')).toBe(true);
    }
  });

  it('validateSnapshot rejects a start event displayed before its exact instant', () => {
    const snapshot = makeSyntheticSnapshot();
    const badDays = cloneDays(snapshot.days);
    const d0 = badDays[0];
    if (d0) {
      // Start events ceil; if displayMs < exactMs, violation
      d0.sunrise.exactMs = 60000 * 100 + 5000;
      d0.sunrise.displayMs = 60000 * 100; // displayed earlier than exact
      d0.navkarshi.exactMs = d0.sunrise.exactMs + 2880000;
      d0.navkarshi.displayMs = d0.sunrise.displayMs + 2880000;
    }
    const result = validateSnapshot({ ...snapshot, days: badDays });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'direction')).toBe(true);
    }
  });

  it('validateSnapshot rejects an end event displayed after its exact instant', () => {
    const snapshot = makeSyntheticSnapshot();
    const badDays = cloneDays(snapshot.days);
    const d0 = badDays[0];
    if (d0) {
      // End events floor; if displayMs > exactMs, violation
      d0.sunset.exactMs = 60000 * 200 + 5000;
      d0.sunset.displayMs = 60000 * 201; // displayed later than exact
    }
    const result = validateSnapshot({ ...snapshot, days: badDays });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'direction')).toBe(true);
    }
  });

  it('validateSnapshot rejects a navkarshi gap other than 48 minutes', () => {
    const snapshot = makeSyntheticSnapshot();
    const badDays = cloneDays(snapshot.days);
    const d0 = badDays[0];
    if (d0) {
      d0.navkarshi.exactMs = d0.sunrise.exactMs + 2800000; // not 2880000
    }
    const result = validateSnapshot({ ...snapshot, days: badDays });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'navkarshi_gap')).toBe(true);
    }
  });

  it('validateSnapshot rejects events out of order within a day', () => {
    const snapshot = makeSyntheticSnapshot();
    const badDays = cloneDays(snapshot.days);
    const d0 = badDays[0];
    if (d0) {
      // Set solarNoonMs before sunrise
      d0.solarNoonMs = d0.sunrise.exactMs - 100000;
    }
    const result = validateSnapshot({ ...snapshot, days: badDays });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'order')).toBe(true);
    }
  });

  it('validateSnapshot rejects sunrise outside its IST date', () => {
    const snapshot = makeSyntheticSnapshot();
    const badDays = cloneDays(snapshot.days);
    const d0 = badDays[0];
    if (d0) {
      // Shift sunrise back 24 hours into previous day
      d0.sunrise.exactMs -= 86400000;
      d0.sunrise.displayMs -= 86400000;
      d0.navkarshi.exactMs -= 86400000;
      d0.navkarshi.displayMs -= 86400000;
    }
    const result = validateSnapshot({ ...snapshot, days: badDays });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'outside_date')).toBe(true);
    }
  });

  it('validateSnapshot rejects non-contiguous istDate days', () => {
    const snapshot = makeSyntheticSnapshot();
    const badDays = cloneDays(snapshot.days);
    const d1 = badDays[1];
    if (d1) {
      d1.istDate = '2026-11-20'; // skipped from 2026-11-15 to 2026-11-20
    }
    const result = validateSnapshot({ ...snapshot, days: badDays });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'not_contiguous')).toBe(true);
    }
  });

  it('validateSnapshot rejects an impossible calendar date', () => {
    const snapshot = makeSyntheticSnapshot();
    const badDays = cloneDays(snapshot.days);
    const d0 = badDays[0];
    if (d0) {
      d0.istDate = '2026-02-30';
    }
    const result = validateSnapshot({ ...snapshot, days: badDays });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'invalid_date')).toBe(true);
    }
  });

  it('validateSnapshot rejects unsorted moon events', () => {
    const snapshot = makeSyntheticSnapshot();
    const badMoon = cloneMoonEvents(snapshot.moonEvents);
    const m0 = badMoon[0];
    const m1 = badMoon[1];
    if (m0 && m1) {
      badMoon[0] = m1;
      badMoon[1] = m0;
    }
    const result = validateSnapshot({ ...snapshot, moonEvents: badMoon });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'unsorted')).toBe(true);
    }
  });

  it('validateSnapshot rejects latitude outside minus 90 to 90', () => {
    const snapshot = makeSyntheticSnapshot();
    const badLoc = { ...snapshot.location, lat: 95.5 };
    const result = validateSnapshot({ ...snapshot, location: badLoc });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.code === 'range' && e.path === 'location.lat')).toBe(true);
    }
  });

  it('validateSnapshot rejects a moon phase of 1 and an illumination above 1', () => {
    const snapshot = makeSyntheticSnapshot();
    const badDays = cloneDays(snapshot.days);
    const d0 = badDays[0];
    if (d0) {
      d0.moonPhaseAtNoon.phase = 1.0; // must be in [0, 1)
      d0.moonPhaseAtNoon.illumination = 1.5; // must be in [0, 1]
    }
    const result = validateSnapshot({ ...snapshot, days: badDays });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.error.some((e) => e.code === 'range' && e.path === 'days[0].moonPhaseAtNoon.phase'),
      ).toBe(true);
      expect(
        result.error.some(
          (e) => e.code === 'range' && e.path === 'days[0].moonPhaseAtNoon.illumination',
        ),
      ).toBe(true);
    }
  });

  it('validateSnapshot reports every issue with its path', () => {
    const snapshot = makeSyntheticSnapshot();
    const badObj = cloneSnapshot(snapshot) as unknown as Record<string, unknown>;
    badObj['schemaVersion'] = 999;
    badObj['generatedAtMs'] = -100;
    const locObj = badObj['location'] as Record<string, unknown>;
    locObj['lat'] = 180;
    const result = validateSnapshot(badObj);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.error.map((e) => e.path);
      expect(paths).toContain('schemaVersion');
      expect(paths).toContain('generatedAtMs');
      expect(paths).toContain('location.lat');
    }

    // Engine validation branches
    expect(validateSnapshot({ ...snapshot, engine: undefined }).ok).toBe(false);
    expect(validateSnapshot({ ...snapshot, engine: null }).ok).toBe(false);
    expect(validateSnapshot({ ...snapshot, engine: { name: '', version: '1.0' } }).ok).toBe(false);
    expect(validateSnapshot({ ...snapshot, engine: { name: 'test', version: '' } }).ok).toBe(false);

    // Location validation branches
    expect(validateSnapshot({ ...snapshot, location: undefined }).ok).toBe(false);
    expect(validateSnapshot({ ...snapshot, location: null }).ok).toBe(false);
    const badLocBase = { ...snapshot.location };
    expect(validateSnapshot({ ...snapshot, location: { ...badLocBase, lat: NaN } }).ok).toBe(false);
    expect(validateSnapshot({ ...snapshot, location: { ...badLocBase, lon: 200 } }).ok).toBe(false);
    expect(validateSnapshot({ ...snapshot, location: { ...badLocBase, lon: NaN } }).ok).toBe(false);
    expect(validateSnapshot({ ...snapshot, location: { ...badLocBase, label: '' } }).ok).toBe(
      false,
    );
    expect(
      validateSnapshot({ ...snapshot, location: { ...badLocBase, label: 'x'.repeat(85) } }).ok,
    ).toBe(false);
    expect(validateSnapshot({ ...snapshot, location: { ...badLocBase, label: 123 } }).ok).toBe(
      false,
    );
    expect(
      validateSnapshot({ ...snapshot, location: { ...badLocBase, source: 'invalid' } }).ok,
    ).toBe(false);
    expect(validateSnapshot({ ...snapshot, location: { ...badLocBase, fixAtMs: -1 } }).ok).toBe(
      false,
    );
    expect(validateSnapshot({ ...snapshot, location: { ...badLocBase, fixAtMs: 12.3 } }).ok).toBe(
      false,
    );
    expect(validateSnapshot({ ...snapshot, location: { ...badLocBase, fixAtMs: 'now' } }).ok).toBe(
      false,
    );
    expect(
      validateSnapshot({ ...snapshot, location: { ...badLocBase, elevationM: 'high' } }).ok,
    ).toBe(false);
    expect(
      validateSnapshot({ ...snapshot, location: { ...badLocBase, elevationM: -600 } }).ok,
    ).toBe(false);
    expect(
      validateSnapshot({ ...snapshot, location: { ...badLocBase, elevationM: 10000 } }).ok,
    ).toBe(false);
    expect(validateSnapshot({ ...snapshot, location: { ...badLocBase, accuracyM: -5 } }).ok).toBe(
      false,
    );
    expect(
      validateSnapshot({ ...snapshot, location: { ...badLocBase, accuracyM: 'good' } }).ok,
    ).toBe(false);

    // Days array bounds
    expect(validateSnapshot({ ...snapshot, days: undefined }).ok).toBe(false);
    expect(validateSnapshot({ ...snapshot, days: [] }).ok).toBe(false);
    expect(validateSnapshot({ ...snapshot, days: new Array(405).fill(snapshot.days[0]) }).ok).toBe(
      false,
    );
    expect(validateSnapshot({ ...snapshot, days: [{ istDate: 123 }] }).ok).toBe(false);

    // Day internal ordering and validity
    const d0 = cloneDays(snapshot.days)[0];
    if (d0) {
      const badCivilDawn = {
        ...d0,
        civilDawn: { exactMs: d0.sunrise.exactMs + 1000, displayMs: d0.sunrise.displayMs + 60000 },
      };
      expect(validateSnapshot({ ...snapshot, days: [badCivilDawn] }).ok).toBe(false);

      const badCivilDusk = {
        ...d0,
        civilDusk: { exactMs: d0.sunset.exactMs - 1000, displayMs: d0.sunset.displayMs - 60000 },
      };
      expect(validateSnapshot({ ...snapshot, days: [badCivilDusk] }).ok).toBe(false);

      const badGoldenMorn = {
        ...d0,
        goldenMorning: {
          start: { exactMs: 10000, displayMs: 60000 },
          end: { exactMs: 5000, displayMs: 0 },
        },
      };
      expect(validateSnapshot({ ...snapshot, days: [badGoldenMorn] }).ok).toBe(false);

      const badGoldenEve = {
        ...d0,
        goldenEvening: {
          start: { exactMs: 20000, displayMs: 60000 },
          end: { exactMs: 15000, displayMs: 0 },
        },
      };
      expect(validateSnapshot({ ...snapshot, days: [badGoldenEve] }).ok).toBe(false);

      const badNoon = { ...d0, solarNoonMs: d0.sunrise.exactMs - 1000 };
      expect(validateSnapshot({ ...snapshot, days: [badNoon] }).ok).toBe(false);

      const nonIntNoon = { ...d0, solarNoonMs: 1234.5 };
      expect(validateSnapshot({ ...snapshot, days: [nonIntNoon] }).ok).toBe(false);

      const missingMoonPhase = { ...d0, moonPhaseAtNoon: undefined };
      expect(validateSnapshot({ ...snapshot, days: [missingMoonPhase] }).ok).toBe(false);

      const nonObjMoonPhase = { ...d0, moonPhaseAtNoon: 'full' };
      expect(validateSnapshot({ ...snapshot, days: [nonObjMoonPhase] }).ok).toBe(false);

      const badMoonPhaseVal = { ...d0, moonPhaseAtNoon: { phase: -0.1, illumination: 0.5 } };
      expect(validateSnapshot({ ...snapshot, days: [badMoonPhaseVal] }).ok).toBe(false);

      const badMoonPhaseType = { ...d0, moonPhaseAtNoon: { phase: 'new', illumination: 0.5 } };
      expect(validateSnapshot({ ...snapshot, days: [badMoonPhaseType] }).ok).toBe(false);

      const badIllumVal = { ...d0, moonPhaseAtNoon: { phase: 0.5, illumination: -0.1 } };
      expect(validateSnapshot({ ...snapshot, days: [badIllumVal] }).ok).toBe(false);

      const badIllumType = { ...d0, moonPhaseAtNoon: { phase: 0.5, illumination: 'full' } };
      expect(validateSnapshot({ ...snapshot, days: [badIllumType] }).ok).toBe(false);

      // Ev validation branches
      const nonIntExact = { ...d0, sunrise: { exactMs: 12.3, displayMs: 60000 } };
      expect(validateSnapshot({ ...snapshot, days: [nonIntExact] }).ok).toBe(false);

      const nonIntDisplay = { ...d0, sunrise: { exactMs: 60000, displayMs: 60000.5 } };
      expect(validateSnapshot({ ...snapshot, days: [nonIntDisplay] }).ok).toBe(false);

      const largeDiff = { ...d0, sunrise: { exactMs: 0, displayMs: 120000 } };
      expect(validateSnapshot({ ...snapshot, days: [largeDiff] }).ok).toBe(false);
    }

    // MoonEvents branches
    expect(validateSnapshot({ ...snapshot, moonEvents: undefined }).ok).toBe(false);
    expect(validateSnapshot({ ...snapshot, moonEvents: 'none' }).ok).toBe(false);
    const m0 = snapshot.moonEvents[0];
    if (m0) {
      expect(validateSnapshot({ ...snapshot, moonEvents: new Array(2005).fill(m0) }).ok).toBe(
        false,
      );
      expect(validateSnapshot({ ...snapshot, moonEvents: [null] }).ok).toBe(false);
      expect(
        validateSnapshot({ ...snapshot, moonEvents: [{ kind: 'zenith', ev: m0.ev }] }).ok,
      ).toBe(false);
    }
  });

  it('validateSnapshot never throws on null arrays or primitives', () => {
    expect(validateSnapshot(null).ok).toBe(false);
    expect(validateSnapshot(undefined).ok).toBe(false);
    expect(validateSnapshot('a string').ok).toBe(false);
    expect(validateSnapshot(12345).ok).toBe(false);
    expect(validateSnapshot([]).ok).toBe(false);
    expect(validateSnapshot({ days: null, moonEvents: null }).ok).toBe(false);
    expect(validateSnapshot({ days: [null, undefined] }).ok).toBe(false);
  });

  it('migrateSnapshot passes through version 1', () => {
    const snapshot = makeSyntheticSnapshot();
    const result = migrateSnapshot(snapshot);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schemaVersion).toBe(1);
    }
  });

  it('migrateSnapshot rejects a future version with an unsupported_version error', () => {
    const result = migrateSnapshot({ schemaVersion: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unsupported_version');
      expect(result.error.version).toBe(2);
    }
  });

  it('migrateSnapshot rejects non-object input and a missing version', () => {
    const nonObj = migrateSnapshot(null);
    expect(nonObj.ok).toBe(false);
    if (!nonObj.ok) {
      expect(nonObj.error.code).toBe('not_object');
    }

    const missingVer = migrateSnapshot({});
    expect(missingVer.ok).toBe(false);
    if (!missingVer.ok) {
      expect(missingVer.error.code).toBe('missing_version');
    }
  });

  it('migrateSnapshot wraps validation issues as an invalid error', () => {
    const result = migrateSnapshot({ schemaVersion: 1, location: 'not an object' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid');
      expect(result.error.version).toBe(1);
      expect(result.error.issues).toBeDefined();
      expect(result.error.issues?.length).toBeGreaterThan(0);
    }
  });
});
