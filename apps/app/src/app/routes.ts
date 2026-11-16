export const ROUTES = ['home', 'forecast', 'astronomy', 'locations', 'settings'] as const;

export type Route = (typeof ROUTES)[number];

const VALID_ROUTE_SET = new Set<string>(ROUTES);

/**
 * Parses a URL hash string into one of the 5 canonical application routes.
 * Defaults to 'home' on empty, unknown, or malformed hashes.
 *
 * @param hash URL hash (e.g. '#home', '#forecast', 'astronomy')
 */
export function parseRoute(hash: string): Route {
  if (!hash || typeof hash !== 'string') {
    return 'home';
  }

  // Strip leading '#'
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;

  // Filter strictly to ASCII letters, digits, and hyphens
  const cleaned = raw.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();

  if (VALID_ROUTE_SET.has(cleaned)) {
    return cleaned as Route;
  }

  return 'home';
}

/**
 * Converts a Route identifier to its corresponding URL hash string.
 * @param route Route identifier
 */
export function routeToHash(route: Route): string {
  return `#${route}`;
}
