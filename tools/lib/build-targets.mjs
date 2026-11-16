import path from 'node:path';

export const REPO_BASE_PATH = '/arunodaya-solar-events/';

/**
 * Checks whether the build target enables debug tools and features
 * @param {'pages' | 'android' | 'dev'} target
 * @returns {boolean}
 */
export function isDebugBuild(target) {
  if (target === 'pages' || target === 'dev') {
    return true;
  }
  if (target === 'android') {
    return false;
  }
  throw new Error(`Unknown build target: ${target}`);
}

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

/**
 * Resolves the HTML entry points for a build target
 * @param {'pages' | 'android' | 'dev'} target
 * @param {string} appRoot
 * @returns {Record<string, string>}
 */
export function resolveHtmlInputs(target, appRoot) {
  if (target === 'pages' || target === 'dev') {
    return {
      main: path.join(appRoot, 'index.html'),
      themes: path.join(appRoot, 'themes.html'),
      components: path.join(appRoot, 'components.html'),
    };
  }
  if (target === 'android') {
    return {
      main: path.join(appRoot, 'index.html'),
    };
  }
  throw new Error(`Unknown build target: ${target}`);
}
