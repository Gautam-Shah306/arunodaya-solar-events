/**
 * Strongly-typed Result representing either a successful value or an error.
 */
export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/**
 * Creates a successful Result wrapping a value.
 * @param value The success value
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Creates an error Result wrapping an error.
 * @param error The failure error
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
