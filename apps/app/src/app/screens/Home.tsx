import React, { useState } from 'react';
import type { SnapshotLocation } from '@arunodaya/contracts';
import { formatCountdown, type Clock } from '@arunodaya/engine';
import { buildHomeModel, type EventCardModel } from '../../home/home-model.js';
import { countdownSrLabel, en } from '../../i18n/index.js';
import type { SnapshotService } from '../../snapshot/service.js';
import { DayNightIcon } from '../../ui/DayNightIcon.js';
import { EventCard } from '../../ui/EventCard.js';
import { EventDetailsDialog } from '../../ui/EventDetailsDialog.js';
import { MoonPhaseGlyph } from '../../ui/MoonPhaseGlyph.js';
import { SolarArc } from '../../ui/SolarArc.js';
import { useNow } from '../../ui/use-now.js';
import { useSnapshot } from '../../ui/use-snapshot.js';
import './Home.css';

export const DEFAULT_RAJKOT_LOCATION: SnapshotLocation = {
  lat: 22.3,
  lon: 70.8,
  label: 'Rajkot',
  source: 'manual',
  fixAtMs: 1763164800000,
};

export interface HomeProps {
  readonly clock: Clock;
  readonly snapshotService: SnapshotService;
  readonly location?: SnapshotLocation;
  readonly isSimulated?: boolean;
  readonly clockFormat?: '12h' | '24h' | undefined;
}

