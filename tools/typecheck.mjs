import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();

/**
 * Discovers all tsconfig.json paths under apps, packages, and tools
 * @returns {string[]}
 */
export function findTsconfigs() {
  const configs = [];
  const searchDirs = ['apps', 'packages', 'tools'];

  for (const dir of searchDirs) {
    const fullDir = path.join(rootDir, dir);
    if (!existsSync(fullDir)) continue;

    if (dir === 'tools') {
      const toolConfig = path.join(fullDir, 'tsconfig.json');
      if (existsSync(toolConfig)) {
        configs.push(toolConfig);
      }
      continue;
    }

    const entries = readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const candidate = path.join(fullDir, entry.name, 'tsconfig.json');
        if (existsSync(candidate)) {
          configs.push(candidate);
        }
      }
    }
  }

  return configs;
}

/**
 * Runs typecheck for all projects
 * @returns {number} Exit code
 */
export function runTypecheck() {
  const configs = findTsconfigs();
  let failed = 0;

  console.log(`Typechecking ${configs.length} project(s)...`);

  const tscBin = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');

  for (const config of configs) {
    const relative = path.relative(rootDir, config);
    process.stdout.write(`  [CHECK] ${relative}... `);

    const result = spawnSync(process.execPath, [tscBin, '--noEmit', '-p', config], {
      cwd: rootDir,
      encoding: 'utf8',
    });

    if (result.status === 0) {
      console.log('PASS');
    } else {
      console.log('FAIL');
      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.error(result.stderr);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`Typecheck failed: ${failed} project(s) failed.`);
    return 1;
  }

  console.log('Typecheck passed for all projects.');
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
) {
  process.exit(runTypecheck());
}
