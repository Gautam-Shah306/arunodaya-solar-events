import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const BANNED_TIME_PROPERTIES = new Set([
  'getHours',
  'getMinutes',
  'getSeconds',
  'getMilliseconds',
  'getDate',
  'getDay',
  'getMonth',
  'getFullYear',
  'getYear',
  'setHours',
  'setMinutes',
  'setSeconds',
  'setMilliseconds',
  'setDate',
  'setMonth',
  'setFullYear',
  'getTimezoneOffset',
  'toLocaleString',
  'toLocaleTimeString',
  'toLocaleDateString',
  'toDateString',
  'toTimeString',
]);

/**
 * Checks INV-TIME rule on a file
 * @param {string} root
 * @param {string} relPath
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvTime(root, relPath) {
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

    // Property access: obj.getHours or obj.toLocaleTimeString
    if (ts.isPropertyAccessExpression(node)) {
      const propName = node.name.text;
      if (BANNED_TIME_PROPERTIES.has(propName)) {
        findings.push({
          rule: 'INV-TIME',
          path: relPath,
          line: lineNum,
          message: `Local-time property access '${propName}' is prohibited; all times must use IST (+05:30)`,
        });
      }
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'Intl' &&
        propName === 'DateTimeFormat'
      ) {
        findings.push({
          rule: 'INV-TIME',
          path: relPath,
          line: lineNum,
          message: 'Intl.DateTimeFormat is prohibited outside designated time helpers',
        });
      }
    }

    // Element access: obj['getHours']
    if (ts.isElementAccessExpression(node)) {
      if (ts.isStringLiteral(node.argumentExpression)) {
        const propName = node.argumentExpression.text;
        if (BANNED_TIME_PROPERTIES.has(propName)) {
          findings.push({
            rule: 'INV-TIME',
            path: relPath,
            line: lineNum,
            message: `Local-time property access '${propName}' is prohibited; all times must use IST (+05:30)`,
          });
        }
      }
    }

    // new Date(...) with 2 or more arguments
    if (ts.isNewExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'Date') {
        if (node.arguments && node.arguments.length >= 2) {
          findings.push({
            rule: 'INV-TIME',
            path: relPath,
            line: lineNum,
            message:
              'Multi-argument new Date(...) interprets values in local timezone and is prohibited',
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}
