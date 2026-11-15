import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const evidencePath = resolve(process.cwd(), '../reports/mvp-2/evidence/m2e-acceptance.json');
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
  milestone: 'M2-E',
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

test.describe('M2-E persistence', () => {
  test('save and reopen preserves graph and enables execution', async ({ page }) => {
    await loadDemo(page);
    await page.locator('[data-testid="load-demo-graph"]').click();
    await page.waitForTimeout(200);
    check('graphLoaded', (await page.locator('.react-flow__node').count()) === 6);
    check('edgesLoaded', (await page.locator('.react-flow__edge').count()) === 3);

    // Save
    await page.locator('button', { hasText: 'Save' }).click();
    await page.waitForTimeout(800);

    // Reopen via Project Hub
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

    // Execute
    await topButton(page, 'Play').click();
    await page.waitForTimeout(400);
    const statusText = await page.locator('[data-testid="graph-execution-status"]').innerText();
    check('executionCompleted', statusText.includes('completed'), statusText);
    await screenshot(page, 'm2e-save-reopen.png');
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
      await screenshot(page, `m2e-layout-${label}.png`);
    }

    await assertLayout('1024x640');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await assertLayout('1440x900');
    await screenshot(page, 'm2e-save-reopen.png');
  });
});
