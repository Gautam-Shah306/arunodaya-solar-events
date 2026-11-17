import React, { useEffect, useRef, useState } from 'react';
import { planSlots } from './rolling-digits-model.js';
import './RollingDigits.css';

export interface RollingDigitsProps {
  readonly text: string;
  readonly direction?: 'down' | 'up' | null;
  readonly className?: string;
  readonly ariaHidden?: boolean;
}

interface ActiveTransition {
  readonly seq: number;
  readonly previousChar: string;
  readonly nextChar: string;
  readonly direction: 'up' | 'down';
}

export const RollingDigits: React.FC<RollingDigitsProps> = ({
  text,
  direction = 'down',
  className = '',
  ariaHidden,
}) => {
  const [prevText, setPrevText] = useState<string | null>(null);
  const [currText, setCurrText] = useState(text);
  const seqRef = useRef(0);
  const [activeTransitions, setActiveTransitions] = useState<Record<number, ActiveTransition>>({});

  if (text !== currText) {
    setPrevText(currText);
    setCurrText(text);
  }

  useEffect(() => {
    if (prevText === null || prevText === text) {
      return;
    }

    const effectiveDir = direction ?? 'down';
    const slots = planSlots(prevText, text, effectiveDir);
    const newSeq = ++seqRef.current;
    const newTransitions: Record<number, ActiveTransition> = {};

    slots.forEach((slot, index) => {
      if (slot.changed && slot.previousChar !== null) {
        newTransitions[index] = {
          seq: newSeq,
          previousChar: slot.previousChar,
          nextChar: slot.nextChar,
          direction: slot.direction,
        };
      }
    });

    if (Object.keys(newTransitions).length > 0) {
      setActiveTransitions(newTransitions);

      const timer = setTimeout(() => {
        setActiveTransitions({});
      }, 400);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [text, prevText, direction]);

  function handleAnimationEnd(slotIndex: number) {
    setActiveTransitions((prev) => {
      if (!prev[slotIndex]) return prev;
      const next: Record<number, ActiveTransition> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (Number(key) !== slotIndex) {
          next[Number(key)] = value;
        }
      }
      return next;
    });
  }

  const slots = planSlots(null, text, direction ?? 'down');

  return (
    <span className={`ar-roll ${className}`.trim()} aria-hidden={ariaHidden}>
      {slots.map((slot, index) => {
        const trans = activeTransitions[index];
        const isDigit = /^[0-9]$/.test(slot.nextChar);

        if (!trans) {
          return (
            <span
              key={`static-${String(index)}`}
              className="ar-roll-slot"
              data-slot={index}
              data-digit={isDigit ? 'true' : 'false'}
            >
              <span className="ar-num">{slot.nextChar}</span>
            </span>
          );
        }

        const { seq, previousChar, nextChar, direction: dir } = trans;
        const dirClass = dir === 'down' ? 'down' : 'up';

        return (
          <span
            key={`roll-${String(index)}-${String(seq)}`}
            className="ar-roll-slot"
            data-slot={index}
            data-digit="true"
            data-dir={dir}
          >
            <span
              key={`exit-${String(index)}-${String(seq)}-${previousChar}`}
              className={`ar-num ar-roll-exit ar-roll-exit-${dirClass}`}
              onAnimationEnd={() => {
                handleAnimationEnd(index);
              }}
            >
              {previousChar}
            </span>
            <span
              key={`enter-${String(index)}-${String(seq)}-${nextChar}`}
              className={`ar-num ar-roll-enter ar-roll-enter-${dirClass}`}
            >
              {nextChar}
            </span>
          </span>
        );
      })}
    </span>
  );
};
