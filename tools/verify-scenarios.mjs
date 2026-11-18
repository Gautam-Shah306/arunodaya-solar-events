#!/usr/bin/env node
import { checkScenarios } from './lib/scenarios.mjs';

const result = checkScenarios();

if (result.missing.length > 0) {
  for (const item of result.missing) {
    console.error(`Missing scenario in ${item.file}: "${item.title}"`);
  }
  console.error(`scenarios: ${result.total} titles, ${result.missing.length} missing`);
  process.exit(1);
}

console.log(`scenarios: ${result.total} titles, 0 missing`);
process.exit(0);
