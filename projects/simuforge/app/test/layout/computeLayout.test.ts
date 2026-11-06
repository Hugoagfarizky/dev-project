import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout } from '../../src/ui/shell/computeLayout.ts';

test('computeLayout keeps the viewport usable at 1024 x 640', () => {
  const layout = computeLayout({ width: 1024, height: 640, preset: 'build' });
  assert.equal(layout.tooSmall, false);
  assert.equal(layout.compact, true);
  assert.ok(layout.viewportWidth >= 300);
  assert.ok(layout.viewportHeight >= 300);
});

test('computeLayout marks small viewports as too small', () => {
  const layout = computeLayout({ width: 1023, height: 639, preset: 'build' });
  assert.equal(layout.tooSmall, true);
});

test('computeLayout expands Program in the program preset', () => {
  const layout = computeLayout({ width: 1440, height: 900, preset: 'program' });
  assert.equal(layout.collapsed.program, false);
  assert.equal(layout.programHeight, 320);
});

test('computeLayout collapses Program in the build preset', () => {
  const layout = computeLayout({ width: 1440, height: 900, preset: 'build' });
  assert.equal(layout.collapsed.program, true);
  assert.equal(layout.programHeight, 32);
});
