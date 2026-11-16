import { ACCURACY, SUPPORTED_YEARS } from '../config.js';
import { parseIstDate } from '../time/ist.js';
import type { AccuracyTier } from './types.js';

/**
 * Returns the astronomical accuracy tier for a given IST civil date.
 * - 'standard': Supported years through ACCURACY.standardThroughYear (2035).
 * - 'approximate': Supported years beyond standard through SUPPORTED_YEARS.last (2100).
 * - 'unsupported': Dates outside SUPPORTED_YEARS or invalid dates.
 *
 * @param istDate YYYY-MM-DD string
 * @returns AccuracyTier ('standard' | 'approximate' | 'unsupported')
 */
export function accuracyTier(istDate: string): AccuracyTier {
  const parsed = parseIstDate(istDate);
  if (!parsed.ok) {
    return 'unsupported';
  }
  const { year } = parsed.value;
  if (year < SUPPORTED_YEARS.first || year > SUPPORTED_YEARS.last) {
    return 'unsupported';
  }
  if (year <= ACCURACY.standardThroughYear) {
    return 'standard';
  }
  return 'approximate';
}
