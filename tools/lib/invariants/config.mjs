import fs from 'node:fs';

/**
 * Validates invariant config structure and allowlist entries
 * @param {any} config
 */
export function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be a valid JSON object');
  }

  if (config.allow !== undefined) {
    if (!Array.isArray(config.allow)) {
      throw new Error('Config allowlist must be an array');
    }

    for (let i = 0; i < config.allow.length; i++) {
      const entry = config.allow[i];
      if (!entry || typeof entry !== 'object') {
        throw new Error(`Allowlist entry at index ${i} must be an object`);
      }
      if (!entry.rule || typeof entry.rule !== 'string') {
        throw new Error(`Allowlist entry at index ${i} is missing rule string`);
      }
      if (!entry.path || typeof entry.path !== 'string') {
        throw new Error(`Allowlist entry at index ${i} is missing path string`);
      }
      if (!entry.reason || typeof entry.reason !== 'string' || entry.reason.trim().length < 10) {
        throw new Error(
          `Allowlist entry for rule ${entry.rule} at index ${i} requires a reason of at least 10 characters`,
        );
      }
    }
  }

  return true;
}

/**
 * Loads and validates invariants config
 * @param {string | object} configPathOrObj
 * @returns {any}
 */
export function loadConfig(configPathOrObj) {
  let config;
  if (typeof configPathOrObj === 'string') {
    if (!fs.existsSync(configPathOrObj)) {
      throw new Error(`Invariants config file not found: ${configPathOrObj}`);
    }
    const raw = fs.readFileSync(configPathOrObj, 'utf8');
    try {
      config = JSON.parse(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Invalid JSON in invariants config: ${msg}`, { cause: e });
    }
  } else {
    config = configPathOrObj;
  }

  validateConfig(config);
  return config;
}

/**
 * Checks whether an invariant rule is suppressed for a relative path
 * @param {any} config
 * @param {string} rule
 * @param {string} relPath Relative path using forward slashes
 * @returns {boolean}
 */
export function isAllowed(config, rule, relPath) {
  if (!config?.allow || !Array.isArray(config.allow)) return false;
  const normalized = relPath.replace(/\\/g, '/');

  for (const entry of config.allow) {
    if (entry.rule !== rule) continue;
    const allowPath = entry.path.replace(/\\/g, '/');
    if (allowPath.endsWith('/')) {
      if (normalized.startsWith(allowPath)) return true;
    } else {
      if (normalized === allowPath) return true;
    }
  }

  return false;
}
