import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const IGNORED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.scratch', '.git', '.vitest']);

/**
 * Recursively walks directory to find all test files.
 * @param {string} dir
 * @returns {string[]}
 */
export function findTestFiles(dir) {
  /** @type {string[]} */
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      results.push(...findTestFiles(path.join(dir, entry.name)));
    } else if (entry.isFile()) {
      const name = entry.name;
      if (
        (name.includes('.test.') || name.includes('.e2e.test.')) &&
        /\.(ts|tsx|mjs|js)$/.test(name)
      ) {
        results.push(path.join(dir, name));
      }
    }
  }

  return results;
}

/**
 * Extracts test titles from a single source file using the TypeScript compiler API.
 * @param {string} filePath
 * @param {string} [content]
 * @returns {string[]}
 */
export function extractTitlesFromFile(filePath, content) {
  const sourceText = content ?? fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

  /** @type {string[]} */
  const titles = [];

  /** @param {ts.Node} node */
  function visit(node) {
    if (ts.isCallExpression(node)) {
      let isTestCall = false;
      const expr = node.expression;

      if (ts.isIdentifier(expr)) {
        if (expr.text === 'it' || expr.text === 'test') {
          isTestCall = true;
        }
      } else if (ts.isPropertyAccessExpression(expr)) {
        if (ts.isIdentifier(expr.expression)) {
          const base = expr.expression.text;
          if (base === 'it' || base === 'test') {
            isTestCall = true;
          }
        }
      }

      if (isTestCall && node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        if (
          firstArg &&
          (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg))
        ) {
          titles.push(firstArg.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return titles;
}

/**
 * Collects all test titles across the repository.
 * @param {string} root
 * @returns {Set<string>}
 */
export function collectTestTitles(root) {
  const testFiles = findTestFiles(root);
  const titles = new Set();

  for (const file of testFiles) {
    const extracted = extractTitlesFromFile(file);
    for (const t of extracted) {
      titles.add(t);
    }
  }

  return titles;
}

/**
 * Reads all scenario definitions from text files in scenariosDir.
 * @param {string} dir
 * @returns {Array<{ file: string, title: string }>}
 */
export function loadScenarioFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .sort();
  const scenarios = [];

  for (const file of entries) {
    const fullPath = path.join(dir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      scenarios.push({ file, title: trimmed });
    }
  }

  return scenarios;
}

/**
 * Checks all scenario titles against collected test titles.
 * @param {{ root?: string, scenariosDir?: string }} [options]
 * @returns {{ missing: Array<{ file: string, title: string }>, total: number, passed: boolean }}
 */
export function checkScenarios(options = {}) {
  const root = options.root ?? path.resolve('.');
  const scenariosDir = options.scenariosDir ?? path.join(root, 'tools', 'scenarios');

  const collected = collectTestTitles(root);
  const scenarios = loadScenarioFiles(scenariosDir);

  const missing = [];
  for (const sc of scenarios) {
    if (!collected.has(sc.title)) {
      missing.push(sc);
    }
  }

  return {
    missing,
    total: scenarios.length,
    passed: missing.length === 0,
  };
}
