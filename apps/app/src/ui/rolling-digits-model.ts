export type RollDirection = 'down' | 'up' | null;

export interface CountdownParts {
  readonly hours: number;
  readonly minutes: number;
  readonly text: string;
}

export interface SlotPlan {
  readonly id: string;
  readonly previousChar: string | null;
  readonly nextChar: string;
  readonly changed: boolean;
  readonly direction: 'up' | 'down';
}

/**
 * Formats a remaining-minutes count into hours, minutes, and a fixed-length string.
 * Format is always 'HHh MMm' (7 characters).
 */
export function countdownParts(remainingMinutes: number): CountdownParts {
  const safeMinutes = Math.max(0, Math.floor(remainingMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const text = `${hh}h ${mm}m`;

  return {
    hours,
    minutes,
    text,
  };
}

/**
 * Determines rolling direction from remaining time change.
 * Decrement rolls down; increment rolls up.
 */
export function rollDirection(previousMinutes: number | null, nextMinutes: number): RollDirection {
  if (previousMinutes === null || previousMinutes === nextMinutes) {
    return null;
  }
  return nextMinutes < previousMinutes ? 'down' : 'up';
}

/**
 * Plans slot layout and animation properties for character transitions.
 * Uniform whole-countdown direction is applied to all changing slots.
 */
export function planSlots(
  previousText: string | null,
  nextText: string,
  direction: 'up' | 'down' = 'down',
): SlotPlan[] {
  const slots: SlotPlan[] = [];
  const isFirstRender = previousText === null;

  for (let i = 0; i < nextText.length; i++) {
    const nextChar = nextText[i] ?? '';
    const prevChar = isFirstRender ? null : (previousText[i] ?? null);
    const changed = !isFirstRender && prevChar !== null && prevChar !== nextChar;

    slots.push({
      id: `slot-${String(i)}`,
      previousChar: changed ? prevChar : null,
      nextChar,
      changed,
      direction,
    });
  }

  return slots;
}
