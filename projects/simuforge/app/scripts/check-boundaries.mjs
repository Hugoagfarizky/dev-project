import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';

const forbiddenImports = new Set([
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime'
]);

const forbiddenGlobals = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'HTMLElement',
  'HTMLCanvasElement',
  'HTMLDivElement'
]);

function parseArgs(argv) {
  let scanPath = 'src/world';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') {
      const root = argv[i + 1];
      if (!root) {
        console.error('--root requires a directory');
        process.exit(1);
      }
      scanPath = path.join(root, 'src', 'world');
      if (!existsSync(scanPath)) {
        scanPath = root;
      }
      i += 1;
    } else if (!argv[i].startsWith('--')) {
      scanPath = argv[i];
    }
  }
  return scanPath;
}

function collectFiles(directory) {
  const result = [];
  if (!existsSync(directory)) {
    return result;
  }
  const stat = statSync(directory);
  if (stat.isFile()) {
    return [directory];
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx|mts|cts)$/.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

function isForbiddenGlobalIdentifier(node) {
  if (!ts.isIdentifier(node)) {
    return false;
  }
  if (!forbiddenGlobals.has(node.text)) {
    return false;
  }
  const parent = node.parent;
  if (parent && ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }
  if (parent && ts.isQualifiedName(parent) && parent.right === node) {
    return false;
  }
  return true;
}

function checkFile(filePath) {
  const sourceText = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const violations = [];

  function visit(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (
        forbiddenImports.has(specifier) ||
        specifier.startsWith('@babylonjs/') ||
        specifier.startsWith('react/') ||
        specifier === 'react-dom'
      ) {
        violations.push(`${filePath}: forbidden import "${specifier}"`);
      }
    }

    if (isForbiddenGlobalIdentifier(node)) {
      violations.push(`${filePath}: forbidden DOM/global reference "${node.text}"`);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

const scanPath = parseArgs(process.argv.slice(2));
const files = collectFiles(scanPath);

if (files.length === 0) {
  console.log(`Boundary check: no source files found in ${scanPath}`);
  process.exit(0);
}

const violations = files.flatMap(checkFile);

if (violations.length > 0) {
  console.error('Boundary check failed:');
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  process.exit(1);
}

console.log(`Boundary check passed: ${files.length} file(s) scanned in ${scanPath}`);
