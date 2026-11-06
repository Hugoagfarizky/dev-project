import { readFileSync } from 'node:fs';

const tokensPath = new URL('../src/styles/tokens.css', import.meta.url);
const css = readFileSync(tokensPath, 'utf8');

const tokenPattern = /--([A-Za-z0-9-]+)\s*:\s*([^;]+);/g;
const tokens = new Map();
let match;
while ((match = tokenPattern.exec(css)) !== null) {
  tokens.set(`--${match[1]}`, match[2].trim());
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground, background) {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) {
    return null;
  }
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const backgrounds = ['--sf-bg-raised', '--sf-bg-panel', '--sf-bg-canvas'];
const normalTextTokens = ['--sf-text-primary', '--sf-text-secondary', '--sf-text-tertiary'];

let failed = false;
for (const backgroundToken of backgrounds) {
  const background = tokens.get(backgroundToken);
  for (const textToken of normalTextTokens) {
    const foreground = tokens.get(textToken);
    const ratio = contrast(foreground, background);
    if (ratio === null) {
      continue;
    }
    const status = ratio >= 4.5 ? 'PASS' : 'FAIL';
    console.log(`${textToken} on ${backgroundToken}: ${ratio.toFixed(2)}:1 ${status}`);
    if (ratio < 4.5) {
      failed = true;
    }
  }
}

if (failed) {
  console.error('Token contrast check failed: normal text must be at least 4.5:1');
  process.exit(1);
}

console.log('Token contrast check passed');
