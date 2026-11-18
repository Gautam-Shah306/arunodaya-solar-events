import { err, ok, type Ev, type Result, type SnapshotV1 } from '@arunodaya/contracts';
import {
  accuracyTier,
  buildOccurrenceSeries,
  dayNight,
  displayRound,
  findDay,
  formatCountdown,
  getCountdownTargets,
  istParts,
  livePhase,
  MS_PER_MINUTE,
  nextOccurrence,
  remainingMinutes,
  selectGreeting,
  type AccuracyTier,
  type CountdownState,
  type DayNightState,
  type Greeting,
  type MoonPhaseKey,
} from '@arunodaya/engine';
import {
  formatDateLong,
  formatShortDateLabel,
  formatTimeDisplay,
  greetingText,
  moonPhaseLabel,
  t,
} from '../i18n/index.js';

export interface EventCardModel {
  readonly id: 'sunrise' | 'navkarshi' | 'sunset';
  readonly name: string;
  readonly timeText: string;
  readonly isTomorrow: boolean;
  readonly remainingMinutes: number;
  readonly progress: number;
  readonly displayMs: number;
  readonly exactMs: number;
  readonly rule: 'start' | 'end';
}

export interface DayDetailsModel {
  readonly daylightText: string;
  readonly daylightMinutes: number;
  readonly solarNoonText: string;
  readonly solarNoonMs: number;
  readonly civilDawnText: string;
  readonly civilDawnMs: number;
  readonly civilDuskText: string;
  readonly civilDuskMs: number;
  readonly goldenMorning: {
    readonly startText: string;
    readonly endText: string;
  };
  readonly goldenEvening: {
    readonly startText: string;
    readonly endText: string;
  };
}

export interface MoonTimeItem {
  readonly timeText: string;
  readonly displayMs: number;
  readonly isNextDay?: boolean;
  readonly note?: string;
}

export type NextMoonriseModel =
  | {
      readonly status: 'ready';
      readonly timeText: string;
      readonly dayLabel: string;
      readonly remainingMinutes: number;
      readonly progress: number;
      readonly displayMs: number;
    }
  | {
      readonly status: 'unavailable';
    };

export interface MoonCardModel {
  readonly phaseKey: MoonPhaseKey;
  readonly phaseName: string;
  readonly fraction: number;
  readonly illuminationPercent: number;
  readonly source: 'interpolated' | 'day_record';
  readonly isApproximate: boolean;
  readonly rise: MoonTimeItem | null;
  readonly set: MoonTimeItem | null;
  readonly nextRise: NextMoonriseModel;
}

export interface SolarArcModel {
  readonly fraction: number | null;
  readonly dayNightState: DayNightState;
  readonly sunriseDisplayMs: number;
  readonly sunsetDisplayMs: number;
}

export interface HomeModel {
  readonly dateLongLabel: string;
  readonly dateShortLabel: string;
  readonly greetingKey: Greeting;
  readonly greetingText: string;
  readonly locationLabel: string;
  readonly clockTimeText: string;
  readonly dayNightState: DayNightState;
  readonly events: readonly [EventCardModel, EventCardModel, EventCardModel];
  readonly soonestId: 'sunrise' | 'navkarshi' | 'sunset';
  readonly arc: SolarArcModel;
  readonly day: DayDetailsModel;
  readonly moon: MoonCardModel;
  readonly accuracyTier: AccuracyTier;
  readonly isApproximate: boolean;
}

export interface HomeModelError {
  readonly code: 'no_day_record' | 'horizon';
  readonly message: string;
}

export interface BuildHomeModelParams {
  readonly snapshot: SnapshotV1;
  readonly nowMs: number;
  readonly clockFormat: '12h' | '24h';
  readonly locationLabel?: string;
}

function resolveTarget(
  state: CountdownState,
  series: readonly Ev[],
  nowMs: number,
): { readonly next: Ev; readonly remainingMinutes: number; readonly progress: number } | null {
  if (state.status === 'ready') {
    return {
      next: state.next,
      remainingMinutes: state.remainingMinutes,
      progress: state.progress,
    };
  }
  if (state.status === 'horizon_before_start') {
    const nextRes = nextOccurrence(nowMs, series);
    if (!nextRes.ok) {
      return null;
    }
    return {
      next: nextRes.value,
      remainingMinutes: remainingMinutes(nowMs, nextRes.value.displayMs),
      progress: 0,
    };
  }
  return null;
}

/**
 * Builds the complete pure view-model for the Home screen.
 */
