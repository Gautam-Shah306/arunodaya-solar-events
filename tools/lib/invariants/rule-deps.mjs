import fs from 'node:fs';
import path from 'node:path';

const RANGE_CHARS = ['^', '~', '>', '<', '=', '*', 'latest'];

/**
 * Checks INV-DEPS across package.json files
 * @param {string} root
 * @param {string[]} relFiles
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvDeps(root, relFiles) {
  /** @type {Array<{ rule: string, path: string, line: number, message: string }>} */
  const findings = [];
  const pkgFiles = relFiles.filter((f) => path.basename(f) === 'package.json');

  // Find workspace package versions
  const workspaceVersions = new Map();
  for (const relPath of pkgFiles) {
    const fullPath = path.join(root, relPath);
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      if (data.name && data.version) {
        workspaceVersions.set(data.name, data.version);
      }
    } catch {
      // Handled during lint/json parse
    }
  }

  for (const relPath of pkgFiles) {
    const fullPath = path.join(root, relPath);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const lines = raw.split('\n');

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }

    /**
     * @param {any} deps
     * @param {string} sectionName
     */
    const checkDepMap = (deps, sectionName) => {
      if (!deps || typeof deps !== 'object') return;

      for (const [name, ver] of Object.entries(deps)) {
        let lineNum = 1;
        const lineIdx = lines.findIndex((l) => l.includes(`"${name}"`));
        if (lineIdx !== -1) {
          lineNum = lineIdx + 1;
        }

        if (typeof ver !== 'string' || ver.trim() === '') {
          findings.push({
            rule: 'INV-DEPS',
            path: relPath,
            line: lineNum,
            message: `Dependency '${name}' in ${sectionName} has an empty version string`,
          });
          continue;
        }

        const trimmed = ver.trim();

        if (trimmed === 'latest' || trimmed.includes('*')) {
          findings.push({
            rule: 'INV-DEPS',
            path: relPath,
            line: lineNum,
            message: `Dependency '${name}' in ${sectionName} uses unpinned version '${trimmed}'`,
          });
          continue;
        }

        if (RANGE_CHARS.some((char) => trimmed.startsWith(char))) {
          findings.push({
            rule: 'INV-DEPS',
            path: relPath,
            line: lineNum,
            message: `Dependency '${name}' in ${sectionName} uses range version '${trimmed}'; exact pinning required`,
          });
          continue;
        }

        // Workspace package version check
        if (workspaceVersions.has(name)) {
          const expected = workspaceVersions.get(name);
          if (trimmed !== expected) {
            findings.push({
              rule: 'INV-DEPS',
              path: relPath,
              line: lineNum,
              message: `Internal workspace dependency '${name}' specifies '${trimmed}', expected '${expected}'`,
            });
          }
        }
      }
    };

    checkDepMap(data.dependencies, 'dependencies');
    checkDepMap(data.devDependencies, 'devDependencies');
  }

  return findings;
}
