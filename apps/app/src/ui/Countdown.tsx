import React from 'react';
import { countdownParts, rollDirection } from './rolling-digits-model.js';
import { RollingDigits } from './RollingDigits.js';
import './Countdown.css';

export interface CountdownProps {
  readonly remainingMinutes: number;
  readonly progress?: number;
  readonly srLabel: string;
  readonly isPrimary?: boolean;
  readonly className?: string;
}

export const Countdown: React.FC<CountdownProps> = ({
  remainingMinutes,
  progress = 0,
  srLabel,
  isPrimary = false,
  className = '',
}) => {
  const [prevMinutes, setPrevMinutes] = React.useState<number | null>(null);
  const [currMinutes, setCurrMinutes] = React.useState(remainingMinutes);

  if (remainingMinutes !== currMinutes) {
    setPrevMinutes(currMinutes);
    setCurrMinutes(remainingMinutes);
  }

  const direction = rollDirection(prevMinutes, remainingMinutes);

  const { text } = countdownParts(remainingMinutes);
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <div
      className={`ar-countdown ar-tnum ${isPrimary ? 'ar-countdown--primary' : ''} ${className}`.trim()}
      style={{ '--ar-progress': clampedProgress } as React.CSSProperties}
    >
      <span className="ar-sr-only ar-countdown-sr">{srLabel}</span>
      <div className="ar-countdown-layer ar-countdown-shade" aria-hidden="true">
        <RollingDigits text={text} direction={direction} />
      </div>
      <div
        className="ar-countdown-layer ar-countdown-fill"
        aria-hidden="true"
        style={{
          clipPath: 'inset(0 calc(100% - var(--ar-progress) * 100%) 0 0)',
        }}
      >
        <RollingDigits text={text} direction={direction} />
      </div>
    </div>
  );
};
