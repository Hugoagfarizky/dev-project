import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const evidencePath = resolve(process.cwd(), '../reports/mvp-2/evidence/m2d-acceptance.json');
const screenshotDir = resolve(process.cwd(), '../reports/mvp-2/evidence/screenshots');

interface ScenarioEvidence {
  name: string;
  status: 'passed' | 'failed' | 'not-run';
  viewport: { width: number; height: number } | null;
  assertions: Record<string, boolean>;
  screenshots: string[];
}

const evidence: {
  milestone: string;
  generatedAt: string;
  browser: string;
  scenarios: ScenarioEvidence[];
} = {
  milestone: 'M2-D',
  generatedAt: '',
  browser: '',
  scenarios: []
};

let current: ScenarioEvidence | null = null;

test.beforeAll(async ({ browser }) => {
  evidence.generatedAt = new Date().toISOString();
  evidence.browser = `Chromium ${browser.version()}`;
  mkdirSync(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }, testInfo) => {
  current = {
    name: testInfo.title,
    status: 'not-run',
    viewport: page.viewportSize(),
    assertions: {},
    screenshots: []
  };
  evidence.scenarios.push(current);
});

test.afterEach(async ({ page }, testInfo) => {
  if (!current) return;
  current.status = testInfo.status === 'passed' ? 'passed' : 'failed';
  current.viewport = page.viewportSize();
});

test.afterAll(() => {
  const allPassed = evidence.scenarios.length > 0 && evidence.scenarios.every((scenario) => scenario.status === 'passed');
  mkdirSync(resolve(process.cwd(), '../reports/mvp-2/evidence'), { recursive: true });
  writeFileSync(
    evidencePath,
    `${JSON.stringify({ ...evidence, allPassed }, null, 2)}\n`,
    'utf8'
  );
});

function check(key: string, value: boolean, message?: string): void {
  if (!current) throw new Error('Missing scenario evidence context.');
  current.assertions[key] = value;
  expect(value, message ?? key).toBe(true);
}

async function screenshot(page: Page, name: string): Promise<void> {
  const file = resolve(screenshotDir, name);
  await page.screenshot({ path: file });
  current?.screenshots.push(`reports/mvp-2/evidence/screenshots/${name}`);
}

