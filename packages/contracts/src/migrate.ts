import { err, ok, type Result } from './result.js';
import type { SnapshotV1 } from './snapshot.js';
import { validateSnapshot, type ValidationIssue } from './validate.js';

/**
 * Migration error payload returned when snapshot migration or validation fails.
 */
export interface MigrationError {
  readonly code: 'not_object' | 'missing_version' | 'unsupported_version' | 'invalid';
  readonly version?: number | undefined;
  readonly issues?: ValidationIssue[] | undefined;
}

/**
 * Migrates raw snapshot payload into a validated SnapshotV1 structure.
 * Handles schema version detection, schema validation, and reporting.
 * @param raw Unknown raw payload from storage or external input
 */
export function migrateSnapshot(raw: unknown): Result<SnapshotV1, MigrationError> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return err({ code: 'not_object' });
  }

  const record = raw as Record<string, unknown>;
  if (record.schemaVersion === undefined) {
    return err({ code: 'missing_version' });
  }

  if (typeof record.schemaVersion !== 'number') {
    return err({ code: 'unsupported_version' });
  }

  const version = record.schemaVersion;

  if (version === 1) {
    const validated = validateSnapshot(raw);
    if (!validated.ok) {
      return err({
        code: 'invalid',
        version: 1,
        issues: validated.error,
      });
    }
    return ok(validated.value);
  }

  return err({
    code: 'unsupported_version',
    version,
  });
}
