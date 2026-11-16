export type RollDirection = 'down' | 'up' | null;

export interface CountdownParts {
  readonly hours: number;
  readonly minutes: number;
  readonly text: string;
}

export interface DigitSlot {
  readonly char: string;
  readonly previousChar: string | null;
  readonly isDigit: boolean;
  readonly animate: boolean;
  readonly direction: RollDirection;
}

/**
 * Determines rolling direction from value change.
 * Decrease rolls down (new digit enters from above).
 * Increase rolls up.
 * Equal or initial state does not roll.
 */
export function rollDirection(previousMinutes: number | null, nextMinutes: number): RollDirection {
  if (previousMinutes === null || previousMinutes === nextMinutes) {
    return null;
  }
  return nextMinutes < previousMinutes ? 'down' : 'up';
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
 * Plans slot layout and animation flags for character transitions.
 * Only changing digit characters roll; separators and unit letters remain static.
 */
export function planSlots(
  previousText: string | null,
  nextText: string,
  direction: RollDirection,
): readonly DigitSlot[] {
  const slots: DigitSlot[] = [];
  const prev = previousText ?? '';

  for (let i = 0; i < nextText.length; i++) {
    const nextChar = nextText[i] ?? '';
    const prevChar = prev[i] ?? null;
    const isDigit = /^[0-9]$/.test(nextChar);
    const hasChanged = prevChar !== null && prevChar !== nextChar;
    const animate = Boolean(direction && isDigit && hasChanged);

    slots.push({
      char: nextChar,
      previousChar: animate ? prevChar : null,
      isDigit,
      animate,
      direction: animate ? direction : null,
    });
  }

  return slots;
}
