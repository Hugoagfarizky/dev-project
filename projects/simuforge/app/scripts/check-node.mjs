import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packageJsonUrl = new URL('../package.json', import.meta.url);
const packageJson = JSON.parse(readFileSync(packageJsonUrl, 'utf8'));
const requiredNode = packageJson.engines?.node;
const actualNode = process.version.replace(/^v/, '');

if (typeof requiredNode !== 'string' || requiredNode.length === 0) {
  console.error('package.json must declare engines.node');
  process.exit(1);
}

if (actualNode !== requiredNode) {
  console.error(`Node version mismatch: required ${requiredNode}, actual ${actualNode}`);
  process.exit(1);
}

console.log(`Node version OK: v${actualNode}`);
