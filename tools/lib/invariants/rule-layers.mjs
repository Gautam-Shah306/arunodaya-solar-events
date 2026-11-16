import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const BANNED_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'indexedDB',
  'process',
]);

/**
 * Checks INV-LAYERS rule on a file
 * @param {string} root
 * @param {string} relPath
 * @param {any} [config]
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvLayers(root, relPath, config = {}) {
  const fullPath = path.join(root, relPath);
  const ext = path.extname(relPath);
  if (!['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(ext)) {
    return [];
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const sourceFile = ts.createSourceFile(fullPath, content, ts.ScriptTarget.Latest, true);
  /** @type {Array<{ rule: string, path: string, line: number, message: string }>} */
  const findings = [];

  const isEngine = relPath.startsWith('packages/engine/');
  const isContracts = relPath.startsWith('packages/contracts/');
  const isThemes = relPath.startsWith('packages/themes/');
  const isPackage = relPath.startsWith('packages/');
  const isPurePackageSrc =
    relPath.startsWith('packages/engine/src/') ||
    relPath.startsWith('packages/contracts/src/') ||
    relPath.startsWith('packages/themes/src/');

  const allowedContractsPackages = new Set(config?.contractsAllowedPackages || []);

  /**
   * @param {string} specifier
   * @param {number} lineNum
   */
  function checkImportSpecifier(specifier, lineNum) {
    // Nothing under packages may import from apps
    if (isPackage) {
      if (
        specifier === '@arunodaya/app' ||
        specifier.startsWith('@arunodaya/app/') ||
        specifier.includes('/apps/') ||
        specifier.includes('\\apps\\')
      ) {
        findings.push({
          rule: 'INV-LAYERS',
          path: relPath,
          line: lineNum,
          message: `Package layer violation: packages cannot import from apps ('${specifier}')`,
        });
        return;
      }
    }

    // Engine: relative modules, @arunodaya/contracts, or path-scoped external allowances
    if (isEngine) {
      const isRelative = specifier.startsWith('.');
      const isContractsImport =
        specifier === '@arunodaya/contracts' || specifier.startsWith('@arunodaya/contracts/');
      if (!isRelative && !isContractsImport) {
        const externalAllow = config?.layers?.externalAllow || [];
        const isAllowed = externalAllow.some(
          (/** @type {{ package: string, path: string }} */ entry) => {
            if (entry.package !== specifier && !specifier.startsWith(entry.package + '/')) {
              return false;
            }
            if (!entry.path.startsWith('packages/engine/')) {
              return false;
            }
            if (entry.path.endsWith('/')) {
              return relPath.startsWith(entry.path);
            }
            return relPath === entry.path;
          },
        );

        if (!isAllowed) {
          findings.push({
            rule: 'INV-LAYERS',
            path: relPath,
            line: lineNum,
            message: `Engine layer violation: engine may only import relative modules and @arunodaya/contracts ('${specifier}')`,
          });
        }
      }
    }

    // Contracts: relative modules only (plus allowed external packages in config)
    if (isContracts) {
      const isRelative = specifier.startsWith('.');
      const isAllowedExt = allowedContractsPackages.has(specifier);
      if (!isRelative && !isAllowedExt) {
        findings.push({
          rule: 'INV-LAYERS',
          path: relPath,
          line: lineNum,
          message: `Contracts layer violation: contracts may only import relative modules ('${specifier}')`,
        });
      }
    }

    // Themes: relative modules only
    if (isThemes) {
      const isRelative = specifier.startsWith('.');
      if (!isRelative) {
        findings.push({
          rule: 'INV-LAYERS',
          path: relPath,
          line: lineNum,
          message: `Themes layer violation: themes may only import relative modules ('${specifier}')`,
        });
      }
    }
  }

  /**
   * @param {ts.Node} node
   */
  function visit(node) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const lineNum = line + 1;

    // Static imports: import ... from '...'
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      checkImportSpecifier(node.moduleSpecifier.text, lineNum);
    }

    // Static exports with module specifier: export ... from '...'
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      checkImportSpecifier(node.moduleSpecifier.text, lineNum);
    }

    // Dynamic imports: import('...') or require('...')
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          checkImportSpecifier(arg.text, lineNum);
        }
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require' &&
        node.arguments.length > 0
      ) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          checkImportSpecifier(arg.text, lineNum);
        }
      }
    }

    // DOM / Host globals check in pure packages
    if (isPurePackageSrc && ts.isIdentifier(node) && BANNED_GLOBALS.has(node.text)) {
      // Ignore if it's the property name of a property access (e.g. obj.document)
      const parent = node.parent;
      const isPropAccessName = ts.isPropertyAccessExpression(parent) && parent.name === node;
      const isPropertyAssignment = ts.isPropertyAssignment(parent) && parent.name === node;
      const isMethodDecl = ts.isMethodDeclaration(parent) && parent.name === node;
      const isTypeRef = ts.isTypeReferenceNode(parent) || ts.isTypeReferenceNode(parent?.parent);

      if (!isPropAccessName && !isPropertyAssignment && !isMethodDecl && !isTypeRef) {
        findings.push({
          rule: 'INV-LAYERS',
          path: relPath,
          line: lineNum,
          message: `Host/DOM global '${node.text}' is prohibited inside pure domain packages`,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}
