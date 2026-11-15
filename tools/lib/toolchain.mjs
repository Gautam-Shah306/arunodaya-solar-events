/**
 * Compares two semantic version strings (e.g. '11.10.0' vs '11.9.0')
 * @param {string} a
 * @param {string} b
 * @returns {number} 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareVersions(a, b) {
  const cleanA = a.replace(/^v/, '');
  const cleanB = b.replace(/^v/, '');

  const partsA = cleanA.split('.').map((p) => parseInt(p, 10) || 0);
  const partsB = cleanB.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

/**
 * Validates Node and npm versions
 * @param {{ nodeVersion: string, npmVersion: string }} param0
 * @returns {string[]} List of error strings, empty if valid
 */
export function evaluateToolchain({ nodeVersion, npmVersion }) {
  const errors = [];

  const cleanNode = nodeVersion.replace(/^v/, '');
  const nodeParts = cleanNode.split('.').map((p) => parseInt(p, 10));
  const nodeMajor = nodeParts[0];

  if (nodeMajor !== 24) {
    errors.push(`Node version must be 24.x, got ${nodeVersion}`);
  }

  const cleanNpm = npmVersion.replace(/^v/, '');
  if (compareVersions(cleanNpm, '11.10.0') < 0) {
    errors.push(`npm version must be >= 11.10.0, got ${npmVersion}`);
  }

  return errors;
}
