import { describe, expect, it } from 'vitest';
import { ENGINE_API_VERSION, PACKAGE_NAME } from '../src/index.js';

describe('engine', () => {
  it('engine exposes its package name', () => {
    expect(PACKAGE_NAME).toBe('@arunodaya/engine');
    expect(ENGINE_API_VERSION).toBe(1);
  });
});
