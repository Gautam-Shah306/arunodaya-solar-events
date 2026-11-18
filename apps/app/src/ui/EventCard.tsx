import React from 'react';
import type { EventCardModel } from '../home/home-model.js';
import { countdownSrLabel, en } from '../i18n/index.js';
import { Countdown } from './Countdown.js';
import './EventCard.css';

export interface EventCardProps {
  readonly event: EventCardModel;
  readonly isSoonest?: boolean;
  readonly onClick?: (event: EventCardModel) => void;
  readonly className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isSoonest = false,
  onClick,
  className = '',
}) => {
  const srDuration = countdownSrLabel(event.name, event.remainingMinutes);
  const accessibleName = `${event.name}, ${event.timeText}${event.isTomorrow ? `, ${en.time.tomorrow}` : ''}, ${srDuration}`;

  return (
    <button
      type="button"
      className={`ar-event-card ${isSoonest ? 'ar-event-card--soonest' : ''} ${className}`.trim()}
      onClick={() => onClick?.(event)}
      aria-label={accessibleName}
      data-testid={`event-card-${event.id}`}
    >
      <div className="ar-event-card-top">
        <div className="ar-event-card-title-group">
          <span className="ar-event-card-name">{event.name}</span>
          {event.isTomorrow && (
            <span className="ar-event-card-tomorrow" data-testid="tomorrow-badge">
              {en.time.tomorrow}
            </span>
          )}
        </div>
        <span className="ar-event-card-time">{event.timeText}</span>
      </div>

      <div className="ar-event-card-countdown" data-testid="countdown-display">
        <Countdown
          remainingMinutes={event.remainingMinutes}
          progress={event.progress}
          srLabel={srDuration}
          isPrimary={isSoonest}
        />
      </div>
    </button>
  );
};
