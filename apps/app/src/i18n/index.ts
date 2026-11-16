import { istParts, type Greeting } from '@arunodaya/engine';
import { en } from './en.js';

export { en };
export type { Greeting };

/**
 * Retrieves a plain English translation string by dot-separated path.
 * @param path Dot-separated path in the English strings dictionary
 */
export function t(path: string): string {
  const parts = path.split('.');
  let curr: unknown = en;
  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = (curr as Record<string, unknown>)[part];
    } else {
      throw new Error(`Unresolved translation key: ${path}`);
    }
  }
  if (typeof curr !== 'string') {
    throw new Error(`Translation key is not a string: ${path}`);
  }
  return curr;
}

/**
 * Replaces {name} placeholders in a template string with provided parameters.
 * Reports unresolved placeholders by throwing a TypeError.
 *
 * @param template String containing {placeholder} tokens
 * @param params Object mapping placeholder keys to replacement values
 */
export function format(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key]);
    }
    throw new TypeError(`Unresolved placeholder in template: ${match}`);
  });
}

/**
 * Returns the English greeting text for a Greeting.
 * @param greeting Greeting ('morning' | 'afternoon' | 'evening' | 'night')
 */
export function greetingText(greeting: Greeting): string {
  switch (greeting) {
    case 'morning':
      return en.greetings.morning;
    case 'afternoon':
      return en.greetings.afternoon;
    case 'evening':
      return en.greetings.evening;
    case 'night':
      return en.greetings.night;
    default:
      return en.greetings.morning;
  }
}

/**
 * Generates an accessible screen-reader announcement label for an upcoming countdown event.
 *
 * Examples:
 * - "Navkarshi in 2 hours 48 minutes"
 * - "Sunset in 1 hour"
 * - "Sunrise in 1 minute"
 * - "Sunset in 45 minutes"
 * - "Sunrise now" (for 0 minutes)
 *
 * @param eventName Localized event name (e.g. "Sunrise", "Navkarshi")
 * @param minutes Non-negative remaining minutes to event
 */
export function countdownSrLabel(eventName: string, minutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  if (safeMinutes === 0) {
    return format(en.screenReader.countdownNowTemplate, { event: eventName });
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMins = safeMinutes % 60;

  const durationParts: string[] = [];
  if (hours > 0) {
    durationParts.push(`${String(hours)} ${hours === 1 ? en.duration.hour : en.duration.hours}`);
  }
  if (remainingMins > 0) {
    durationParts.push(
      `${String(remainingMins)} ${remainingMins === 1 ? en.duration.minute : en.duration.minutes}`,
    );
  }

  const durationStr = durationParts.join(' ');
  return format(en.screenReader.countdownTemplate, {
    event: eventName,
    duration: durationStr,
  });
}

/**
 * Formats an epoch millisecond instant into an IST date label.
 * Example: "Mon 16 November".
 *
 * @param nowMs Epoch millisecond instant
 */
export function formatDateLabel(nowMs: number): string {
  const parts = istParts(nowMs);
  const weekdayShort = en.weekdaysShort[parts.weekday] ?? '';
  const monthName = en.months[parts.month - 1] ?? '';
  return `${weekdayShort} ${String(parts.day)} ${monthName}`;
}

export const formatDateLong = formatDateLabel;

/**
 * Formats an epoch millisecond instant into HH:MM (24-hour) in IST.
 *
 * @param ms Epoch millisecond instant
 */
export function formatTime24(ms: number): string {
  const parts = istParts(ms);
  const hh = String(parts.hour).padStart(2, '0');
  const mm = String(parts.minute).padStart(2, '0');
  return `${hh}:${mm}`;
}
