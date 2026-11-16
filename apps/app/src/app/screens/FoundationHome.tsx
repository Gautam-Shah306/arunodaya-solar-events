import React from 'react';
import type { SnapshotLocation } from '@arunodaya/contracts';
import {
  dayNight,
  istParts,
  remainingMinutes,
  selectGreeting,
  type Clock,
} from '@arunodaya/engine';
import {
  countdownSrLabel,
  en,
  format,
  formatDateLong,
  formatTime24,
  greetingText,
} from '../../i18n/index.js';
import type { SnapshotService } from '../../snapshot/service.js';
import { Countdown } from '../../ui/Countdown.js';
import { useNow } from '../../ui/use-now.js';
import { useSnapshot } from '../../ui/use-snapshot.js';
import './FoundationHome.css';

export const DEFAULT_RAJKOT_LOCATION: SnapshotLocation = {
  lat: 22.3,
  lon: 70.8,
  label: 'Rajkot',
  source: 'manual',
  fixAtMs: 1763164800000,
};

export interface FoundationHomeProps {
  readonly clock: Clock;
  readonly snapshotService: SnapshotService;
  readonly location?: SnapshotLocation;
  readonly isSimulated?: boolean;
}

export const FoundationHome: React.FC<FoundationHomeProps> = ({
  clock,
  snapshotService,
  location = DEFAULT_RAJKOT_LOCATION,
  isSimulated = false,
}) => {
  const nowMs = useNow(clock);
  const snapshotState = useSnapshot(snapshotService, location);

  if (snapshotState.state === 'loading') {
    return (
      <div className="ar-home-status" role="status">
        <p>{en.status.loading}</p>
      </div>
    );
  }

  if (snapshotState.state === 'error') {
    return (
      <div className="ar-home-status ar-home-error" role="alert">
        <p>{en.status.error}</p>
        <button type="button" className="ar-retry-btn" onClick={snapshotState.retry}>
          {en.status.retry}
        </button>
      </div>
    );
  }

  const { snapshot } = snapshotState;
  const parts = istParts(nowMs);
  const todayRecord = snapshot.days.find((d) => d.istDate === parts.istDate) ?? snapshot.days[0];

  if (!todayRecord) {
    return (
      <div className="ar-home-status ar-home-error" role="alert">
        <p>{en.status.error}</p>
      </div>
    );
  }

  // Greeting and day/night state
  const greetingKind = selectGreeting(nowMs, {
    solarNoonMs: todayRecord.solarNoonMs,
    sunsetMs: todayRecord.sunset.displayMs,
  });
  const greeting = greetingText(greetingKind);
  const dateFormatted = formatDateLong(nowMs);

  const dn = dayNight(nowMs, {
    sunriseDisplayMs: todayRecord.sunrise.displayMs,
    sunsetDisplayMs: todayRecord.sunset.displayMs,
  });
  const indicator = dn === 'day' ? en.indicators.day : en.indicators.night;

  // Remaining minutes to today's events
  const remSunrise = remainingMinutes(nowMs, todayRecord.sunrise.displayMs);
  const remNavkarshi = remainingMinutes(nowMs, todayRecord.navkarshi.displayMs);
  const remSunset = remainingMinutes(nowMs, todayRecord.sunset.displayMs);

  // Progress approximations across intervals
  const dayLengthMs = todayRecord.sunset.displayMs - todayRecord.sunrise.displayMs;
  const progSunrise =
    nowMs >= todayRecord.sunrise.displayMs
      ? 1
      : Math.max(
          0,
          1 - remSunrise / Math.max(1, (todayRecord.sunrise.displayMs % 86400000) / 60000),
        );
  const progNavkarshi =
    nowMs >= todayRecord.navkarshi.displayMs
      ? 1
      : nowMs < todayRecord.sunrise.displayMs
        ? 0
        : Math.max(0, Math.min(1, (nowMs - todayRecord.sunrise.displayMs) / (48 * 60000)));
  const progSunset =
    nowMs >= todayRecord.sunset.displayMs
      ? 1
      : nowMs < todayRecord.sunrise.displayMs
        ? 0
        : Math.max(
            0,
            Math.min(1, (nowMs - todayRecord.sunrise.displayMs) / Math.max(1, dayLengthMs)),
          );

  // Determine next major event for emphasis
  let nextMajorEvent: 'sunrise' | 'navkarshi' | 'sunset';
  if (nowMs < todayRecord.sunrise.displayMs) {
    nextMajorEvent = 'sunrise';
  } else if (nowMs < todayRecord.navkarshi.displayMs) {
    nextMajorEvent = 'navkarshi';
  } else if (nowMs < todayRecord.sunset.displayMs) {
    nextMajorEvent = 'sunset';
  } else {
    nextMajorEvent = 'sunrise';
  }

  const soonestSrLabel =
    nextMajorEvent === 'sunrise'
      ? countdownSrLabel(en.events.sunrise, remSunrise)
      : nextMajorEvent === 'navkarshi'
        ? countdownSrLabel(en.events.navkarshi, remNavkarshi)
        : countdownSrLabel(en.events.sunset, remSunset);

  const simulatedTimeString = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')} IST`;

  return (
    <div className="ar-home">
      {typeof __AR_DEBUG__ !== 'undefined' && __AR_DEBUG__ && isSimulated && (
        <div className="ar-simulated-banner" role="status">
          {format(en.status.simulatedTimeBanner, { time: simulatedTimeString })}
        </div>
      )}

      {/* Screen reader polite announcement region for upcoming event */}
      <div className="ar-sr-only" aria-live="polite" aria-atomic="true">
        {soonestSrLabel}
      </div>

      <header className="ar-home-header">
        <h1 className="ar-home-greeting">{greeting}</h1>
        <div className="ar-home-meta">
          <span className="ar-home-date">{dateFormatted}</span>
          <span className="ar-home-dot">·</span>
          <span className="ar-home-location">{location.label}</span>
          <span className="ar-home-indicator">{indicator}</span>
        </div>
      </header>

      <section className="ar-home-countdowns" aria-label="Solar Countdowns">
        <div
          className={`ar-home-card ${nextMajorEvent === 'sunrise' ? 'ar-home-card--primary' : ''}`}
        >
          <div className="ar-home-card-header">
            <span className="ar-home-card-label">{en.events.sunrise}</span>
            <span className="ar-home-card-time">{formatTime24(todayRecord.sunrise.displayMs)}</span>
          </div>
          <Countdown
            remainingMinutes={remSunrise}
            progress={progSunrise}
            srLabel={countdownSrLabel(en.events.sunrise, remSunrise)}
            isPrimary={nextMajorEvent === 'sunrise'}
          />
        </div>

        <div
          className={`ar-home-card ${nextMajorEvent === 'navkarshi' ? 'ar-home-card--primary' : ''}`}
        >
          <div className="ar-home-card-header">
            <span className="ar-home-card-label">{en.events.navkarshi}</span>
            <span className="ar-home-card-time">
              {formatTime24(todayRecord.navkarshi.displayMs)}
            </span>
          </div>
          <Countdown
            remainingMinutes={remNavkarshi}
            progress={progNavkarshi}
            srLabel={countdownSrLabel(en.events.navkarshi, remNavkarshi)}
            isPrimary={nextMajorEvent === 'navkarshi'}
          />
        </div>

        <div
          className={`ar-home-card ${nextMajorEvent === 'sunset' ? 'ar-home-card--primary' : ''}`}
        >
          <div className="ar-home-card-header">
            <span className="ar-home-card-label">{en.events.sunset}</span>
            <span className="ar-home-card-time">{formatTime24(todayRecord.sunset.displayMs)}</span>
          </div>
          <Countdown
            remainingMinutes={remSunset}
            progress={progSunset}
            srLabel={countdownSrLabel(en.events.sunset, remSunset)}
            isPrimary={nextMajorEvent === 'sunset'}
          />
        </div>
      </section>

      <footer className="ar-home-location-bar">
        <span>{en.status.allTimesIst}</span>
      </footer>
    </div>
  );
};
