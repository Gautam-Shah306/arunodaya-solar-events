import path from 'node:path';
import { isAllowed, loadConfig } from './config.mjs';
import { walkCodeFiles, walkRepoFiles } from './walk.mjs';
import { checkInvTime } from './rule-time.mjs';
import { checkInvClock } from './rule-clock.mjs';
import { checkInvColor } from './rule-color.mjs';
import { checkInvNet } from './rule-net.mjs';
import { checkInvLayers } from './rule-layers.mjs';
import { checkInvSecrets } from './rule-secrets.mjs';
import { checkInvDeps } from './rule-deps.mjs';
import { checkInvLicense } from './rule-license.mjs';
import { checkInvLf } from './rule-lf.mjs';
import { checkInvDocs } from './rule-docs.mjs';

/**
 * Executes repository invariants verification
 * @param {{ root?: string, config?: object | string }} options
 * @returns {{ findings: Array<{ rule: string, path: string, line: number, message: string }>, summary: { findingsCount: number, filesCount: number, rulesCount: number } }}
 */
export function runInvariants({ root = process.cwd(), config } = {}) {
  const resolvedRoot = path.resolve(root);

  let loadedConfig;
  if (!config) {
    const configPath = path.join(resolvedRoot, 'tools', 'invariants.config.json');
    loadedConfig = loadConfig(configPath);
  } else {
    loadedConfig = loadConfig(config);
  }

  const repoFiles = walkRepoFiles(resolvedRoot);
  const codeFiles = walkCodeFiles(resolvedRoot);

  const rawFindings = [];

  // Code rules
  for (const relPath of codeFiles) {
    rawFindings.push(...checkInvTime(resolvedRoot, relPath));
    rawFindings.push(...checkInvClock(resolvedRoot, relPath));
    rawFindings.push(...checkInvColor(resolvedRoot, relPath));
    rawFindings.push(...checkInvNet(resolvedRoot, relPath));
    rawFindings.push(...checkInvLayers(resolvedRoot, relPath, loadedConfig));
  }

  // Repository-wide rules
  rawFindings.push(...checkInvSecrets(resolvedRoot, repoFiles));
  rawFindings.push(...checkInvDeps(resolvedRoot, repoFiles));
  rawFindings.push(...checkInvLicense(resolvedRoot, loadedConfig));
  rawFindings.push(...checkInvLf(resolvedRoot, repoFiles, loadedConfig));
  rawFindings.push(...checkInvDocs(resolvedRoot, loadedConfig));

  // Filter against allowlist
  const findings = rawFindings.filter((f) => !isAllowed(loadedConfig, f.rule, f.path));

  const uniqueFiles = new Set(findings.map((f) => f.path));
  const uniqueRules = new Set(findings.map((f) => f.rule));

  const summary = {
    findingsCount: findings.length,
    filesCount: uniqueFiles.size,
    rulesCount: uniqueRules.size,
  };

  return { findings, summary };
}
