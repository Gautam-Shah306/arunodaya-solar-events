import { describe, expect, it } from 'vitest';
import { compareVersions, evaluateToolchain } from '../lib/toolchain.mjs';

describe('toolchain', () => {
  it('toolchain accepts node 24.11.0 with npm 11.10.0', () => {
    const errors = evaluateToolchain({
      nodeVersion: '24.11.0',
      npmVersion: '11.10.0',
    });
    expect(errors).toHaveLength(0);
  });

  it('toolchain rejects node 22.12.0', () => {
    const errors = evaluateToolchain({
      nodeVersion: '22.12.0',
      npmVersion: '11.10.0',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Node version must be 24.x');
  });

  it('toolchain rejects npm 11.9.0', () => {
    const errors = evaluateToolchain({
      nodeVersion: '24.0.0',
      npmVersion: '11.9.0',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('npm version must be >= 11.10.0');
  });

  it('compareVersions orders 11.10.0 above 11.9.0', () => {
    expect(compareVersions('11.10.0', '11.9.0')).toBe(1);
    expect(compareVersions('11.9.0', '11.10.0')).toBe(-1);
    expect(compareVersions('11.10.0', '11.10.0')).toBe(0);
    expect(compareVersions('11.10', '11.9.0')).toBe(1);
    expect(compareVersions('11.9', '11.9.1')).toBe(-1);
    expect(compareVersions('11.9.1', '11.9')).toBe(1);
  });
});
