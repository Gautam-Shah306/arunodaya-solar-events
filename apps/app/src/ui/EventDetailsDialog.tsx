import React from 'react';
import type { EventCardModel } from '../home/home-model.js';
import { en } from '../i18n/index.js';
import { Dialog } from './Dialog.js';
import './EventDetailsDialog.css';

export interface EventDetailsDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly event: EventCardModel | null;
  readonly isApproximate?: boolean;
}

export const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({
  isOpen,
  onClose,
  event,
  isApproximate = false,
}) => {
  if (!event) {
    return null;
  }

  let definition = '';
  let rounding = '';

  switch (event.id) {
    case 'sunrise':
      definition = en.dialog.sunriseDefinition;
      rounding = en.dialog.sunriseRounding;
      break;
    case 'navkarshi':
      definition = en.dialog.navkarshiDefinition;
      rounding = en.dialog.navkarshiRounding;
      break;
    case 'sunset':
      definition = en.dialog.sunsetDefinition;
      rounding = en.dialog.sunsetRounding;
      break;
  }

  const accuracyNote = isApproximate ? en.dialog.accuracyApproximate : en.dialog.accuracyStandard;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={event.name}
      aria-labelledby="event-dialog-title"
      aria-describedby="event-dialog-body"
      testId="event-dialog"
    >
      <div id="event-dialog-body" className="ar-event-dialog-content">
        <div className="ar-event-dialog-time-row">
          <span className="ar-event-dialog-time" data-testid="event-dialog-time">
            {event.timeText}
          </span>
          {event.isTomorrow && (
            <span className="ar-event-dialog-tomorrow" data-testid="event-dialog-tomorrow">
              {en.time.tomorrow}
            </span>
          )}
        </div>

        <section className="ar-event-dialog-section">
          <h3 className="ar-event-dialog-section-title">{en.dialog.definition}</h3>
          <p className="ar-event-dialog-text">{definition}</p>
        </section>

        <section className="ar-event-dialog-section">
          <h3 className="ar-event-dialog-section-title">{en.dialog.roundingRule}</h3>
          <p className="ar-event-dialog-text">{rounding}</p>
        </section>

        <section className="ar-event-dialog-section">
          <h3 className="ar-event-dialog-section-title">{en.dialog.accuracyNote}</h3>
          <p className="ar-event-dialog-text">{accuracyNote}</p>
        </section>
      </div>
    </Dialog>
  );
};
