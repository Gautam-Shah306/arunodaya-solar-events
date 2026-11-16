import { istDayEndMs, istDayStartMs } from './ist-day.mjs';

const SINGLE_EVENT_KINDS = [
  'sunrise',
  'sunset',
  'solarNoon',
  'civilDawn',
  'civilDusk',
  'sun6Morning',
  'sun6Evening',
];

/**
 * Validates astronomical reference dataset against Arunodaya reference specification.
 * Pure integer arithmetic for IST day boundaries; no local-time APIs.
 *
 * @param {any} data
 * @returns {{ ok: boolean, issues: Array<{ path: string, message: string }> }}
 */
export function validateReferenceDataset(data) {
  /** @type {Array<{ path: string, message: string }>} */
  const issues = [];

  /**
   * @param {string} p
   * @param {string} message
   */
  function addIssue(p, message) {
    issues.push({ path: p, message });
  }

  if (!data || typeof data !== 'object') {
    addIssue('$', 'Dataset must be an object');
    return { ok: false, issues };
  }

  // 1. Meta validation
  if (!data.meta || typeof data.meta !== 'object') {
    addIssue('meta', 'meta must be an object');
  } else {
    const meta = data.meta;
    if (meta.schemaVersion !== 1) {
      addIssue('meta.schemaVersion', 'schemaVersion must be 1');
    }
    if (meta.primary !== 'skyfield' && meta.primary !== 'ephem') {
      addIssue('meta.primary', 'primary must be either "skyfield" or "ephem"');
    }
    if (!meta.generator || typeof meta.generator !== 'object') {
      addIssue('meta.generator', 'generator must be an object');
    }
    if (!meta.conventions) {
      addIssue('meta.conventions', 'conventions must be present');
    }
    if (typeof meta.imageDigest !== 'string' || !meta.imageDigest) {
      addIssue('meta.imageDigest', 'imageDigest must be a non-empty string');
    }
    if (typeof meta.cityCount !== 'number') {
      addIssue('meta.cityCount', 'cityCount must be a number');
    }
    if (typeof meta.dayCount !== 'number') {
      addIssue('meta.dayCount', 'dayCount must be a number');
    }
    if (typeof meta.decisionDayCount !== 'number') {
      addIssue('meta.decisionDayCount', 'decisionDayCount must be a number');
    }
    if (typeof meta.extendedDayCount !== 'number') {
      addIssue('meta.extendedDayCount', 'extendedDayCount must be a number');
    }
    if (meta.crossCheck === undefined) {
      addIssue('meta.crossCheck', 'crossCheck must be present (object or null)');
    } else if (meta.crossCheck === null && !meta.crossCheckReason) {
      addIssue(
        'meta.crossCheckReason',
        'crossCheckReason must be provided when crossCheck is null',
      );
    }
  }

  // 2. Cities validation
  const cityOrderMap = new Map();
  const knownCityIds = new Set();
  const coreCityIds = new Set();

  if (!Array.isArray(data.cities)) {
    addIssue('cities', 'cities must be an array');
  } else {
    data.cities.forEach((/** @type {any} */ city, /** @type {number} */ index) => {
      const cityPath = `cities[${index}]`;
      if (!city || typeof city !== 'object') {
        addIssue(cityPath, 'City must be an object');
        return;
      }
      if (!city.id || typeof city.id !== 'string') {
        addIssue(`${cityPath}.id`, 'City id must be a string');
      } else if (knownCityIds.has(city.id)) {
        addIssue(`${cityPath}.id`, `Duplicate city id: ${city.id}`);
      } else {
        cityOrderMap.set(city.id, index);
        knownCityIds.add(city.id);
        if (city.role === 'core') {
          coreCityIds.add(city.id);
        }
      }

      if (typeof city.lat !== 'number' || Number.isNaN(city.lat)) {
        addIssue(`${cityPath}.lat`, 'lat must be a valid number');
      }
      if (typeof city.lon !== 'number' || Number.isNaN(city.lon)) {
        addIssue(`${cityPath}.lon`, 'lon must be a valid number');
      }
      if (typeof city.elevationM !== 'number') {
        addIssue(`${cityPath}.elevationM`, 'elevationM must be a number');
      }
      if (city.role !== 'core' && city.role !== 'sample') {
        addIssue(`${cityPath}.role`, 'role must be "core" or "sample"');
      }
    });

    if (data.meta && typeof data.meta.cityCount === 'number') {
      if (data.meta.cityCount !== data.cities.length) {
        addIssue(
          'meta.cityCount',
          `meta.cityCount (${data.meta.cityCount}) does not match cities array length (${data.cities.length})`,
        );
      }
    }
  }

  // 3. Days validation
  if (!Array.isArray(data.days)) {
    addIssue('days', 'days must be an array');
  } else {
    let decisionCount = 0;
    let extendedCount = 0;
    let prevCityOrder = -1;
    let prevDate = '';

    const coreCityDates = new Map();
    for (const coreId of coreCityIds) {
      coreCityDates.set(coreId, new Set());
    }

    data.days.forEach((/** @type {any} */ day, /** @type {number} */ index) => {
      const dayPath = `days[${index}]`;
      if (!day || typeof day !== 'object') {
        addIssue(dayPath, 'Day record must be an object');
        return;
      }

      // City validation
      if (!day.c || typeof day.c !== 'string') {
        addIssue(`${dayPath}.c`, 'c (city id) must be a non-empty string');
      } else if (!knownCityIds.has(day.c)) {
        addIssue(`${dayPath}.c`, `Unknown city id: ${day.c}`);
      }

      // Date validation
      if (!day.d || typeof day.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.d)) {
        addIssue(`${dayPath}.d`, 'd (date) must be in YYYY-MM-DD format');
      }

      // Tag validation
      if (day.s !== 'decision' && day.s !== 'extended') {
        addIssue(`${dayPath}.s`, 's (set) must be either "decision" or "extended"');
      } else if (day.s === 'decision') {
        decisionCount++;
      } else if (day.s === 'extended') {
        extendedCount++;
      }

      // Sorting validation: sorted by city order then date
      const currentCityOrder = cityOrderMap.get(day.c) ?? -1;
      if (currentCityOrder < prevCityOrder) {
        addIssue(
          `${dayPath}`,
          `Days not sorted by city order: ${day.c} appeared after a later city`,
        );
      } else if (currentCityOrder === prevCityOrder) {
        if (day.d <= prevDate) {
          addIssue(
            `${dayPath}.d`,
            `Days within city ${day.c} not sorted ascending by date: ${day.d} <= ${prevDate}`,
          );
        }
      }
      prevCityOrder = currentCityOrder;
      prevDate = day.d;

      // Track dates for core cities
      if (coreCityDates.has(day.c) && day.d) {
        coreCityDates.get(day.c).add(day.d);
      }

      // Events inside IST day validation
      if (day.d && /^\d{4}-\d{2}-\d{2}$/.test(day.d)) {
        let dayStart;
        let dayEnd;
        try {
          dayStart = istDayStartMs(day.d);
          dayEnd = istDayEndMs(day.d);
        } catch {
          addIssue(`${dayPath}.d`, `Invalid civil date values: ${day.d}`);
          return;
        }

        // Single events
        for (const kind of SINGLE_EVENT_KINDS) {
          const val = day[kind];
          if (val !== null && val !== undefined) {
            if (typeof val !== 'number' || !Number.isInteger(val)) {
              addIssue(`${dayPath}.${kind}`, `${kind} must be an integer epoch ms or null`);
            } else if (val < dayStart || val >= dayEnd) {
              addIssue(
                `${dayPath}.${kind}`,
                `${kind} (${val}) lies outside its IST day [${dayStart}, ${dayEnd})`,
              );
            }
          }
        }

        // Moon events (must be arrays)
        for (const kind of ['moonrise', 'moonset']) {
          const arr = day[kind];
          if (!Array.isArray(arr)) {
            addIssue(`${dayPath}.${kind}`, `${kind} must be an array of epoch ms`);
          } else {
            let prevEvent = -1;
            arr.forEach((mVal, mIdx) => {
              if (typeof mVal !== 'number' || !Number.isInteger(mVal)) {
                addIssue(`${dayPath}.${kind}[${mIdx}]`, `${kind} item must be an integer epoch ms`);
              } else {
                if (mVal < dayStart || mVal >= dayEnd) {
                  addIssue(
                    `${dayPath}.${kind}[${mIdx}]`,
                    `${kind} (${mVal}) lies outside its IST day [${dayStart}, ${dayEnd})`,
                  );
                }
                if (mVal <= prevEvent) {
                  addIssue(`${dayPath}.${kind}[${mIdx}]`, `${kind} array must be ascending`);
                }
                prevEvent = mVal;
              }
            });
          }
        }

        // Moon phase validation
        if (!day.moonPhase || typeof day.moonPhase !== 'object') {
          addIssue(`${dayPath}.moonPhase`, 'moonPhase must be an object');
        } else {
          const { fraction, illumination } = day.moonPhase;
          if (
            typeof fraction !== 'number' ||
            Number.isNaN(fraction) ||
            fraction < 0 ||
            fraction >= 1
          ) {
            addIssue(
              `${dayPath}.moonPhase.fraction`,
              `moonPhase.fraction (${fraction}) must be a number in [0, 1)`,
            );
          }
          if (
            typeof illumination !== 'number' ||
            Number.isNaN(illumination) ||
            illumination < 0 ||
            illumination > 1
          ) {
            addIssue(
              `${dayPath}.moonPhase.illumination`,
              `moonPhase.illumination (${illumination}) must be a number in [0, 1]`,
            );
          }
        }
      }
    });

    // Check counts matching meta
    if (data.meta) {
      if (typeof data.meta.dayCount === 'number' && data.meta.dayCount !== data.days.length) {
        addIssue(
          'meta.dayCount',
          `meta.dayCount (${data.meta.dayCount}) does not match days array length (${data.days.length})`,
        );
      }
      if (
        typeof data.meta.decisionDayCount === 'number' &&
        data.meta.decisionDayCount !== decisionCount
      ) {
        addIssue(
          'meta.decisionDayCount',
          `meta.decisionDayCount (${data.meta.decisionDayCount}) does not match decision day count (${decisionCount})`,
        );
      }
      if (
        typeof data.meta.extendedDayCount === 'number' &&
        data.meta.extendedDayCount !== extendedCount
      ) {
        addIssue(
          'meta.extendedDayCount',
          `meta.extendedDayCount (${data.meta.extendedDayCount}) does not match extended day count (${extendedCount})`,
        );
      }

      // Check completeness for full reference dataset (when dayCount >= 2000)
      if (data.days.length >= 2000) {
        for (const [coreId, dateSet] of coreCityDates.entries()) {
          // Check 2026 completeness
          if (dateSet.size < 365) {
            addIssue(
              `days.${coreId}`,
              `Core city ${coreId} has only ${dateSet.size} dates (expected >= 365)`,
            );
          }
        }
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