export function buildHomeModel(params: BuildHomeModelParams): Result<HomeModel, HomeModelError> {
  const { snapshot, nowMs, clockFormat, locationLabel } = params;

  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs) || !Number.isInteger(nowMs)) {
    throw new RangeError(`nowMs must be a finite integer, got: ${String(nowMs)}`);
  }

  const parts = istParts(nowMs);
  const todayIstDate = parts.istDate;
  const tier = accuracyTier(todayIstDate);

  if (tier === 'unsupported') {
    return err({
      code: 'no_day_record',
      message: `Date ${todayIstDate} is outside the supported astronomical range`,
    });
  }

  const todayRecord = findDay(snapshot, todayIstDate);
  if (!todayRecord) {
    return err({
      code: 'no_day_record',
      message: `No astronomical day record found for ${todayIstDate}`,
    });
  }

  const series = buildOccurrenceSeries(snapshot);
  const targets = getCountdownTargets(snapshot, nowMs);

  const sunriseResolved = resolveTarget(targets.sunrise, series.sunrise, nowMs);
  const navkarshiResolved = resolveTarget(targets.navkarshi, series.navkarshi, nowMs);
  const sunsetResolved = resolveTarget(targets.sunset, series.sunset, nowMs);

  if (!sunriseResolved || !navkarshiResolved || !sunsetResolved) {
    return err({
      code: 'horizon',
      message: 'Countdown horizon exhausted in snapshot',
    });
  }

  const sunriseTarget = sunriseResolved.next;
  const navkarshiTarget = navkarshiResolved.next;
  const sunsetTarget = sunsetResolved.next;

  const sunriseCard: EventCardModel = {
    id: 'sunrise',
    name: t('events.sunrise'),
    timeText: formatTimeDisplay(sunriseTarget.displayMs, clockFormat),
    isTomorrow: istParts(sunriseTarget.displayMs).istDate !== todayIstDate,
    remainingMinutes: sunriseResolved.remainingMinutes,
    progress: sunriseResolved.progress,
    displayMs: sunriseTarget.displayMs,
    exactMs: sunriseTarget.exactMs,
    rule: 'start',
  };

  const navkarshiCard: EventCardModel = {
    id: 'navkarshi',
    name: t('events.navkarshi'),
    timeText: formatTimeDisplay(navkarshiTarget.displayMs, clockFormat),
    isTomorrow: istParts(navkarshiTarget.displayMs).istDate !== todayIstDate,
    remainingMinutes: navkarshiResolved.remainingMinutes,
    progress: navkarshiResolved.progress,
    displayMs: navkarshiTarget.displayMs,
    exactMs: navkarshiTarget.exactMs,
    rule: 'start',
  };

  const sunsetCard: EventCardModel = {
    id: 'sunset',
    name: t('events.sunset'),
    timeText: formatTimeDisplay(sunsetTarget.displayMs, clockFormat),
    isTomorrow: istParts(sunsetTarget.displayMs).istDate !== todayIstDate,
    remainingMinutes: sunsetResolved.remainingMinutes,
    progress: sunsetResolved.progress,
    displayMs: sunsetTarget.displayMs,
    exactMs: sunsetTarget.exactMs,
    rule: 'end',
  };

  const events: readonly [EventCardModel, EventCardModel, EventCardModel] = [
    sunriseCard,
    navkarshiCard,
    sunsetCard,
  ];

  let soonestId: 'sunrise' | 'navkarshi' | 'sunset' = 'sunrise';
  let minMinutes = sunriseCard.remainingMinutes;

  if (navkarshiCard.remainingMinutes < minMinutes) {
    minMinutes = navkarshiCard.remainingMinutes;
    soonestId = 'navkarshi';
  }
  if (sunsetCard.remainingMinutes < minMinutes) {
    soonestId = 'sunset';
  }

  const dayNightState = dayNight(nowMs, {
    sunriseDisplayMs: todayRecord.sunrise.displayMs,
    sunsetDisplayMs: todayRecord.sunset.displayMs,
  });

  let arcFraction: number | null = null;
  if (dayNightState === 'day') {
    const totalDaylightMs = todayRecord.sunset.displayMs - todayRecord.sunrise.displayMs;
    if (totalDaylightMs > 0) {
      const elapsed = nowMs - todayRecord.sunrise.displayMs;
      arcFraction = Math.max(0, Math.min(1, elapsed / totalDaylightMs));
    } else {
      arcFraction = 0;
    }
  }

  const arc: SolarArcModel = {
    fraction: arcFraction,
    dayNightState,
    sunriseDisplayMs: todayRecord.sunrise.displayMs,
    sunsetDisplayMs: todayRecord.sunset.displayMs,
  };

  const greetingKey = selectGreeting(nowMs, {
    solarNoonMs: todayRecord.solarNoonMs,
    sunsetMs: todayRecord.sunset.displayMs,
  });

  const daylightMinutes = Math.floor(
    (todayRecord.sunset.displayMs - todayRecord.sunrise.displayMs) / MS_PER_MINUTE,
  );
  const daylightText = formatCountdown(daylightMinutes);

  const solarNoonRoundedMs = displayRound('nearest', todayRecord.solarNoonMs);

  const day: DayDetailsModel = {
    daylightText,
    daylightMinutes,
    solarNoonText: formatTimeDisplay(solarNoonRoundedMs, clockFormat),
    solarNoonMs: solarNoonRoundedMs,
    civilDawnText: formatTimeDisplay(todayRecord.civilDawn.displayMs, clockFormat),
    civilDawnMs: todayRecord.civilDawn.displayMs,
    civilDuskText: formatTimeDisplay(todayRecord.civilDusk.displayMs, clockFormat),
    civilDuskMs: todayRecord.civilDusk.displayMs,
    goldenMorning: {
      startText: formatTimeDisplay(todayRecord.goldenMorning.start.displayMs, clockFormat),
      endText: formatTimeDisplay(todayRecord.goldenMorning.end.displayMs, clockFormat),
    },
    goldenEvening: {
      startText: formatTimeDisplay(todayRecord.goldenEvening.start.displayMs, clockFormat),
      endText: formatTimeDisplay(todayRecord.goldenEvening.end.displayMs, clockFormat),
    },
  };

  const liveMoon = livePhase(snapshot, nowMs);
  const phaseKey = liveMoon.phaseKey;
  const phaseName = moonPhaseLabel(phaseKey);
  const illuminationPercent = Math.round(liveMoon.illumination * 100);

  // Lunar rise & set attributed to today
  const todayRise = snapshot.moonEvents.find(
    (m) => m.kind === 'rise' && istParts(m.ev.displayMs).istDate === todayIstDate,
  );
  const todaySet = snapshot.moonEvents.find(
    (m) => m.kind === 'set' && istParts(m.ev.displayMs).istDate === todayIstDate,
  );

  let rise: MoonTimeItem | null = null;
  if (todayRise) {
    rise = {
      timeText: formatTimeDisplay(todayRise.ev.displayMs, clockFormat),
      displayMs: todayRise.ev.displayMs,
    };
  }

  let set: MoonTimeItem | null = null;
  if (todaySet) {
    set = {
      timeText: formatTimeDisplay(todaySet.ev.displayMs, clockFormat),
      displayMs: todaySet.ev.displayMs,
    };
  } else if (todayRise) {
    // If today has a rise but no set today, look for the first moonset after today's rise
    const nextSet = snapshot.moonEvents.find(
      (m) => m.kind === 'set' && m.ev.displayMs > todayRise.ev.displayMs,
    );
    if (nextSet) {
      set = {
        timeText: `${formatTimeDisplay(nextSet.ev.displayMs, clockFormat)} (+1)`,
        displayMs: nextSet.ev.displayMs,
        isNextDay: true,
        note: '+1',
      };
    }
  }

  let nextRise: NextMoonriseModel;
  if (targets.moonrise.status === 'ready') {
    const nextEv = targets.moonrise.next;
    const nextDate = istParts(nextEv.displayMs).istDate;
    let dayLabel = t('time.today');
    if (nextDate !== todayIstDate) {
      const tomorrowDate = istParts(nowMs + 86_400_000).istDate;
      if (nextDate === tomorrowDate) {
        dayLabel = t('time.tomorrow');
      } else {
        dayLabel = formatShortDateLabel(nextEv.displayMs);
      }
    }
    nextRise = {
      status: 'ready',
      timeText: formatTimeDisplay(nextEv.displayMs, clockFormat),
      dayLabel,
      remainingMinutes: targets.moonrise.remainingMinutes,
      progress: targets.moonrise.progress,
      displayMs: nextEv.displayMs,
    };
  } else {
    nextRise = { status: 'unavailable' };
  }

  const moon: MoonCardModel = {
    phaseKey,
    phaseName,
    fraction: liveMoon.fraction,
    illuminationPercent,
    source: liveMoon.isApproximate ? 'day_record' : 'interpolated',
    isApproximate: liveMoon.isApproximate,
    rise,
    set,
    nextRise,
  };

  const finalLocation = locationLabel?.trim() ? locationLabel.trim() : snapshot.location.label;

  return ok({
    dateLongLabel: formatDateLong(nowMs),
    dateShortLabel: formatShortDateLabel(nowMs),
    greetingKey,
    greetingText: greetingText(greetingKey),
    locationLabel: finalLocation,
    clockTimeText: formatTimeDisplay(nowMs, clockFormat),
    dayNightState,
    events,
    soonestId,
    arc,
    day,
    moon,
    accuracyTier: tier,
    isApproximate: tier === 'approximate',
  });
}
