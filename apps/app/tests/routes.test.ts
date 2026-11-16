import { describe, expect, it } from 'vitest';
import { parseRoute, ROUTES, routeToHash } from '../src/app/routes.js';

describe('Hash Routing', () => {
  it('parseRoute maps hashes to the five sections and defaults to home', () => {
    expect(parseRoute('#home')).toBe('home');
    expect(parseRoute('#forecast')).toBe('forecast');
    expect(parseRoute('#astronomy')).toBe('astronomy');
    expect(parseRoute('#locations')).toBe('locations');
    expect(parseRoute('#settings')).toBe('settings');

    // Without leading '#'
    expect(parseRoute('forecast')).toBe('forecast');

    // Defaults to home on empty or root hash
    expect(parseRoute('')).toBe('home');
    expect(parseRoute('#')).toBe('home');
  });

  it('parseRoute ignores unknown names', () => {
    expect(parseRoute('#unknown')).toBe('home');
    expect(parseRoute('#settings-sidebar')).toBe('home');
    expect(parseRoute('#profile')).toBe('home');
    expect(parseRoute('#!/bad/path')).toBe('home');
  });

  it('routeToHash round trips every route', () => {
    for (const route of ROUTES) {
      const hash = routeToHash(route);
      expect(hash).toBe(`#${route}`);
      expect(parseRoute(hash)).toBe(route);
    }
  });
});
