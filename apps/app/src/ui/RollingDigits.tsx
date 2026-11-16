import React from 'react';
import { planSlots, type DigitSlot, type RollDirection } from './rolling-digits-model.js';
import './RollingDigits.css';

export interface RollingDigitsProps {
  readonly text: string;
  readonly direction?: RollDirection;
  readonly className?: string;
  readonly ariaHidden?: boolean;
}

export const RollingDigits: React.FC<RollingDigitsProps> = ({
  text,
  direction = null,
  className = '',
  ariaHidden,
}) => {
  const [prevText, setPrevText] = React.useState<string | null>(null);
  const [currText, setCurrText] = React.useState(text);

  if (text !== currText) {
    setPrevText(currText);
    setCurrText(text);
  }

  // Plan slots based on previous text and direction
  const slots: readonly DigitSlot[] = planSlots(prevText, text, direction);

  return (
    <span className={`ar-roll ${className}`.trim()} aria-hidden={ariaHidden}>
      {slots.map((slot, index) => {
        if (!slot.animate) {
          return (
            <span key={index} className="ar-roll-slot" data-digit={slot.isDigit ? 'true' : 'false'}>
              <span className="ar-num">{slot.char}</span>
            </span>
          );
        }

        return (
          <span key={index} className="ar-roll-slot" data-digit="true" data-dir={slot.direction}>
            <span className="ar-num-track">
              {slot.direction === 'down' ? (
                <>
                  <span className="ar-num ar-num-next">{slot.char}</span>
                  <span className="ar-num ar-num-prev">{slot.previousChar}</span>
                </>
              ) : (
                <>
                  <span className="ar-num ar-num-prev">{slot.previousChar}</span>
                  <span className="ar-num ar-num-next">{slot.char}</span>
                </>
              )}
            </span>
          </span>
        );
      })}
    </span>
  );
};
