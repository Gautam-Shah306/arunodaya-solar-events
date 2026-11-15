import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const HEX_COLOR_REGEX = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/;
const COLOR_FUNC_REGEX = /\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\s*\(/i;

/**
 * Checks INV-COLOR rule on a file
 * @param {string} root
 * @param {string} relPath
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvColor(root, relPath) {
  if (relPath.startsWith('packages/themes/')) {
    return [];
  }

  const fullPath = path.join(root, relPath);
  const ext = path.extname(relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  /** @type {Array<{ rule: string, path: string, line: number, message: string }>} */
  const findings = [];

  // Plain CSS / HTML analysis
  if (ext === '.css' || ext === '.html') {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i] ?? '';
      if (HEX_COLOR_REGEX.test(lineText)) {
        findings.push({
          rule: 'INV-COLOR',
          path: relPath,
          line: i + 1,
          message: `Hex color literal found in ${ext} outside packages/themes`,
        });
      }
      if (COLOR_FUNC_REGEX.test(lineText)) {
        findings.push({
          rule: 'INV-COLOR',
          path: relPath,
          line: i + 1,
          message: `Color function found in ${ext} outside packages/themes`,
        });
      }
    }
    return findings;
  }

  // TS / JS files: parse with TypeScript AST
  if (['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(ext)) {
    const sourceFile = ts.createSourceFile(fullPath, content, ts.ScriptTarget.Latest, true);

    /**
     * @param {string} text
     * @param {ts.Node} node
     */
    function checkText(text, node) {
      if (HEX_COLOR_REGEX.test(text)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        findings.push({
          rule: 'INV-COLOR',
          path: relPath,
          line: line + 1,
          message: `Hex color literal '${text}' found outside packages/themes`,
        });
      }
      if (COLOR_FUNC_REGEX.test(text)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        findings.push({
          rule: 'INV-COLOR',
          path: relPath,
          line: line + 1,
          message: `Color function found in string '${text}' outside packages/themes`,
        });
      }
    }

    /**
     * @param {ts.Node} node
     */
    function visit(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        checkText(node.text, node);
      } else if (ts.isTemplateExpression(node)) {
        checkText(node.head.text, node.head);
        for (const span of node.templateSpans) {
          checkText(span.literal.text, span.literal);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return findings;
}
