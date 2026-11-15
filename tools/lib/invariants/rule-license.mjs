import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_ALLOWLIST = [
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Python-2.0',
];

/**
 * Checks if a licence string satisfies the allowlist (supports SPDX OR expressions)
 * @param {string} licenseStr
 * @param {Set<string>} allowlist
 * @returns {boolean}
 */
export function isLicenseAllowed(licenseStr, allowlist) {
  if (!licenseStr || typeof licenseStr !== 'string') return false;

  const normalized = licenseStr.replace(/[()]/g, '').trim();

  // Handle SPDX OR expressions: any branch allowlisted passes
  if (normalized.includes(' OR ')) {
    const branches = normalized.split(' OR ').map((b) => b.trim());
    return branches.some((branch) => allowlist.has(branch));
  }

  return allowlist.has(normalized);
}

/**
 * Checks INV-LICENSE rule
 * @param {string} root
 * @param {any} [config]
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvLicense(root, config = {}) {
  /** @type {Array<{ rule: string, path: string, line: number, message: string }>} */
  const findings = [];
  const lockPath = path.join(root, 'package-lock.json');
  if (!fs.existsSync(lockPath)) {
    return [];
  }

  const allowlist = new Set(config?.licenseAllowlist || DEFAULT_ALLOWLIST);

  let lockData;
  try {
    lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch {
    return [];
  }

  const packages = lockData.packages || {};
  for (const [pkgPath, pkg] of Object.entries(packages)) {
    if (pkgPath === '' || pkg.link === true) continue;
    if (!pkgPath.startsWith('node_modules/')) continue;
    if (pkg.dev === true) continue;

    const license = pkg.license;
    if (!license || !isLicenseAllowed(license, allowlist)) {
      findings.push({
        rule: 'INV-LICENSE',
        path: 'package-lock.json',
        line: 1,
        message: `Production dependency '${pkgPath}' has non-allowlisted licence '${license || 'UNKNOWN'}'`,
      });
    }
  }

  return findings;
}
