export const REPO_BASE_PATH = '/arunodaya-solar-events/';

/**
 * Resolves the URL base path for a build target
 * @param {'pages' | 'android' | 'dev'} target
 * @returns {string}
 */
export function resolveBase(target) {
  if (target === 'pages') {
    return REPO_BASE_PATH;
  }
  if (target === 'android') {
    return './';
  }
  if (target === 'dev') {
    return '/';
  }
  throw new Error(`Unknown build target: ${target}`);
}