export const Home: React.FC<HomeProps> = ({
  clock,
  snapshotService,
  location = DEFAULT_RAJKOT_LOCATION,
  isSimulated = false,
  clockFormat = '12h',
}) => {
  const nowMs = useNow(clock);
  const snapshotState = useSnapshot(snapshotService, location, {
    autoRefresh: true,
    nowMs,
  });

  const [selectedEvent, setSelectedEvent] = useState<EventCardModel | null>(null);

  if (snapshotState.state === 'loading') {
    return (
      <div className="ar-home-status" role="status" data-testid="status-loading">
        <p>{en.status.loading}</p>
      </div>
    );
  }

  if (snapshotState.state === 'error') {
    return (
      <div className="ar-home-status ar-home-error" role="alert" data-testid="status-error">
        <p>{en.status.error}</p>
        <button
          type="button"
          className="ar-retry-btn"
          onClick={snapshotState.retry}
          data-testid="retry-button"
        >
          {en.status.retry}
        </button>
      </div>
    );
  }

  const modelRes = buildHomeModel({
    snapshot: snapshotState.snapshot,
    nowMs,
    clockFormat,
    locationLabel: location.label,
  });

  if (!modelRes.ok) {
    return (
      <div className="ar-home-status ar-home-error" role="alert" data-testid="status-error">
        <p>{en.status.error}</p>
        <button
          type="button"
          className="ar-retry-btn"
          onClick={() => {
            void snapshotState.refresh();
          }}
          data-testid="retry-button"
        >
          {en.status.retry}
        </button>
      </div>
    );
  }

  const model = modelRes.value;

  const soonestCard = model.events.find((e) => e.id === model.soonestId) ?? model.events[0];
  const soonestSrLabel = countdownSrLabel(soonestCard.name, soonestCard.remainingMinutes);

  const simulatedTimeString = `${model.clockTimeText} IST`;

  return (
    <div className="ar-home ar-home-screen" data-testid="home-screen">
      {typeof __AR_DEBUG__ !== 'undefined' && __AR_DEBUG__ && isSimulated && (
        <div className="ar-simulated-banner" role="status" data-testid="simulated-time-banner">
          {`Simulated time: ${simulatedTimeString}`}
        </div>
      )}

      {/* Screen reader polite announcement region for upcoming event */}
      <div className="ar-sr-only" aria-live="polite" aria-atomic="true">
        {soonestSrLabel}
      </div>

      <header className="ar-home-header">
        <h1 className="ar-home-greeting" data-testid="greeting">
          {model.greetingText}
        </h1>
        <div className="ar-home-meta">
          <a href="#forecast" className="ar-home-date-link" data-testid="date-label">
            {model.dateLongLabel}
          </a>
          <span className="ar-home-dot" aria-hidden="true">
            ·
          </span>
          <a href="#locations" className="ar-home-location-chip" data-testid="location-chip">
            {model.locationLabel}
          </a>
          <span className="ar-home-dot" aria-hidden="true">
            ·
          </span>
          <span className="ar-home-clock" data-testid="clock-display">
            {model.clockTimeText}
          </span>
          <DayNightIcon state={model.dayNightState} />
          {model.isApproximate && (
            <span className="ar-home-accuracy-badge" data-testid="accuracy-badge">
              {en.status.approximateAccuracy}
            </span>
          )}
        </div>
      </header>

      <SolarArc
        fraction={model.arc.fraction}
        dayNightState={model.dayNightState}
        sunriseTimeText={model.events[0].timeText}
        sunsetTimeText={model.events[2].timeText}
      />

      <section className="ar-home-events" aria-label="Solar Events">
        <h2 className="ar-sr-only">Solar Events</h2>
        {model.events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isSoonest={event.id === model.soonestId}
            onClick={(ev) => {
              setSelectedEvent(ev);
            }}
          />
        ))}
      </section>

      <EventDetailsDialog
        isOpen={selectedEvent !== null}
        onClose={() => {
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        isApproximate={model.isApproximate}
      />

      {/* Day Details */}
      <section
        className="ar-home-card-section"
        data-testid="day-details"
        aria-labelledby="day-details-title"
      >
        <h2 id="day-details-title" className="ar-section-title">
          {en.dayDetails.title}
        </h2>
        <div className="ar-details-grid">
          <div className="ar-detail-row">
            <span className="ar-detail-label">{en.dayDetails.daylight}</span>
            <span className="ar-detail-value">{model.day.daylightText}</span>
          </div>
          <div className="ar-detail-row">
            <span className="ar-detail-label">{en.dayDetails.solarNoon}</span>
            <span className="ar-detail-value">{model.day.solarNoonText}</span>
          </div>
          <div className="ar-detail-row">
            <span className="ar-detail-label">{en.dayDetails.civilDawn}</span>
            <span className="ar-detail-value">{model.day.civilDawnText}</span>
          </div>
          <div className="ar-detail-row">
            <span className="ar-detail-label">{en.dayDetails.civilDusk}</span>
            <span className="ar-detail-value">{model.day.civilDuskText}</span>
          </div>
          <div className="ar-detail-row">
            <span className="ar-detail-label">{en.dayDetails.goldenMorning}</span>
            <span className="ar-detail-value">
              {model.day.goldenMorning.startText} – {model.day.goldenMorning.endText}
            </span>
          </div>
          <div className="ar-detail-row">
            <span className="ar-detail-label">{en.dayDetails.goldenEvening}</span>
            <span className="ar-detail-value">
              {model.day.goldenEvening.startText} – {model.day.goldenEvening.endText}
            </span>
          </div>
        </div>
      </section>

      {/* Moon Card */}
      <section
        className="ar-home-card-section"
        data-testid="moon-card"
        aria-labelledby="moon-card-title"
      >
        <h2 id="moon-card-title" className="ar-section-title">
          {en.moon.title}
        </h2>
        <div className="ar-moon-content">
          <div className="ar-moon-header">
            <MoonPhaseGlyph
              fraction={model.moon.fraction}
              phaseName={model.moon.phaseName}
              illuminationPercent={model.moon.illuminationPercent}
            />
            <div className="ar-moon-phase-meta">
              <span className="ar-moon-phase-name">{model.moon.phaseName}</span>
              <span className="ar-moon-illumination">
                {String(model.moon.illuminationPercent)}% {en.moon.illumination}
              </span>
            </div>
          </div>

          <div className="ar-details-grid">
            <div className="ar-detail-row">
              <span className="ar-detail-label">{en.events.moonrise}</span>
              <span className="ar-detail-value">
                {model.moon.rise ? model.moon.rise.timeText : en.moon.noMoonriseToday}
              </span>
            </div>
            <div className="ar-detail-row">
              <span className="ar-detail-label">{en.events.moonset}</span>
              <span className="ar-detail-value">
                {model.moon.set ? model.moon.set.timeText : en.moon.noMoonsetToday}
              </span>
            </div>
            <div className="ar-detail-row">
              <span className="ar-detail-label">{en.moon.nextMoonrise}</span>
              <span className="ar-detail-value">
                {model.moon.nextRise.status === 'ready'
                  ? `${model.moon.nextRise.dayLabel} at ${model.moon.nextRise.timeText} (${formatCountdown(model.moon.nextRise.remainingMinutes)})`
                  : en.moon.nextMoonriseUnavailable}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Refresh section */}
      <div className="ar-home-refresh-bar">
        <button
          type="button"
          className="ar-refresh-btn"
          onClick={() => void snapshotState.refresh()}
          disabled={snapshotState.refreshing}
          data-testid="refresh-button"
        >
          {snapshotState.refreshing ? en.refresh.refreshing : en.refresh.refreshSnapshot}
        </button>
        {snapshotState.refreshError && (
          <p className="ar-refresh-error" role="alert" data-testid="refresh-error">
            {snapshotState.refreshError}
          </p>
        )}
      </div>
    </div>
  );
};
