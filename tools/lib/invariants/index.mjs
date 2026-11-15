import fs from 'node:fs';
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
 * @returns {{ findings: Array<{ rule: string, path: string, line: number, message: string }>, summary: { findingsCount: number, filesScanned: number, filesCount: number, rulesRun: number, rulesCount: number, ruleStats: Record<string, number> } }}
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

  const scannedFiles = new Set();
  const ruleStats = {
    'INV-TIME': 0,
    'INV-CLOCK': 0,
    'INV-COLOR': 0,
    'INV-NET': 0,
    'INV-LAYERS': 0,
    'INV-SECRETS': 0,
    'INV-DEPS': 0,
    'INV-LICENSE': 0,
    'INV-LF': 0,
    'INV-DOCS': 0,
  };

  const rawFindings = [];

  // Code rules
  for (const relPath of codeFiles) {
    scannedFiles.add(relPath);
    ruleStats['INV-TIME']++;
    rawFindings.push(...checkInvTime(resolvedRoot, relPath));
    ruleStats['INV-CLOCK']++;
    rawFindings.push(...checkInvClock(resolvedRoot, relPath));
    ruleStats['INV-COLOR']++;
    rawFindings.push(...checkInvColor(resolvedRoot, relPath));
    ruleStats['INV-NET']++;
    rawFindings.push(...checkInvNet(resolvedRoot, relPath));
    ruleStats['INV-LAYERS']++;
    rawFindings.push(...checkInvLayers(resolvedRoot, relPath, loadedConfig));
  }

  // Repository-wide rules: INV-SECRETS
  for (const relPath of repoFiles) {
    scannedFiles.add(relPath);
  }
  ruleStats['INV-SECRETS'] = repoFiles.length;
  rawFindings.push(...checkInvSecrets(resolvedRoot, repoFiles));

  // INV-DEPS
  const pkgFiles = repoFiles.filter((f) => path.basename(f) === 'package.json');
  for (const relPath of pkgFiles) {
    scannedFiles.add(relPath);
  }
  ruleStats['INV-DEPS'] = pkgFiles.length;
  rawFindings.push(...checkInvDeps(resolvedRoot, repoFiles));

  // INV-LICENSE
  const lockRel = 'package-lock.json';
  if (fs.existsSync(path.join(resolvedRoot, lockRel))) {
    scannedFiles.add(lockRel);
    ruleStats['INV-LICENSE'] = 1;
  }
  rawFindings.push(...checkInvLicense(resolvedRoot, loadedConfig));

  // INV-LF
  const excludeSpec = loadedConfig?.excludeSpecFromLF ?? loadedConfig?.excludeSpec ?? false;
  const lfExts = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.mjs',
    '.cjs',
    '.html',
    '.css',
    '.json',
    '.md',
    '.yml',
    '.yaml',
  ]);
  const lfFiles = repoFiles.filter((f) => {
    if (excludeSpec && f.startsWith('docs/spec/')) return false;
    return lfExts.has(path.extname(f));
  });
  for (const relPath of lfFiles) {
    scannedFiles.add(relPath);
  }
  ruleStats['INV-LF'] = lfFiles.length;
  rawFindings.push(...checkInvLf(resolvedRoot, repoFiles, loadedConfig));

  // INV-DOCS
  const requiredDocs = loadedConfig?.requiredDocs || [
    'README.md',
    'LICENSE',
    'NOTICE',
    'docs/AGENT-RULES.md',
    'docs/TOOLCHAIN.md',
    'docs/ARCHITECTURE.md',
    'docs/PLAN.md',
    'docs/spec/ARUNODAYA-SPEC.md',
    'docs/adr/README.md',
  ];
  for (const doc of requiredDocs) {
    scannedFiles.add(doc.replace(/\\/g, '/'));
  }
  ruleStats['INV-DOCS'] = requiredDocs.length;
  rawFindings.push(...checkInvDocs(resolvedRoot, loadedConfig));

  // Filter against allowlist
  const findings = rawFindings.filter((f) => !isAllowed(loadedConfig, f.rule, f.path));

  const rulesRun = Object.keys(ruleStats).length;

  const summary = {
    findingsCount: findings.length,
    filesScanned: scannedFiles.size,
    filesCount: scannedFiles.size,
    rulesRun,
    rulesCount: rulesRun,
    ruleStats,
  };

  return { findings, summary };
}
