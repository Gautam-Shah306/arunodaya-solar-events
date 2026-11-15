import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ALLOWED_URLS = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/1999/xhtml',
]);

const BANNED_NEW_OBJECTS = new Set(['XMLHttpRequest', 'WebSocket', 'EventSource']);

/**
 * Checks INV-NET rule on a file
 * @param {string} root
 * @param {string} relPath
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvNet(root, relPath) {
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

    // new XMLHttpRequest, new WebSocket, new EventSource
    if (ts.isNewExpression(node)) {
      if (ts.isIdentifier(node.expression) && BANNED_NEW_OBJECTS.has(node.expression.text)) {
        findings.push({
          rule: 'INV-NET',
          path: relPath,
          line: lineNum,
          message: `Network API 'new ${node.expression.text}' is prohibited at runtime`,
        });
      }
    }

    // navigator.sendBeacon
    if (ts.isPropertyAccessExpression(node)) {
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'navigator' &&
        node.name.text === 'sendBeacon'
      ) {
        findings.push({
          rule: 'INV-NET',
          path: relPath,
          line: lineNum,
          message: "Network beacon API 'navigator.sendBeacon' is prohibited",
        });
      }
    }

    // calls to fetch(), window.fetch(), globalThis.fetch()
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'fetch') {
        findings.push({
          rule: 'INV-NET',
          path: relPath,
          line: lineNum,
          message: "Network call to 'fetch()' is prohibited at runtime",
        });
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        const expr = node.expression;
        if (
          ts.isIdentifier(expr.expression) &&
          (expr.expression.text === 'window' || expr.expression.text === 'globalThis') &&
          expr.name.text === 'fetch'
        ) {
          findings.push({
            rule: 'INV-NET',
            path: relPath,
            line: lineNum,
            message: `Network call to '${expr.expression.text}.fetch()' is prohibited at runtime`,
          });
        }
      }
    }

    // String literals starting with http:// or https://
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const val = node.text;
      if (val.startsWith('http://') || val.startsWith('https://')) {
        if (!ALLOWED_URLS.has(val)) {
          findings.push({
            rule: 'INV-NET',
            path: relPath,
            line: lineNum,
            message: `Remote URL literal '${val}' is prohibited at runtime`,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}
