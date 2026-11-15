import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * Checks INV-CLOCK rule
 * @param {string} root
 * @param {string} relPath
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvClock(root, relPath) {
  if (
    !relPath.startsWith('packages/engine/src/') &&
    !relPath.startsWith('packages/contracts/src/')
  ) {
    return [];
  }

  const fullPath = path.join(root, relPath);
  const ext = path.extname(relPath);
  if (!['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(ext)) {
    return [];
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const sourceFile = ts.createSourceFile(fullPath, content, ts.ScriptTarget.Latest, true);
  /** @type {Array<{ rule: string, path: string, line: number, message: string }>} */
  const findings = [];

  /**
   * @param {ts.Node} node
   */
  function visit(node) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const lineNum = line + 1;

    // Date.now
    if (ts.isPropertyAccessExpression(node)) {
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'Date' &&
        node.name.text === 'now'
      ) {
        findings.push({
          rule: 'INV-CLOCK',
          path: relPath,
          line: lineNum,
          message:
            'Direct reading of system clock via Date.now() is prohibited in pure packages; clock must be injected',
        });
      }

      // performance.now
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'performance' &&
        node.name.text === 'now'
      ) {
        findings.push({
          rule: 'INV-CLOCK',
          path: relPath,
          line: lineNum,
          message: 'performance.now() is prohibited in pure packages; clock must be injected',
        });
      }
    }

    // new Date() with 0 arguments
    if (ts.isNewExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'Date') {
        if (!node.arguments || node.arguments.length === 0) {
          findings.push({
            rule: 'INV-CLOCK',
            path: relPath,
            line: lineNum,
            message:
              'Zero-argument new Date() reads system clock and is prohibited in pure packages; clock must be injected',
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}
