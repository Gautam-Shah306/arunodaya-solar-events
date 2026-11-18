import { describe, expect, it } from 'vitest';
import type { SnapshotLocation, SnapshotV1 } from '@arunodaya/contracts';
import { displayRound, formatCountdown, makeEvent } from '@arunodaya/engine';
import { buildHomeModel } from '../src/home/home-model.js';
import { handleMessage } from '../src/snapshot/request-handler.js';
import type { BuildRequest } from '../src/snapshot/worker-protocol.js';

const RAJKOT_LOCATION: SnapshotLocation = {
  lat: 22.3,
  lon: 70.8,
  label: 'Rajkot',
  source: 'manual',
  fixAtMs: 1763164800000,
};

function getSampleSnapshot(startIstDate = '2026-11-15', dayCount = 7): SnapshotV1 {
  const req: BuildRequest = {
    id: 1,
    type: 'build',
    location: RAJKOT_LOCATION,
    startIstDate,
    dayCount,
    generatedAtMs: 1763164800000,
  };
  const resp = handleMessage(req);
  if (!resp || !resp.ok) {
    throw new Error('Failed to generate sample snapshot');
  }
  return resp.snapshot;
}

describe('Home model (Part C2)', () => {
  const snapshot = getSampleSnapshot('2026-11-15', 7);
  // 2026-11-16: todayRecord
  const day16 = snapshot.days.find((d) => d.istDate === '2026-11-16')!;

  it('home model builds three event cards in sunrise navkarshi sunset order', () => {
    // 04:00 IST on 2026-11-16
    const nowMs = day16.sunrise.displayMs - 3 * 3600 * 1000;
    const res = buildHomeModel({
      snapshot,
      nowMs,
      clockFormat: '12h',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.events.length).toBe(3);
    expect(res.value.events[0].id).toBe('sunrise');
    expect(res.value.events[1].id).toBe('navkarshi');
    expect(res.value.events[2].id).toBe('sunset');
  });

  it('home model shows today times when every event is still ahead', () => {
    // 04:00 IST on 2026-11-16
    const nowMs = day16.sunrise.displayMs - 3 * 3600 * 1000;
    const res = buildHomeModel({
      snapshot,
      nowMs,
      clockFormat: '12h',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.events[0].isTomorrow).toBe(false);
    expect(res.value.events[1].isTomorrow).toBe(false);
    expect(res.value.events[2].isTomorrow).toBe(false);
  });

  it('home model targets tomorrow for sunrise after sunrise has passed', () => {
    // 10 minutes after sunrise on 2026-11-16 (before navkarshi)
    const nowMs = day16.sunrise.displayMs + 10 * 60 * 1000;
    const res = buildHomeModel({
      snapshot,
      nowMs,
      clockFormat: '12h',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.events[0].isTomorrow).toBe(true);
    expect(res.value.events[1].isTomorrow).toBe(false);
    expect(res.value.events[2].isTomorrow).toBe(false);
  });

  it('home model targets tomorrow for every event after sunset', () => {
    // 21:00 IST on 2026-11-16 (after sunset)
    const nowMs = day16.sunset.displayMs + 3 * 3600 * 1000;
    const res = buildHomeModel({
      snapshot,
      nowMs,
      clockFormat: '12h',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.events[0].isTomorrow).toBe(true);
    expect(res.value.events[1].isTomorrow).toBe(true);
    expect(res.value.events[2].isTomorrow).toBe(true);
  });

  it('home model navkarshi time is exactly 48 minutes after the sunrise time on screen', () => {
    // For every day in the snapshot, the displayed difference is exactly 48 minutes
    for (const day of snapshot.days) {
      const diffMs = day.navkarshi.displayMs - day.sunrise.displayMs;
      expect(diffMs).toBe(48 * 60 * 1000);
    }

    const nowMs = day16.sunrise.displayMs - 60 * 60 * 1000;
    const res = buildHomeModel({
      snapshot,
      nowMs,
      clockFormat: '24h',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const sunriseCard = res.value.events[0];
    const navkarshiCard = res.value.events[1];
    expect(navkarshiCard.displayMs - sunriseCard.displayMs).toBe(48 * 60 * 1000);
  });

  it('home model countdown minutes agree with the displayed target minute', () => {
    const nowMs = day16.sunrise.displayMs - 125 * 60 * 1000;
    const res = buildHomeModel({
      snapshot,
      nowMs,
      clockFormat: '12h',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    for (const card of res.value.events) {
      const expectedRem = Math.max(
        0,
        Math.floor(card.displayMs / 60000) - Math.floor(nowMs / 60000),
      );
      expect(card.remainingMinutes).toBe(expectedRem);
    }
  });

  it('home model progress comes from displayed instants and stays within 0 and 1', () => {
    const nowMs = day16.sunrise.displayMs + 20 * 60 * 1000;
    const res = buildHomeModel({
      snapshot,
      nowMs,
      clockFormat: '12h',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    for (const card of res.value.events) {
      expect(card.progress).toBeGreaterThanOrEqual(0);
      expect(card.progress).toBeLessThanOrEqual(1);
    }
  });

  it('home model soonest event is the one with the fewest remaining minutes', () => {
    // Before sunrise -> sunrise is soonest
    const earlyNow = day16.sunrise.displayMs - 30 * 60 * 1000;
    const resEarly = buildHomeModel({ snapshot, nowMs: earlyNow, clockFormat: '12h' });
    expect(resEarly.ok && resEarly.value.soonestId).toBe('sunrise');

    // After sunrise before navkarshi -> navkarshi is soonest
    const midNow = day16.sunrise.displayMs + 10 * 60 * 1000;
    const resMid = buildHomeModel({ snapshot, nowMs: midNow, clockFormat: '12h' });
    expect(resMid.ok && resMid.value.soonestId).toBe('navkarshi');

    // After navkarshi before sunset -> sunset is soonest
    const lateNow = day16.navkarshi.displayMs + 30 * 60 * 1000;
    const resLate = buildHomeModel({ snapshot, nowMs: lateNow, clockFormat: '12h' });
    expect(resLate.ok && resLate.value.soonestId).toBe('sunset');
  });

  it('home model greeting follows 04:00 noon the evening rule and sunset plus three hours', () => {
    // 03:59 -> night
    const t0359 = day16.sunrise.displayMs - 3 * 3600 * 1000 - 60000;
    const r0359 = buildHomeModel({ snapshot, nowMs: t0359, clockFormat: '12h' });
    expect(r0359.ok && r0359.value.greetingKey).toBe('night');

    // 04:00 -> morning
    const t0400 = day16.sunrise.displayMs - 3 * 3600 * 1000;
    const r0400 = buildHomeModel({ snapshot, nowMs: t0400, clockFormat: '12h' });
    expect(r0400.ok && r0400.value.greetingKey).toBe('morning');

    // 12:30 (approx solar noon) -> afternoon
    const tNoon = day16.solarNoonMs + 10 * 60 * 1000;
    const rNoon = buildHomeModel({ snapshot, nowMs: tNoon, clockFormat: '12h' });
    expect(rNoon.ok && rNoon.value.greetingKey).toBe('afternoon');

    // Evening start (17:00 IST) -> evening
    const tEvening = day16.sunset.displayMs - 30 * 60 * 1000;
    const rEvening = buildHomeModel({ snapshot, nowMs: tEvening, clockFormat: '12h' });
    expect(rEvening.ok && rEvening.value.greetingKey).toBe('evening');

    // Sunset + 3h 10m -> night
    const tNight = day16.sunset.displayMs + 190 * 60 * 1000;
    const rNight = buildHomeModel({ snapshot, nowMs: tNight, clockFormat: '12h' });
    expect(rNight.ok && rNight.value.greetingKey).toBe('night');
  });

  it('home model day and night follow the displayed sunrise and sunset minutes', () => {
    // 1 minute before sunrise display -> night
    const preSunrise = day16.sunrise.displayMs - 60 * 1000;
    const rPre = buildHomeModel({ snapshot, nowMs: preSunrise, clockFormat: '12h' });
    expect(rPre.ok && rPre.value.dayNightState).toBe('night');

    // At sunrise display -> day
    const atSunrise = day16.sunrise.displayMs;
    const rSun = buildHomeModel({ snapshot, nowMs: atSunrise, clockFormat: '12h' });
    expect(rSun.ok && rSun.value.dayNightState).toBe('day');

    // At sunset display -> night
    const atSunset = day16.sunset.displayMs;
    const rSet = buildHomeModel({ snapshot, nowMs: atSunset, clockFormat: '12h' });
    expect(rSet.ok && rSet.value.dayNightState).toBe('night');
  });

  it('home model solar arc fraction is null at night and between 0 and 1 by day', () => {
    // Night
    const nightMs = day16.sunrise.displayMs - 60 * 1000;
    const rNight = buildHomeModel({ snapshot, nowMs: nightMs, clockFormat: '12h' });
    expect(rNight.ok && rNight.value.arc.fraction).toBeNull();

    // Day
    const dayMs = day16.sunrise.displayMs + 60 * 60 * 1000;
    const rDay = buildHomeModel({ snapshot, nowMs: dayMs, clockFormat: '12h' });
    expect(rDay.ok).toBe(true);
    if (!rDay.ok) return;
    expect(rDay.value.arc.fraction).not.toBeNull();
    expect(rDay.value.arc.fraction!).toBeGreaterThanOrEqual(0);
    expect(rDay.value.arc.fraction!).toBeLessThanOrEqual(1);
  });

  it('home model solar arc fraction is 0 at sunrise and approaches 1 at sunset', () => {
    const atSunrise = day16.sunrise.displayMs;
    const rRise = buildHomeModel({ snapshot, nowMs: atSunrise, clockFormat: '12h' });
    expect(rRise.ok).toBe(true);
    if (!rRise.ok) return;
    expect(rRise.value.arc.fraction).toBe(0);

    const nearSunset = day16.sunset.displayMs - 60 * 1000;
    const rSet = buildHomeModel({ snapshot, nowMs: nearSunset, clockFormat: '12h' });
    expect(rSet.ok).toBe(true);
    if (!rSet.ok) return;
    expect(rSet.value.arc.fraction!).toBeGreaterThan(0.98);
    expect(rSet.value.arc.fraction!).toBeLessThan(1);
  });

  it('home model daylight text is computed from the displayed sunrise and sunset', () => {
    const nowMs = day16.sunrise.displayMs;
    const res = buildHomeModel({ snapshot, nowMs, clockFormat: '12h' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const expectedMinutes = Math.floor((day16.sunset.displayMs - day16.sunrise.displayMs) / 60000);
    expect(res.value.day.daylightMinutes).toBe(expectedMinutes);
    expect(res.value.day.daylightText).toBe(formatCountdown(expectedMinutes));
  });

  it('home model formats times in 12-hour and 24-hour modes', () => {
    const nowMs = day16.sunrise.displayMs;
    const r12 = buildHomeModel({ snapshot, nowMs, clockFormat: '12h' });
    const r24 = buildHomeModel({ snapshot, nowMs, clockFormat: '24h' });

    expect(r12.ok && r12.value.events[0].timeText).toMatch(/(AM|PM)$/);
    expect(r24.ok && r24.value.events[0].timeText).toMatch(/^\d{2}:\d{2}$/);
  });

  it('home model solar noon uses nearest minute rounding and twilight and golden hours use displayed instants', () => {
    const nowMs = day16.sunrise.displayMs;
    const res = buildHomeModel({ snapshot, nowMs, clockFormat: '24h' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const expectedNoonMs = displayRound('nearest', day16.solarNoonMs);
    expect(res.value.day.solarNoonMs).toBe(expectedNoonMs);
    expect(res.value.day.civilDawnMs).toBe(day16.civilDawn.displayMs);
    expect(res.value.day.civilDuskMs).toBe(day16.civilDusk.displayMs);
  });

  it('home model reports no moonrise today when the day has no rise event', () => {
    // Clone snapshot without moonrise for day16
    const customSnapshot: SnapshotV1 = {
      ...snapshot,
      moonEvents: snapshot.moonEvents.filter(
        (m) =>
          !(
            m.kind === 'rise' &&
            m.ev.displayMs >= day16.sunrise.displayMs - 12 * 3600 * 1000 &&
            m.ev.displayMs <= day16.sunset.displayMs + 12 * 3600 * 1000
          ),
      ),
    };
    const nowMs = day16.sunrise.displayMs;
    const res = buildHomeModel({ snapshot: customSnapshot, nowMs, clockFormat: '12h' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.moon.rise).toBeNull();
  });

  it('home model shows the moonset of the next day with a plus one note when today has a rise but no set', () => {
    // Snapshot with a rise today, no set today, but a set tomorrow
    const riseMs = day16.sunrise.displayMs + 2 * 3600 * 1000;
    const tomorrowSetMs = riseMs + 20 * 3600 * 1000; // on next day
    const customSnapshot: SnapshotV1 = {
      ...snapshot,
      moonEvents: [
        { kind: 'rise', ev: makeEvent('start', riseMs) },
        { kind: 'set', ev: makeEvent('end', tomorrowSetMs) },
      ],
    };
    const nowMs = day16.sunrise.displayMs;
    const res = buildHomeModel({ snapshot: customSnapshot, nowMs, clockFormat: '12h' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.moon.set).not.toBeNull();
    expect(res.value.moon.set?.note).toBe('+1');
    expect(res.value.moon.set?.timeText).toContain('(+1)');
  });

  it('home model lists today moonrise and moonset in IST', () => {
    const nowMs = day16.sunrise.displayMs;
    const res = buildHomeModel({ snapshot, nowMs, clockFormat: '24h' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    if (res.value.moon.rise) {
      expect(res.value.moon.rise.timeText).toMatch(/^\d{2}:\d{2}$/);
    }
    if (res.value.moon.set) {
      expect(res.value.moon.set.timeText).toMatch(/^\d{2}:\d{2}/);
    }
  });

  it('home model next moonrise is ready with a day label when it is not today', () => {
    // Set time after today's moonrise so next moonrise is tomorrow
    const todayRise = snapshot.moonEvents.find(
      (m) => m.kind === 'rise' && m.ev.displayMs >= day16.sunrise.displayMs - 12 * 3600 * 1000,
    );
    const nowMs = todayRise ? todayRise.ev.displayMs + 60 * 1000 : day16.sunset.displayMs;
    const res = buildHomeModel({ snapshot, nowMs, clockFormat: '12h' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    if (res.value.moon.nextRise.status === 'ready') {
      expect(res.value.moon.nextRise.dayLabel).not.toBe('Today');
    }
  });

  it('home model next moonrise is unavailable when the snapshot has no later moonrise', () => {
    const customSnapshot: SnapshotV1 = {
      ...snapshot,
      moonEvents: snapshot.moonEvents.filter((m) => m.kind !== 'rise'),
    };
    const nowMs = day16.sunrise.displayMs;
    const res = buildHomeModel({ snapshot: customSnapshot, nowMs, clockFormat: '12h' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.moon.nextRise.status).toBe('unavailable');
  });

  it('home model rounds illumination to a whole percent and names the phase', () => {
    const nowMs = day16.sunrise.displayMs;
    const res = buildHomeModel({ snapshot, nowMs, clockFormat: '12h' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(Number.isInteger(res.value.moon.illuminationPercent)).toBe(true);
    expect(res.value.moon.illuminationPercent).toBeGreaterThanOrEqual(0);
    expect(res.value.moon.illuminationPercent).toBeLessThanOrEqual(100);
    expect(res.value.moon.phaseName.length).toBeGreaterThan(0);
  });

  it('home model reports the approximate accuracy tier after 2035', () => {
    // 2036-05-01
    const snapshot2036 = getSampleSnapshot('2036-04-30', 5);
    const day2036 = snapshot2036.days.find((d) => d.istDate === '2036-05-01')!;
    const nowMs = day2036.sunrise.displayMs;

    const res = buildHomeModel({ snapshot: snapshot2036, nowMs, clockFormat: '12h' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.accuracyTier).toBe('approximate');
    expect(res.value.isApproximate).toBe(true);
  });

  it('home model reports no_day_record when the snapshot does not cover today', () => {
    // snapshot covers 2026-11-15..2026-11-21, test for 2026-12-01
    const nowMs = Date.UTC(2026, 11, 1, 6, 0, 0); // 2026-12-01
    const res = buildHomeModel({ snapshot, nowMs, clockFormat: '12h' });
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.error.code).toBe('no_day_record');
  });

  it('home model reports a horizon error when the snapshot runs out', () => {
    // Snapshot with 1 day, query after that day's sunset
    const singleDaySnapshot = getSampleSnapshot('2026-11-15', 1);
    const day = singleDaySnapshot.days[0];
    if (!day) {
      throw new Error('Expected at least 1 day in singleDaySnapshot');
    }
    const afterSunset = day.sunset.displayMs + 2 * 3600 * 1000;

    const res = buildHomeModel({
      snapshot: singleDaySnapshot,
      nowMs: afterSunset,
      clockFormat: '12h',
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.error.code).toBe('horizon');
  });

  it('home model handles edge cases: invalid nowMs, unsupported year, days[0] before sunrise, custom label, and distant next moonrise', () => {
    expect(() => buildHomeModel({ snapshot, nowMs: Number.NaN, clockFormat: '12h' })).toThrow(
      RangeError,
    );

    // Unsupported year (1999)
    const year1999Ms = Date.UTC(1999, 5, 1, 6, 0, 0);
    const res1999 = buildHomeModel({ snapshot, nowMs: year1999Ms, clockFormat: '12h' });
    expect(res1999.ok).toBe(false);
    if (!res1999.ok) {
      expect(res1999.error.code).toBe('no_day_record');
    }

    // days[0] before sunrise (horizon_before_start falls back to progress 0)
    const day0 = snapshot.days[0];
    if (!day0) throw new Error('expected day0');
    const beforeDay0Sunrise = day0.sunrise.displayMs - 60 * 60 * 1000;
    const resDay0 = buildHomeModel({
      snapshot,
      nowMs: beforeDay0Sunrise,
      clockFormat: '12h',
      locationLabel: '  Custom Place  ',
    });
    expect(resDay0.ok).toBe(true);
    if (resDay0.ok) {
      expect(resDay0.value.locationLabel).toBe('Custom Place');
      expect(resDay0.value.events[0].progress).toBe(0);
    }

    // Distant next moonrise (2+ days ahead -> short date label) and today rise with no subsequent set
    const todayRiseMs = day16.sunrise.displayMs + 60 * 60 * 1000;
    const farMoonriseMs = day16.sunrise.displayMs + 3 * 86400 * 1000;
    const customMoonSnap: SnapshotV1 = {
      ...snapshot,
      moonEvents: [
        { kind: 'rise', ev: makeEvent('start', todayRiseMs - 86400 * 1000) },
        { kind: 'rise', ev: makeEvent('start', todayRiseMs) },
        { kind: 'rise', ev: makeEvent('start', farMoonriseMs) },
      ],
    };
    const resDistant = buildHomeModel({
      snapshot: customMoonSnap,
      nowMs: todayRiseMs + 60 * 1000,
      clockFormat: '24h',
    });
    expect(resDistant.ok).toBe(true);
    if (resDistant.ok) {
      expect(resDistant.value.moon.set).toBeNull();
      expect(resDistant.value.moon.nextRise.status).toBe('ready');
      if (resDistant.value.moon.nextRise.status === 'ready') {
        expect(resDistant.value.moon.nextRise.dayLabel).not.toBe('Today');
        expect(resDistant.value.moon.nextRise.dayLabel).not.toBe('Tomorrow');
      }
    }
  });
});
