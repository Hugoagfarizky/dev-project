import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, resolveCollapsedPanels } from '../../src/ui/shell/computeLayout.ts';

test('computeLayout keeps the viewport usable at 1024 x 640', () => {
  const layout = computeLayout({ width: 1024, height: 640, preset: 'build' });
  assert.equal(layout.tooSmall, false);
  assert.equal(layout.compact, true);
  assert.ok(layout.viewportWidth >= 300);
  assert.ok(layout.viewportHeight >= 300);
  assert.equal(layout.collapsed.program, true);
  assert.equal(layout.collapsed.console, true);
});

test('computeLayout marks small viewports as too small', () => {
  const layout = computeLayout({ width: 1023, height: 639, preset: 'build' });
  assert.equal(layout.tooSmall, true);
});

test('computeLayout expands Program in the program preset', () => {
  const layout = computeLayout({ width: 1440, height: 900, preset: 'program' });
  assert.equal(layout.presetCollapsed.program, false);
  assert.equal(layout.collapsed.program, false);
  assert.equal(layout.programHeight, 320);
});

test('computeLayout collapses Program in the build preset', () => {
  const layout = computeLayout({ width: 1440, height: 900, preset: 'build' });
  assert.equal(layout.presetCollapsed.program, true);
  assert.equal(layout.collapsed.program, true);
  assert.equal(layout.programHeight, 320);
});

test('resolveCollapsedPanels lets false override a true preset default', () => {
  const result = resolveCollapsedPanels({
    presetCollapsed: { assets: false, monitor: true, program: true, console: true },
    responsiveCollapsed: { assets: false, monitor: false, program: false, console: false },
    userOverrides: { assets: null, monitor: null, program: false, console: null }
  });
  assert.equal(result.program, false);
});

test('resolveCollapsedPanels lets true override a false preset default', () => {
  const result = resolveCollapsedPanels({
    presetCollapsed: { assets: false, monitor: true, program: false, console: true },
    responsiveCollapsed: { assets: false, monitor: false, program: false, console: false },
    userOverrides: { assets: null, monitor: null, program: true, console: null }
  });
  assert.equal(result.program, true);
});

test('resolveCollapsedPanels gives responsive constraints precedence', () => {
  const result = resolveCollapsedPanels({
    presetCollapsed: { assets: false, monitor: true, program: false, console: true },
    responsiveCollapsed: { assets: false, monitor: false, program: true, console: false },
    userOverrides: { assets: null, monitor: null, program: false, console: null }
  });
  assert.equal(result.program, true);
});

test('resolveCollapsedPanels uses preset defaults for null overrides', () => {
  const result = resolveCollapsedPanels({
    presetCollapsed: { assets: false, monitor: true, program: true, console: true },
    responsiveCollapsed: { assets: false, monitor: false, program: false, console: false },
    userOverrides: { assets: null, monitor: null, program: null, console: null }
  });
  assert.equal(result.program, true);
  assert.equal(result.console, true);
});

test('computeLayout auto-collapses console when both panels are user-expanded at 1024 x 640', () => {
  const layout = computeLayout({
    width: 1024,
    height: 640,
    preset: 'build',
    userOverrides: { assets: null, monitor: null, program: false, console: false }
  });
  assert.equal(layout.responsiveCollapsed.console, true);
  assert.equal(layout.collapsed.console, true);
  assert.equal(layout.collapsed.program, false);
  assert.ok(layout.viewportHeight >= 300);
  assert.equal(layout.viewportWidth, 522);
});

test('computeLayout does not auto-collapse when only Program is user-expanded at 1024 x 640', () => {
  const layout = computeLayout({
    width: 1024,
    height: 640,
    preset: 'build',
    userOverrides: { assets: null, monitor: null, program: false, console: null }
  });
  assert.equal(layout.responsiveCollapsed.console, false);
  assert.equal(layout.collapsed.program, false);
  assert.equal(layout.collapsed.console, true);
  assert.ok(layout.viewportHeight >= 300);
});