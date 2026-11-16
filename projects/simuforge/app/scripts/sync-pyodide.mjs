import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const appRoot = join(root, '..');
const src = join(appRoot, 'node_modules', 'pyodide');
const dest = join(appRoot, 'public', 'pyodide');

if (!existsSync(src)) {
  console.error('pyodide is not installed. Run npm install first.');
  process.exit(1);
}

if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('Synced pyodide to', dest);
