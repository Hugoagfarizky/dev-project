import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const evidencePath = resolve(process.cwd(), '../reports/mvp-2/evidence/mvp3-acceptance.json');
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
  milestone: 'MVP-3',
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

async function loadDemo(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  await page.locator('[data-testid="load-demo-scenario"]').click();
  await expect(page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' })).toBeVisible();
  await page.locator('.sf-preset button').nth(1).click();
  await expect(page.locator('.sf-graph-palette')).toBeVisible();
}

function topButton(page: Page, label: 'Play' | 'Pause' | 'Stop' | 'Reset') {
  return page.locator('.sf-top-center button').filter({ hasText: label });
}

function parseVec(text: string): { x: number; y: number; z: number } {
  const parts = text.split(',').map((part) => Number(part.trim()));
  return { x: parts[0] ?? 0, y: parts[1] ?? 0, z: parts[2] ?? 0 };
}

async function monitorValue(page: Page, label: string): Promise<{ x: number; y: number; z: number }> {
  const row = page.locator('.sf-runtime-monitor .sf-inspector-row').filter({ hasText: label });
  return parseVec((await row.locator('.sf-inspector-value').innerText()).trim());
}

test.describe('MVP-3 acceptance', () => {
  test('complete demonstration: create, run, collide, pause/resume/reset, save/reopen', async ({ page }) => {
    // Criterion 1: create from empty project
    await loadDemo(page);
    await page.locator('[data-testid="load-demo-graph"]').click();
    await page.waitForTimeout(200);
    check('demoCreated', (await page.locator('.react-flow__node').count()) === 6);
    check('graphValid', (await page.locator('.react-flow__edge').count()) === 3);

    // Criterion 2: trigger and observe motion
    const positionBefore = await monitorValue(page, 'Position (m)');
    await topButton(page, 'Play').click();
    await page.waitForTimeout(400);
    const velocity = await monitorValue(page, 'Velocity (m/s)');
    check('motionObserved', Math.abs(velocity.x - 6) < 0.5, JSON.stringify(velocity));
    const positionAfter = await monitorValue(page, 'Position (m)');
    check('positionChanged', positionAfter.x !== positionBefore.x, `${positionBefore.x} -> ${positionAfter.x}`);

    // Criterion 3: floor collision (ball bounces, not stuck below floor)
    await page.waitForTimeout(800);
    const posCollision = await monitorValue(page, 'Position (m)');
    check('collisionHandled', posCollision.y >= 0, `${posCollision.y}`);

    // Criterion 4: pause, resume, reset
    await topButton(page, 'Pause').click();
    await page.waitForTimeout(200);
    check('paused', (await page.locator('.sf-state-pill').innerText()).trim() === 'Paused');
    await topButton(page, 'Play').click();
    await page.waitForTimeout(200);
    check('resumed', (await page.locator('.sf-state-pill').innerText()).trim() === 'Running');
    await topButton(page, 'Stop').click();
    await page.waitForTimeout(200);
    check('stoppedToEditing', (await page.locator('.sf-state-pill').innerText()).trim() === 'Editing');

    // Criterion 6: save and reopen
    await page.locator('.sf-preset button').nth(1).click();
    await expect(page.locator('.sf-graph-palette')).toBeVisible();
    await page.locator('[data-testid="load-demo-graph"]').click();
    await page.waitForTimeout(200);
    await page.locator('button', { hasText: 'Save' }).click();
    await page.waitForTimeout(800);
    await page.locator('button', { hasText: 'Project Hub' }).click();
    await expect(page.locator('.sf-project-hub')).toBeVisible();
    const openBtn = page.locator('.sf-hub-item').filter({ hasText: 'Untitled Simulation' }).locator('button', { hasText: 'Open' }).first();
    await expect(openBtn).toBeVisible();
    await openBtn.click();
    await page.waitForTimeout(500);
    await page.locator('.sf-preset button').nth(1).click();
    await expect(page.locator('.sf-graph-palette')).toBeVisible();
    check('graphRestored', (await page.locator('.react-flow__node').count()) === 6);
    check('edgesRestored', (await page.locator('.react-flow__edge').count()) === 3);
    await screenshot(page, 'mvp3-complete-demo.png');
  });

  test('runtime errors are visible to the user', async ({ page }) => {
    await loadDemo(page);
    // build invalid graph
    await page.locator('.sf-graph-palette button').filter({ hasText: 'onStart' }).click();
    await page.waitForTimeout(150);
    await page.locator('.sf-graph-palette button').filter({ hasText: 'applyForce' }).click();
    await page.waitForTimeout(150);
    // connect
    const sh = page.locator('.react-flow__node').filter({ hasText: 'onStart' }).first().locator('.react-flow__handle.source').first();
    const th = page.locator('.react-flow__node').filter({ hasText: 'applyForce' }).first().locator('.react-flow__handle.target').first();
    const sb = await sh.boundingBox();
    const tb = await th.boundingBox();
    if (sb && tb) {
      await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
      await page.mouse.down();
      await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 16 });
      await page.mouse.up();
      await page.waitForTimeout(300);
    }
    await topButton(page, 'Play').click();
    await page.waitForTimeout(300);
    const statusText = await page.locator('[data-testid="graph-execution-status"]').innerText();
    check('errorVisibleInStatus', statusText.includes('skipped'), statusText);
    check('runtimeStillRunning', (await page.locator('.sf-state-pill').innerText()).trim() === 'Running');
    await screenshot(page, 'mvp3-runtime-errors.png');
  });

  test('responsive layout at 1024x640 and 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 640 });
    await loadDemo(page);
    await page.locator('[data-testid="load-demo-graph"]').click();
    await page.waitForTimeout(200);

    async function assertLayout(label: string) {
      const editor = page.locator('.sf-graph-editor');
      const canvas = page.locator('.sf-graph-canvas');
      const status = page.locator('[data-testid="graph-execution-status"]');
      const viewport = page.viewportSize();
      const editorBox = await editor.boundingBox();
      const canvasBox = await canvas.boundingBox();
      if (!editorBox || !canvasBox || !viewport) throw new Error('Missing layout boxes.');
      check(`${label}EditorVisible`, await editor.isVisible());
      check(`${label}StatusVisible`, await status.isVisible());
      check(`${label}CanvasUsable`, canvasBox.height >= 60, `canvas=${canvasBox.height}`);
      check(`${label}EditorFits`, editorBox.y + editorBox.height <= viewport.height + 1);
      await screenshot(page, `mvp3-layout-${label}.png`);
    }

    await assertLayout('1024x640');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await assertLayout('1440x900');
    await screenshot(page, 'mvp3-complete-demo.png');
  });
});
