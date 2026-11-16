import { daysFromCivil, parseCivilDate } from './civil-date.js';
import type { SnapshotV1 } from './snapshot.js';
import type { Ev } from './ev.js';
import { err, ok, type Result } from './result.js';

export type ValidationCode =
  | 'type'
  | 'missing'
  | 'range'
  | 'not_integer'
  | 'not_minute_aligned'
  | 'direction'
  | 'navkarshi_gap'
  | 'order'
  | 'not_contiguous'
  | 'invalid_date'
  | 'outside_date'
  | 'unsorted'
  | 'unsupported_version';

export interface ValidationIssue {
  readonly path: string;
  readonly code: ValidationCode;
  readonly message: string;
}

const MAX_ISSUES = 100;
const IST_OFFSET_MS = 19_800_000;
const MS_PER_DAY = 86_400_000;
const NAVKARSHI_DIFF_MS = 2_880_000;

class IssueCollector {
  readonly issues: ValidationIssue[] = [];

  add(path: string, code: ValidationCode, message: string): boolean {
    if (this.issues.length < MAX_ISSUES) {
      this.issues.push({ path, code, message });
    }
    return this.issues.length < MAX_ISSUES;
  }

  isFull(): boolean {
    return this.issues.length >= MAX_ISSUES;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateEv(
  collector: IssueCollector,
  ev: unknown,
  path: string,
  kind: 'start' | 'end',
): ev is Ev {
  if (collector.isFull()) return false;
  if (!isRecord(ev)) {
    collector.add(path, 'type', `Expected Ev object at ${path}`);
    return false;
  }

  const { exactMs, displayMs } = ev;

  if (typeof exactMs !== 'number') {
    collector.add(`${path}.exactMs`, 'type', `exactMs must be a number at ${path}.exactMs`);
  } else if (!Number.isFinite(exactMs) || !Number.isInteger(exactMs)) {
    collector.add(
      `${path}.exactMs`,
      'not_integer',
      `exactMs must be a finite integer at ${path}.exactMs`,
    );
  }

  if (typeof displayMs !== 'number') {
    collector.add(`${path}.displayMs`, 'type', `displayMs must be a number at ${path}.displayMs`);
  } else if (!Number.isFinite(displayMs) || !Number.isInteger(displayMs)) {
    collector.add(
      `${path}.displayMs`,
      'not_integer',
      `displayMs must be a finite integer at ${path}.displayMs`,
    );
  } else if (displayMs % 60000 !== 0) {
    collector.add(
      `${path}.displayMs`,
      'not_minute_aligned',
      `displayMs must be a multiple of 60000 at ${path}.displayMs`,
    );
  }

  if (
    typeof exactMs === 'number' &&
    typeof displayMs === 'number' &&
    Number.isInteger(exactMs) &&
    Number.isInteger(displayMs)
  ) {
    if (Math.abs(displayMs - exactMs) >= 60000) {
      collector.add(
        `${path}.displayMs`,
        'range',
        `displayMs must differ from exactMs by less than 60000 ms at ${path}`,
      );
    }

    if (kind === 'start' && displayMs < exactMs) {
      collector.add(
        `${path}.displayMs`,
        'direction',
        `Start event displayMs must be >= exactMs (ceiling) at ${path}`,
      );
    } else if (kind === 'end' && displayMs > exactMs) {
      collector.add(
        `${path}.displayMs`,
        'direction',
        `End event displayMs must be <= exactMs (floor) at ${path}`,
      );
    }
  }

  return true;
}

/**
 * Validates unknown input against the SnapshotV1 specification.
 * Returns ok with SnapshotV1 or err with ValidationIssue array (capped at 100).
 * Never throws on malformed or primitive input.
 * @param input Unknown data payload to validate
 */
export function validateSnapshot(input: unknown): Result<SnapshotV1, ValidationIssue[]> {
  const collector = new IssueCollector();

  if (!isRecord(input)) {
    collector.add('', 'type', 'Snapshot must be an object');
    return err(collector.issues);
  }

  // 1. schemaVersion
  if (input.schemaVersion === undefined) {
    collector.add('schemaVersion', 'missing', 'Missing schemaVersion');
  } else if (input.schemaVersion !== 1) {
    collector.add('schemaVersion', 'unsupported_version', 'schemaVersion must be strictly 1');
  }

  // 2. generatedAtMs
  if (input.generatedAtMs === undefined) {
    collector.add('generatedAtMs', 'missing', 'Missing generatedAtMs');
  } else if (typeof input.generatedAtMs !== 'number') {
    collector.add('generatedAtMs', 'type', 'generatedAtMs must be a number');
  } else if (!Number.isFinite(input.generatedAtMs) || !Number.isInteger(input.generatedAtMs)) {
    collector.add('generatedAtMs', 'not_integer', 'generatedAtMs must be a finite integer');
  } else if (input.generatedAtMs < 0) {
    collector.add('generatedAtMs', 'range', 'generatedAtMs must be non-negative');
  }

  // 3. engine
  if (input.engine === undefined) {
    collector.add('engine', 'missing', 'Missing engine metadata');
  } else if (!isRecord(input.engine)) {
    collector.add('engine', 'type', 'engine must be an object');
  } else {
    if (typeof input.engine.name !== 'string' || input.engine.name.trim() === '') {
      collector.add('engine.name', 'type', 'engine.name must be a non-empty string');
    }
    if (typeof input.engine.version !== 'string' || input.engine.version.trim() === '') {
      collector.add('engine.version', 'type', 'engine.version must be a non-empty string');
    }
  }

  // 4. location
  if (input.location === undefined) {
    collector.add('location', 'missing', 'Missing location');
  } else if (!isRecord(input.location)) {
    collector.add('location', 'type', 'location must be an object');
  } else {
    const loc = input.location;
    if (typeof loc.lat !== 'number' || !Number.isFinite(loc.lat)) {
      collector.add('location.lat', 'type', 'location.lat must be a finite number');
    } else if (loc.lat < -90 || loc.lat > 90) {
      collector.add('location.lat', 'range', 'location.lat must be between -90 and 90');
    }

    if (typeof loc.lon !== 'number' || !Number.isFinite(loc.lon)) {
      collector.add('location.lon', 'type', 'location.lon must be a finite number');
    } else if (loc.lon < -180 || loc.lon > 180) {
      collector.add('location.lon', 'range', 'location.lon must be between -180 and 180');
    }

    if (loc.elevationM !== undefined) {
      if (typeof loc.elevationM !== 'number' || !Number.isFinite(loc.elevationM)) {
        collector.add('location.elevationM', 'type', 'location.elevationM must be a number');
      } else if (loc.elevationM < -500 || loc.elevationM > 9000) {
        collector.add(
          'location.elevationM',
          'range',
          'location.elevationM must be between -500 and 9000 meters',
        );
      }
    }

    if (typeof loc.label !== 'string') {
      collector.add('location.label', 'type', 'location.label must be a string');
    } else if (loc.label.length < 1 || loc.label.length > 80) {
      collector.add(
        'location.label',
        'range',
        'location.label must be between 1 and 80 characters',
      );
    }

    if (loc.source !== 'gps' && loc.source !== 'last_known' && loc.source !== 'manual') {
      collector.add(
        'location.source',
        'range',
        'location.source must be gps, last_known or manual',
      );
    }

    if (typeof loc.fixAtMs !== 'number') {
      collector.add('location.fixAtMs', 'type', 'location.fixAtMs must be a number');
    } else if (!Number.isFinite(loc.fixAtMs) || !Number.isInteger(loc.fixAtMs)) {
      collector.add('location.fixAtMs', 'not_integer', 'location.fixAtMs must be an integer');
    } else if (loc.fixAtMs < 0) {
      collector.add('location.fixAtMs', 'range', 'location.fixAtMs must be non-negative');
    }

    if (loc.accuracyM !== undefined) {
      if (typeof loc.accuracyM !== 'number' || !Number.isFinite(loc.accuracyM)) {
        collector.add('location.accuracyM', 'type', 'location.accuracyM must be a number');
      } else if (loc.accuracyM < 0) {
        collector.add('location.accuracyM', 'range', 'location.accuracyM must be non-negative');
      }
    }
  }

  // 5. days array
  if (input.days === undefined) {
    collector.add('days', 'missing', 'Missing days array');
  } else if (!Array.isArray(input.days)) {
    collector.add('days', 'type', 'days must be an array');
  } else if (input.days.length < 1 || input.days.length > 400) {
    collector.add('days', 'range', 'days array length must be between 1 and 400');
  } else {
    let prevEpochDays: number | null = null;

    for (let i = 0; i < input.days.length; i++) {
      if (collector.isFull()) break;
      const dayPath = `days[${String(i)}]`;
      const record: unknown = (input.days as unknown[])[i];

      if (!isRecord(record)) {
        collector.add(dayPath, 'type', `Expected DayRecord object at ${dayPath}`);
        continue;
      }

      // istDate validation
      let startOfDayMs: number | null = null;
      let endOfDayMs: number | null = null;

      if (typeof record.istDate !== 'string') {
        collector.add(
          `${dayPath}.istDate`,
          'type',
          `istDate must be a string at ${dayPath}.istDate`,
        );
      } else {
        const parsedDate = parseCivilDate(record.istDate);
        if (!parsedDate.ok) {
          collector.add(
            `${dayPath}.istDate`,
            'invalid_date',
            `istDate is not a valid civil date at ${dayPath}.istDate: ${record.istDate}`,
          );
        } else {
          const currentEpochDays = daysFromCivil(
            parsedDate.value.year,
            parsedDate.value.month,
            parsedDate.value.day,
          );
          startOfDayMs = currentEpochDays * MS_PER_DAY - IST_OFFSET_MS;
          endOfDayMs = startOfDayMs + MS_PER_DAY;

          if (prevEpochDays !== null && currentEpochDays !== prevEpochDays + 1) {
            collector.add(
              `${dayPath}.istDate`,
              'not_contiguous',
              `Days must be contiguous ascending dates. Expected next day at ${dayPath}.istDate`,
            );
          }
          prevEpochDays = currentEpochDays;
        }
      }

      // Ev validation
      validateEv(collector, record.sunrise, `${dayPath}.sunrise`, 'start');
      validateEv(collector, record.navkarshi, `${dayPath}.navkarshi`, 'start');
      validateEv(collector, record.sunset, `${dayPath}.sunset`, 'end');
      validateEv(collector, record.civilDawn, `${dayPath}.civilDawn`, 'start');
      validateEv(collector, record.civilDusk, `${dayPath}.civilDusk`, 'end');

      // Navkarshi gap: exact sunrise + 2_880_000 ms, display gap exactly 2_880_000 ms
      const sunrise = record.sunrise as Ev | undefined;
      const navkarshi = record.navkarshi as Ev | undefined;
      if (
        isRecord(sunrise) &&
        isRecord(navkarshi) &&
        typeof sunrise.exactMs === 'number' &&
        typeof navkarshi.exactMs === 'number' &&
        typeof sunrise.displayMs === 'number' &&
        typeof navkarshi.displayMs === 'number'
      ) {
        if (
          navkarshi.exactMs - sunrise.exactMs !== NAVKARSHI_DIFF_MS ||
          navkarshi.displayMs - sunrise.displayMs !== NAVKARSHI_DIFF_MS
        ) {
          collector.add(
            `${dayPath}.navkarshi`,
            'navkarshi_gap',
            `Navkarshi must differ from sunrise by exactly 2880000 ms (48 min) at ${dayPath}`,
          );
        }
      }

      // solarNoonMs
      if (typeof record.solarNoonMs !== 'number') {
        collector.add(
          `${dayPath}.solarNoonMs`,
          'type',
          `solarNoonMs must be a number at ${dayPath}.solarNoonMs`,
        );
      } else if (!Number.isFinite(record.solarNoonMs) || !Number.isInteger(record.solarNoonMs)) {
        collector.add(
          `${dayPath}.solarNoonMs`,
          'not_integer',
          `solarNoonMs must be an integer at ${dayPath}.solarNoonMs`,
        );
      }

      // Within day ordering
      const sunset = record.sunset as Ev | undefined;
      const civilDawn = record.civilDawn as Ev | undefined;
      const civilDusk = record.civilDusk as Ev | undefined;
      const solarNoonMs = record.solarNoonMs as number | undefined;

      if (
        isRecord(sunrise) &&
        isRecord(civilDawn) &&
        typeof sunrise.exactMs === 'number' &&
        typeof civilDawn.exactMs === 'number'
      ) {
        if (civilDawn.exactMs > sunrise.exactMs) {
          collector.add(
            `${dayPath}.civilDawn`,
            'order',
            `civilDawn (${String(civilDawn.exactMs)}) must be <= sunrise (${String(sunrise.exactMs)}) at ${dayPath}`,
          );
        }
      }

      if (
        isRecord(sunrise) &&
        typeof solarNoonMs === 'number' &&
        typeof sunrise.exactMs === 'number'
      ) {
        if (sunrise.exactMs >= solarNoonMs) {
          collector.add(
            `${dayPath}.solarNoonMs`,
            'order',
            `sunrise (${String(sunrise.exactMs)}) must be < solarNoonMs (${String(solarNoonMs)}) at ${dayPath}`,
          );
        }
      }

      if (
        isRecord(sunset) &&
        typeof solarNoonMs === 'number' &&
        typeof sunset.exactMs === 'number'
      ) {
        if (solarNoonMs >= sunset.exactMs) {
          collector.add(
            `${dayPath}.sunset`,
            'order',
            `solarNoonMs (${String(solarNoonMs)}) must be < sunset (${String(sunset.exactMs)}) at ${dayPath}`,
          );
        }
      }

      if (
        isRecord(sunset) &&
        isRecord(civilDusk) &&
        typeof sunset.exactMs === 'number' &&
        typeof civilDusk.exactMs === 'number'
      ) {
        if (sunset.exactMs > civilDusk.exactMs) {
          collector.add(
            `${dayPath}.civilDusk`,
            'order',
            `sunset (${String(sunset.exactMs)}) must be <= civilDusk (${String(civilDusk.exactMs)}) at ${dayPath}`,
          );
        }
      }

      // Outside date checks
      if (startOfDayMs !== null && endOfDayMs !== null) {
        if (
          isRecord(sunrise) &&
          typeof sunrise.exactMs === 'number' &&
          (sunrise.exactMs < startOfDayMs || sunrise.exactMs >= endOfDayMs)
        ) {
          collector.add(
            `${dayPath}.sunrise`,
            'outside_date',
            `sunrise falls outside the IST date boundaries at ${dayPath}.sunrise`,
          );
        }
        if (
          isRecord(sunset) &&
          typeof sunset.exactMs === 'number' &&
          (sunset.exactMs < startOfDayMs || sunset.exactMs >= endOfDayMs)
        ) {
          collector.add(
            `${dayPath}.sunset`,
            'outside_date',
            `sunset falls outside the IST date boundaries at ${dayPath}.sunset`,
          );
        }
        if (
          typeof solarNoonMs === 'number' &&
          (solarNoonMs < startOfDayMs || solarNoonMs >= endOfDayMs)
        ) {
          collector.add(
            `${dayPath}.solarNoonMs`,
            'outside_date',
            `solarNoonMs falls outside the IST date boundaries at ${dayPath}.solarNoonMs`,
          );
        }
      }

      // Golden windows
      if (!isRecord(record.goldenMorning)) {
        collector.add(`${dayPath}.goldenMorning`, 'type', `goldenMorning must be an object`);
      } else {
        validateEv(
          collector,
          record.goldenMorning.start,
          `${dayPath}.goldenMorning.start`,
          'start',
        );
        validateEv(collector, record.goldenMorning.end, `${dayPath}.goldenMorning.end`, 'end');
        const gmStart = record.goldenMorning.start as Ev | undefined;
        const gmEnd = record.goldenMorning.end as Ev | undefined;
        if (
          isRecord(gmStart) &&
          isRecord(gmEnd) &&
          typeof gmStart.exactMs === 'number' &&
          typeof gmEnd.exactMs === 'number' &&
          gmStart.exactMs > gmEnd.exactMs
        ) {
          collector.add(
            `${dayPath}.goldenMorning`,
            'order',
            `goldenMorning start must be <= end at ${dayPath}.goldenMorning`,
          );
        }
      }

      if (!isRecord(record.goldenEvening)) {
        collector.add(`${dayPath}.goldenEvening`, 'type', `goldenEvening must be an object`);
      } else {
        validateEv(
          collector,
          record.goldenEvening.start,
          `${dayPath}.goldenEvening.start`,
          'start',
        );
        validateEv(collector, record.goldenEvening.end, `${dayPath}.goldenEvening.end`, 'end');
        const geStart = record.goldenEvening.start as Ev | undefined;
        const geEnd = record.goldenEvening.end as Ev | undefined;
        if (
          isRecord(geStart) &&
          isRecord(geEnd) &&
          typeof geStart.exactMs === 'number' &&
          typeof geEnd.exactMs === 'number' &&
          geStart.exactMs > geEnd.exactMs
        ) {
          collector.add(
            `${dayPath}.goldenEvening`,
            'order',
            `goldenEvening start must be <= end at ${dayPath}.goldenEvening`,
          );
        }
      }

      // moonPhaseAtNoon
      if (!isRecord(record.moonPhaseAtNoon)) {
        collector.add(`${dayPath}.moonPhaseAtNoon`, 'type', 'moonPhaseAtNoon must be an object');
      } else {
        const { phase, illumination } = record.moonPhaseAtNoon;
        if (typeof phase !== 'number' || !Number.isFinite(phase)) {
          collector.add(
            `${dayPath}.moonPhaseAtNoon.phase`,
            'type',
            'moonPhaseAtNoon.phase must be a number',
          );
        } else if (phase < 0 || phase >= 1) {
          collector.add(
            `${dayPath}.moonPhaseAtNoon.phase`,
            'range',
            'moonPhaseAtNoon.phase must be in [0, 1)',
          );
        }

        if (typeof illumination !== 'number' || !Number.isFinite(illumination)) {
          collector.add(
            `${dayPath}.moonPhaseAtNoon.illumination`,
            'type',
            'moonPhaseAtNoon.illumination must be a number',
          );
        } else if (illumination < 0 || illumination > 1) {
          collector.add(
            `${dayPath}.moonPhaseAtNoon.illumination`,
            'range',
            'moonPhaseAtNoon.illumination must be in [0, 1]',
          );
        }
      }
    }
  }

  // 6. moonEvents array
  if (input.moonEvents === undefined) {
    collector.add('moonEvents', 'missing', 'Missing moonEvents array');
  } else if (!Array.isArray(input.moonEvents)) {
    collector.add('moonEvents', 'type', 'moonEvents must be an array');
  } else if (input.moonEvents.length > 2000) {
    collector.add('moonEvents', 'range', 'moonEvents length cannot exceed 2000');
  } else {
    let prevDisplayMs: number | null = null;

    for (let i = 0; i < input.moonEvents.length; i++) {
      if (collector.isFull()) break;
      const mPath = `moonEvents[${String(i)}]`;
      const mEvent: unknown = (input.moonEvents as unknown[])[i];

      if (!isRecord(mEvent)) {
        collector.add(mPath, 'type', `Expected MoonEvent object at ${mPath}`);
        continue;
      }

      if (mEvent.kind !== 'rise' && mEvent.kind !== 'set') {
        collector.add(`${mPath}.kind`, 'range', `moonEvent kind must be rise or set at ${mPath}`);
      }

      const evKind = mEvent.kind === 'rise' ? 'start' : 'end';
      validateEv(collector, mEvent.ev, `${mPath}.ev`, evKind);

      const evObj = mEvent.ev as Ev | undefined;
      if (isRecord(evObj) && typeof evObj.displayMs === 'number') {
        if (prevDisplayMs !== null && evObj.displayMs < prevDisplayMs) {
          collector.add(
            `${mPath}.ev.displayMs`,
            'unsorted',
            `moonEvents must be sorted ascending by displayMs at ${mPath}`,
          );
        }
        prevDisplayMs = evObj.displayMs;
      }
    }
  }

  if (collector.issues.length > 0) {
    return err(collector.issues);
  }

  return ok(input as unknown as SnapshotV1);
}
