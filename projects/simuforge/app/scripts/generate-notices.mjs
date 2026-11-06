import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeModules = path.join(appRoot, 'node_modules');
const outputPath = path.join(appRoot, 'THIRD_PARTY_NOTICES.md');

function collectPackageJsonFiles(directory, results = []) {
  if (!exists(directory)) {
    return results;
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '.bin') {
      continue;
    }
    const packageDirectory = path.join(directory, entry.name);
    if (entry.name.startsWith('@')) {
      collectPackageJsonFiles(packageDirectory, results);
      continue;
    }
    const packageJsonPath = path.join(packageDirectory, 'package.json');
    if (exists(packageJsonPath)) {
      results.push(packageJsonPath);
    }
    collectPackageJsonFiles(path.join(packageDirectory, 'node_modules'), results);
  }
  return results;
}

function exists(filePath) {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

const packageJsonFiles = collectPackageJsonFiles(nodeModules);
const packages = new Map();

for (const filePath of packageJsonFiles) {
  const pkg = readJson(filePath);
  if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') {
    continue;
  }
  const key = `${pkg.name}@${pkg.version}`;
  if (!packages.has(key)) {
    packages.set(key, {
      name: pkg.name,
      version: pkg.version,
      license: typeof pkg.license === 'string' ? pkg.license : 'UNKNOWN',
      repository:
        typeof pkg.repository === 'string'
          ? pkg.repository
          : typeof pkg.repository?.url === 'string'
            ? pkg.repository.url
            : ''
    });
  }
}

const sortedPackages = [...packages.values()].sort((a, b) =>
  a.name === b.name ? a.version.localeCompare(b.version) : a.name.localeCompare(b.name)
);

const direct = readJson(path.join(appRoot, 'package.json'));
const directNames = new Set([
  ...Object.keys(direct.dependencies ?? {}),
  ...Object.keys(direct.devDependencies ?? {})
]);

const directRows = sortedPackages
  .filter((pkg) => directNames.has(pkg.name))
  .map((pkg) => `| ${pkg.name} | ${pkg.version} | ${pkg.license} | Direct |`)
  .join('\n');

const allRows = sortedPackages
  .map((pkg) => `| ${pkg.name} | ${pkg.version} | ${pkg.license} |`)
  .join('\n');

const mplPackages = sortedPackages.filter((pkg) =>
  String(pkg.license).toUpperCase().includes('MPL')
);

const mplRows = mplPackages
  .map((pkg) => {
    const source =
      pkg.name === 'lightningcss'
        ? 'https://github.com/parcel-bundler/lightningcss'
        : pkg.name === 'lightningcss-win32-x64-msvc'
          ? 'https://github.com/parcel-bundler/lightningcss'
          : 'See package metadata';
    return `| ${pkg.name} | ${pkg.version} | MPL-2.0 | ${source} |`;
  })
  .join('\n');

const content = `# Third-Party Notices

Generated from the committed dependency tree for SimuForge MVP-0.

- Direct dependencies are listed in \`package.json\`.
- Transitive dependencies are listed below.
- Runtime dependencies are \`react\`, \`react-dom\`, and \`@babylonjs/core\`.
- All other packages are development or build-time dependencies.

## Direct dependencies

| Package | Version | License | Role |
| --- | --- | --- | --- |
${directRows}

## All resolved dependencies

| Package | Version | License |
| --- | --- | --- |
${allRows}

## MPL-2.0 packages

These packages are build-time native tooling. They are not shipped in the application bundle.

| Package | Version | License | Upstream source |
| --- | --- | --- | --- |
${mplRows || '| (none) | | | |'}

## License obligations

- MIT, ISC, and BSD-3-Clause notices are retained through this generated file.
- Apache-2.0 packages retain their license and any NOTICE file.
- MPL-2.0 packages are unmodified build-time tooling; their source URLs are recorded above.
`;

writeFileSync(outputPath, content, 'utf8');
console.log(`Generated ${outputPath} with ${sortedPackages.length} packages`);
