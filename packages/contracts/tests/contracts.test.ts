import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME, SCHEMA_VERSIONS } from '../src/index.js';

describe('contracts', () => {
  it('contracts exposes snapshot schema version 1', () => {
    expect(PACKAGE_NAME).toBe('@arunodaya/contracts');
    expect(SCHEMA_VERSIONS.snapshot).toBe(1);
  });
});
