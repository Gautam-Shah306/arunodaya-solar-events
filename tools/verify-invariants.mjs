import path from 'node:path';
import { runInvariants } from './lib/invariants/index.mjs';

export function main() {
  const args = process.argv.slice(2);
  let root = process.cwd();
  let jsonOutput = false;
  let verbose = false;
  /** @type {string | undefined} */
  let configPath;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--root') {
      root = args[++i] ?? '';
      if (!root) {
        console.error('Usage error: --root requires a directory argument');
        process.exit(2);
      }
    } else if (arg === '--config') {
      configPath = args[++i];
      if (!configPath) {
        console.error('Usage error: --config requires a file argument');
        process.exit(2);
      }
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (arg === '--verbose') {
      verbose = true;
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  let result;
  try {
    const opts = {
      root: path.resolve(root),
      ...(configPath ? { config: configPath } : {}),
    };
    result = runInvariants(opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (jsonOutput) {
      console.error(JSON.stringify({ error: msg }));
    } else {
      console.error(`Invariants verification error: ${msg}`);
    }
    process.exit(2);
  }

  const { findings, summary } = result;

  if (jsonOutput) {
    console.log(JSON.stringify({ findings, summary }, null, 2));
  } else {
    if (findings.length > 0) {
      console.error('Invariants violations found:');
      for (const f of findings) {
        console.error(`  [${f.rule}] ${f.path}:${f.line} - ${f.message}`);
      }
    }
    if (verbose && summary.ruleStats) {
      console.log('Invariants rule execution breakdown:');
      for (const [rule, count] of Object.entries(summary.ruleStats)) {
        console.log(`  ${rule}: ${count} file(s) scanned`);
      }
    }
    console.log(
      `invariants: ${summary.findingsCount} findings across ${summary.filesScanned} files scanned (${summary.rulesRun} rules run)`,
    );
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
) {
  main();
}