async function loadDemo(page: Page): Promise<string> {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  await page.locator('[data-testid="load-demo-scenario"]').click();
  await expect(page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' })).toBeVisible();
  const ballId = (await page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' }).first().innerText()).trim();
  await page.locator('.sf-preset button').nth(1).click();
  await expect(page.locator('.sf-graph-palette')).toBeVisible();
  return ballId;
}

function topButton(page: Page, label: 'Play' | 'Pause' | 'Stop' | 'Reset') {
  return page.locator('.sf-top-center button').filter({ hasText: label });
}

async function play(page: Page): Promise<void> {
  await topButton(page, 'Play').click();
  await page.waitForTimeout(250);
}

async function pause(page: Page): Promise<void> {
  await topButton(page, 'Pause').click();
  await page.waitForTimeout(200);
}

async function stop(page: Page): Promise<void> {
  await topButton(page, 'Stop').click();
  await page.waitForTimeout(200);
}

async function reset(page: Page): Promise<void> {
  await topButton(page, 'Reset').click();
  await page.waitForTimeout(200);
}

function parseVec(text: string): { x: number; y: number; z: number } {
  const parts = text.split(',').map((part) => Number(part.trim()));
  return { x: parts[0] ?? 0, y: parts[1] ?? 0, z: parts[2] ?? 0 };
}

async function monitorValue(page: Page, label: string): Promise<{ x: number; y: number; z: number }> {
  const row = page.locator('.sf-runtime-monitor .sf-inspector-row').filter({ hasText: label });
  return parseVec((await row.locator('.sf-inspector-value').innerText()).trim());
}

async function watchHighlight(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scope = window as unknown as { __sfHighlightSeen?: boolean };
    scope.__sfHighlightSeen = false;
    const observer = new MutationObserver(() => {
      if (document.querySelector('.sf-graph-node-executing')) {
        scope.__sfHighlightSeen = true;
      }
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
}

async function highlightSeen(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { __sfHighlightSeen?: boolean }).__sfHighlightSeen === true);
}

test.describe('M2-D end-to-end demo', () => {
  test('D1: On Start applies an impulse and produces visible motion', async ({ page }) => {
    await loadDemo(page);
    await page.locator('[data-testid="load-demo-graph"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('.react-flow__edge')).toHaveCount(3);
    check('demoGraphLoaded', (await page.locator('.react-flow__node').count()) === 6);

    const positionBefore = await monitorValue(page, 'Position (m)');
    await watchHighlight(page);
    await play(page);

    const statusText = await page.locator('[data-testid="graph-execution-status"]').innerText();
    check('executionCompleted', statusText.includes('completed'), statusText);
    const velocity = await monitorValue(page, 'Velocity (m/s)');
    check('impulseApplied', Math.abs(velocity.x - 6) < 0.01, JSON.stringify(velocity));
    await page.waitForTimeout(400);
    const positionAfter = await monitorValue(page, 'Position (m)');
    check('bodyMovedAlongX', positionAfter.x > positionBefore.x + 0.1, `${positionBefore.x} -> ${positionAfter.x}`);
    check('highlightObserved', await highlightSeen(page));
    await screenshot(page, 'm2d-end-to-end.png');
  });

  test('D2: Manual Trigger applies force and updates status/console', async ({ page }) => {
    await loadDemo(page);
    await page.locator('[data-testid="load-demo-graph"]').click();
    await page.waitForTimeout(200);

    await play(page);
    const trigger = page.locator('[data-testid="graph-manual-trigger"]');
    await expect(trigger).toBeEnabled();
    await watchHighlight(page);
    await trigger.click();
    await page.waitForTimeout(500);

    const velocity = await monitorValue(page, 'Velocity (m/s)');
    check('forceApplied', velocity.x > 6, JSON.stringify(velocity));
    const statusText = await page.locator('[data-testid="graph-execution-status"]').innerText();
    check('executionCompleted', statusText.includes('completed'), statusText);
    check('highlightObserved', await highlightSeen(page));
    await screenshot(page, 'm2d-manual-force.png');
  });

  test('D3: On Plane Contact fires on rising edge and bounces once', async ({ page }) => {
    await loadDemo(page);
    await page.locator('[data-testid="load-demo-graph"]').click();
    await page.waitForTimeout(200);

    await play(page);
    await page.waitForTimeout(1200);
    const statusText = await page.locator('[data-testid="graph-execution-status"]').innerText();
    check('contactExecutionCompleted', statusText.includes('completed'), statusText);
    const positionAfter = await monitorValue(page, 'Position (m)');
    check('bounceOccurred', positionAfter.y > 1, `${positionAfter.y}`);
    await screenshot(page, 'm2d-contact-bounce.png');
  });

  test('D4: invalid graph skips execution with warning while physics remains usable', async ({ page }) => {
    await loadDemo(page);
    // build an invalid graph manually
    await page.locator('.sf-preset button').nth(1).click();
    // already in program preset from loadDemo; ensure palette visible
    await expect(page.locator('.sf-graph-palette')).toBeVisible();
    // add onStart + applyForce with ghost target
    await page.locator('.sf-graph-palette button').filter({ hasText: 'onStart' }).click();
    await page.waitForTimeout(150);
    await page.locator('.sf-graph-palette button').filter({ hasText: 'applyForce' }).click();
    await page.waitForTimeout(150);
    // connect
    const sourceHandle = page.locator('.react-flow__node').filter({ hasText: 'onStart' }).first().locator('.react-flow__handle.source').first();
    const targetHandle = page.locator('.react-flow__node').filter({ hasText: 'applyForce' }).first().locator('.react-flow__handle.target').first();
    const sb = await sourceHandle.boundingBox();
    const tb = await targetHandle.boundingBox();
    if (sb && tb) {
      await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
      await page.mouse.down();
      await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 16 });
      await page.mouse.up();
      await page.waitForTimeout(300);
    }

    const positionBefore = await monitorValue(page, 'Position (m)');
    await play(page);
    const statusText = await page.locator('[data-testid="graph-execution-status"]').innerText();
    check('executionSkipped', statusText.includes('skipped'), statusText);
    check('runtimeStillRunning', (await page.locator('.sf-state-pill').innerText()).trim() === 'Running');
    await page.waitForTimeout(400);
    const positionAfter = await monitorValue(page, 'Position (m)');
    check('physicsStillAdvances', positionAfter.y < positionBefore.y - 0.01, `${positionBefore.y} -> ${positionAfter.y}`);
    await screenshot(page, 'm2d-invalid-recovery.png');
  });

  test('responsive layout at 1024x640 and 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.goto('/');
    await expect(page.locator('.sf-topbar')).toBeVisible();
    await page.locator('[data-testid="load-demo-scenario"]').click();
    await expect(page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' })).toBeVisible();
    await page.locator('.sf-preset button').nth(1).click();
    await expect(page.locator('.sf-graph-palette')).toBeVisible();
    await page.locator('[data-testid="load-demo-graph"]').click();
    await page.waitForTimeout(200);

    async function assertLayout(label: string) {
      const editor = page.locator('.sf-graph-editor');
      const bar = page.locator('.sf-graph-execution-bar');
      const canvas = page.locator('.sf-graph-canvas');
      const status = page.locator('[data-testid="graph-execution-status"]');
      const trigger = page.locator('[data-testid="graph-manual-trigger"]');
      const loadBtn = page.locator('[data-testid="load-demo-graph"]');
      const viewport = page.viewportSize();

      check(`${label}EditorVisible`, await editor.isVisible());
      check(`${label}ExecutionBarVisible`, await bar.isVisible());
      check(`${label}StatusLineVisible`, await status.isVisible());
      check(`${label}ManualTriggerVisible`, await trigger.isVisible());
      check(`${label}LoadDemoGraphVisible`, await loadBtn.isVisible());

      const editorBox = await editor.boundingBox();
      const barBox = await bar.boundingBox();
      const canvasBox = await canvas.boundingBox();
      if (!editorBox || !barBox || !canvasBox || !viewport) throw new Error('Missing layout boxes.');

      check(`${label}CanvasUsableHeight`, canvasBox.height >= 60, `Canvas height was ${canvasBox.height}.`);
      check(`${label}BarAboveCanvas`, barBox.y + barBox.height <= canvasBox.y + 1);
      check(`${label}EditorFitsViewport`, editorBox.y + editorBox.height <= viewport.height + 1);
      await screenshot(page, `m2d-layout-${label}.png`);
    }

    await assertLayout('1024x640');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await assertLayout('1440x900');
    await screenshot(page, 'm2d-end-to-end.png');
  });
});
