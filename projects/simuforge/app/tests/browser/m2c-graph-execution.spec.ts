import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const evidencePath = resolve(process.cwd(), '../reports/mvp-2/evidence/m2c-execution.json');
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
  milestone: 'M2-C',
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

async function openProgram(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  await page.locator('.sf-preset button').nth(1).click();
  await expect(page.locator('.sf-graph-palette')).toBeVisible();
}

function paletteButton(page: Page, type: string) {
  return page.locator('.sf-graph-palette button').filter({ hasText: type });
}

async function addNode(page: Page, type: string): Promise<void> {
  await paletteButton(page, type).click();
  await page.waitForTimeout(150);
}

function nodeByType(page: Page, type: string) {
  return page.locator('.react-flow__node').filter({ hasText: type });
}

async function selectNode(page: Page, type: string): Promise<void> {
  await nodeByType(page, type).first().click();
  await expect(page.locator('.sf-graph-inspector')).toBeVisible();
}

async function clearSelection(page: Page): Promise<void> {
  await page.locator('.react-flow__pane').click({ position: { x: 12, y: 12 } });
  await page.waitForTimeout(150);
}

async function connect(page: Page, sourceType: string, targetType: string): Promise<void> {
  const sourceHandle = nodeByType(page, sourceType).first().locator('.react-flow__handle.source').first();
  const targetHandle = nodeByType(page, targetType).first().locator('.react-flow__handle.target').first();
  await expect(sourceHandle).toBeVisible();
  await expect(targetHandle).toBeVisible();
  const sourceBox = await sourceHandle.boundingBox();
  const targetBox = await targetHandle.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('Connection handles are not visible.');

  const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const end = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y + 8, { steps: 4 });
  await page.mouse.move(end.x, end.y, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function loadDemoBall(page: Page): Promise<string> {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  await page.locator('[data-testid="load-demo-scenario"]').click();
  await expect(page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' })).toBeVisible();
  await page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' }).click();
  const id = (await page.locator('.sf-inspector-id').innerText()).trim();
  await page.locator('.sf-preset button').nth(1).click();
  await expect(page.locator('.sf-graph-palette')).toBeVisible();
  return id;
}

async function setTarget(page: Page, type: string, targetId: string): Promise<void> {
  await selectNode(page, type);
  await page.locator('.sf-graph-inspector input[type="text"]').first().fill(targetId);
  await page.waitForTimeout(200);
}

async function setNumberField(page: Page, index: number, value: number): Promise<void> {
  const input = page.locator('.sf-graph-inspector input[type="number"]').nth(index);
  await input.fill(String(value));
  await page.waitForTimeout(150);
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

function executionStatus(page: Page) {
  return page.locator('[data-testid="graph-execution-status"]');
}

function manualTriggerButton(page: Page) {
  return page.locator('[data-testid="graph-manual-trigger"]');
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

test.describe('M2-C graph execution', () => {
  test('On Start applies an impulse and produces visible motion', async ({ page }) => {
    const ballId = await loadDemoBall(page);
    check('demoBallIdAvailable', ballId.length > 0);

    await addNode(page, 'onStart');
    await addNode(page, 'applyImpulse');
    await setTarget(page, 'applyImpulse', ballId);
    await setNumberField(page, 0, 6);
    await clearSelection(page);
    await connect(page, 'onStart', 'applyImpulse');
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    const positionBefore = await monitorValue(page, 'Position (m)');
    check('positionReadableWhileEditing', Number.isFinite(positionBefore.y), JSON.stringify(positionBefore));

    await watchHighlight(page);
    await play(page);

    await expect(executionStatus(page)).toContainText('completed');
    const statusText = await executionStatus(page).innerText();
    check('onStartExecutionCompleted', statusText.includes('completed'), statusText);
    check('onStartExecutedTwoNodes', statusText.includes('2 node'), statusText);

    const velocityAfter = await monitorValue(page, 'Velocity (m/s)');
    check('impulseAppliedToVelocityX', Math.abs(velocityAfter.x - 6) < 0.01, JSON.stringify(velocityAfter));

    await page.waitForTimeout(400);
    const positionAfter = await monitorValue(page, 'Position (m)');
    check('bodyMovedAlongX', positionAfter.x > positionBefore.x + 0.1, `${positionBefore.x} -> ${positionAfter.x}`);
    check('transientHighlightObserved', await highlightSeen(page));
    await screenshot(page, 'm2c-on-start-impulse.png');
  });

  test('Manual Trigger executes repeatedly while running', async ({ page }) => {
    const ballId = await loadDemoBall(page);

    await addNode(page, 'manualTrigger');
    await addNode(page, 'applyImpulse');
    await setTarget(page, 'applyImpulse', ballId);
    await setNumberField(page, 0, 5);
    await clearSelection(page);
    await connect(page, 'manualTrigger', 'applyImpulse');
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    await play(page);
    const trigger = manualTriggerButton(page);
    await expect(trigger).toBeEnabled();
    check('manualTriggerEnabledWhileRunning', await trigger.isEnabled());

    await watchHighlight(page);
    await trigger.click();
    await page.waitForTimeout(250);
    const firstVelocity = await monitorValue(page, 'Velocity (m/s)');
    check('firstManualTriggerApplied', Math.abs(firstVelocity.x - 5) < 0.01, JSON.stringify(firstVelocity));

    await trigger.click();
    await page.waitForTimeout(250);
    const secondVelocity = await monitorValue(page, 'Velocity (m/s)');
    check('secondManualTriggerApplied', Math.abs(secondVelocity.x - 10) < 0.01, JSON.stringify(secondVelocity));
    check('manualTriggerHighlightObserved', await highlightSeen(page));

    const statusText = await executionStatus(page).innerText();
    check('manualTriggerStatusCompleted', statusText.includes('completed'), statusText);
    await screenshot(page, 'm2c-manual-trigger.png');
  });

  test('Paused Manual Trigger queues and drains only on resume', async ({ page }) => {
    const ballId = await loadDemoBall(page);

    await addNode(page, 'manualTrigger');
    await addNode(page, 'applyImpulse');
    await setTarget(page, 'applyImpulse', ballId);
    await setNumberField(page, 0, 5);
    await clearSelection(page);
    await connect(page, 'manualTrigger', 'applyImpulse');

    await play(page);
    await pause(page);
    await expect(topButton(page, 'Play')).toBeEnabled();

    const trigger = manualTriggerButton(page);
    await expect(trigger).toBeEnabled();
    check('manualTriggerAvailableWhilePaused', await trigger.isEnabled());

    await trigger.click();
    await page.waitForTimeout(200);
    const pausedStatus = await executionStatus(page).innerText();
    check('pausedQueueVisible', pausedStatus.includes('suspended') && pausedStatus.includes('1 queued'), pausedStatus);

    const pausedVelocity = await monitorValue(page, 'Velocity (m/s)');
    check('noExecutionWhilePaused', Math.abs(pausedVelocity.x) < 1e-6, JSON.stringify(pausedVelocity));
    await screenshot(page, 'm2c-paused-queue.png');

    await play(page);
    await page.waitForTimeout(300);
    const resumedVelocity = await monitorValue(page, 'Velocity (m/s)');
    check('queuedTriggerDrainedOnResume', Math.abs(resumedVelocity.x - 5) < 0.01, JSON.stringify(resumedVelocity));

    const resumedStatus = await executionStatus(page).innerText();
    check('queueEmptyAfterResume', !resumedStatus.includes('queued'), resumedStatus);
    check('resumeStatusCompleted', resumedStatus.includes('completed'), resumedStatus);
  });

  test('Stop cancels queued execution and does not leak into the next session', async ({ page }) => {
    const ballId = await loadDemoBall(page);

    await addNode(page, 'manualTrigger');
    await addNode(page, 'applyImpulse');
    await setTarget(page, 'applyImpulse', ballId);
    await setNumberField(page, 0, 5);
    await clearSelection(page);
    await connect(page, 'manualTrigger', 'applyImpulse');

    await play(page);
    await pause(page);
    const trigger = manualTriggerButton(page);
    await trigger.click();
    await trigger.click();
    await page.waitForTimeout(200);
    const queuedStatus = await executionStatus(page).innerText();
    check('twoTriggersQueued', queuedStatus.includes('2 queued'), queuedStatus);

    await stop(page);
    const stoppedStatus = await executionStatus(page).innerText();
    check('stopCancelsQueue', !stoppedStatus.includes('queued'), stoppedStatus);
    check('stopReturnsToEditing', (await page.locator('.sf-state-pill').innerText()).trim() === 'Editing');
    await screenshot(page, 'm2c-stop-cancelled.png');

    await play(page);
    await page.waitForTimeout(300);
    const velocity = await monitorValue(page, 'Velocity (m/s)');
    check('staleQueueNotReplayed', Math.abs(velocity.x) < 1e-6, JSON.stringify(velocity));
    const replayedStatus = await executionStatus(page).innerText();
    check('newSessionHasNoQueuedWork', !replayedStatus.includes('queued'), replayedStatus);
    await reset(page);
  });

  test('Reset cancels queued execution without re-firing On Start', async ({ page }) => {
    const ballId = await loadDemoBall(page);

    await addNode(page, 'onStart');
    await addNode(page, 'manualTrigger');
    await addNode(page, 'applyImpulse');
    await setTarget(page, 'applyImpulse', ballId);
    await setNumberField(page, 0, 4);
    await clearSelection(page);
    await connect(page, 'onStart', 'applyImpulse');
    await connect(page, 'manualTrigger', 'applyImpulse');

    await play(page);
    const afterStart = await monitorValue(page, 'Velocity (m/s)');
    check('onStartImpulseApplied', Math.abs(afterStart.x - 4) < 0.01, JSON.stringify(afterStart));

    await pause(page);
    await manualTriggerButton(page).click();
    await page.waitForTimeout(200);
    const queuedStatus = await executionStatus(page).innerText();
    check('triggerQueuedBeforeReset', queuedStatus.includes('1 queued'), queuedStatus);

    await reset(page);
    const resetStatus = await executionStatus(page).innerText();
    check('resetCancelsQueue', !resetStatus.includes('queued'), resetStatus);
    const resetVelocity = await monitorValue(page, 'Velocity (m/s)');
    check('resetRestoresRestState', Math.abs(resetVelocity.x) < 1e-6, JSON.stringify(resetVelocity));

    await play(page);
    await page.waitForTimeout(300);
    const resumedVelocity = await monitorValue(page, 'Velocity (m/s)');
    check('onStartNotReplayedOnResume', Math.abs(resumedVelocity.x) < 1e-6, JSON.stringify(resumedVelocity));
    await screenshot(page, 'm2c-reset-cancelled.png');
  });

  test('invalid graph skips execution with a warning while physics remains usable', async ({ page }) => {
    await loadDemoBall(page);

    await addNode(page, 'onStart');
    await addNode(page, 'applyForce');
    await setTarget(page, 'applyForce', 'ghost-entity');
    await clearSelection(page);
    await connect(page, 'onStart', 'applyForce');
    await expect(page.locator('.sf-graph-diagnostics')).toBeVisible();

    const positionBefore = await monitorValue(page, 'Position (m)');
    await play(page);

    const statusText = await executionStatus(page).innerText();
    check('invalidGraphSkipped', statusText.includes('skipped'), statusText);
    check('skipWarningNamesValidation', statusText.includes('GRAPH_INVALID_TARGET_ENTITY'), statusText);
    check('runtimeStillRunning', (await page.locator('.sf-state-pill').innerText()).trim() === 'Running');

    await page.waitForTimeout(400);
    const positionAfter = await monitorValue(page, 'Position (m)');
    check('physicsStillAdvances', positionAfter.y < positionBefore.y - 0.01, `${positionBefore.y} -> ${positionAfter.y}`);
    await screenshot(page, 'm2c-invalid-skip.png');
  });

  test('responsive layout at 1024x640 and 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 640 });
    await openProgram(page);
    await addNode(page, 'onStart');
    await addNode(page, 'applyForce');
    await selectNode(page, 'applyForce');

    async function assertLayout(label: string) {
      const editor = page.locator('.sf-graph-editor');
      const bar = page.locator('.sf-graph-execution-bar');
      const canvas = page.locator('.sf-graph-canvas');
      const status = executionStatus(page);
      const trigger = manualTriggerButton(page);
      const viewport = page.viewportSize();

      check(`${label}EditorVisible`, await editor.isVisible());
      check(`${label}ExecutionBarVisible`, await bar.isVisible());
      check(`${label}StatusLineVisible`, await status.isVisible());
      check(`${label}ManualTriggerVisible`, await trigger.isVisible());
      check(`${label}ManualTriggerDisabledWhileEditing`, await trigger.isDisabled());

      const editorBox = await editor.boundingBox();
      const barBox = await bar.boundingBox();
      const canvasBox = await canvas.boundingBox();
      if (!editorBox || !barBox || !canvasBox || !viewport) {
        throw new Error('Missing layout boxes.');
      }

      check(`${label}CanvasUsableHeight`, canvasBox.height >= 60, `Canvas height was ${canvasBox.height}.`);
      check(`${label}BarAboveCanvas`, barBox.y + barBox.height <= canvasBox.y + 1);
      check(`${label}EditorFitsViewport`, editorBox.y + editorBox.height <= viewport.height + 1);
      check(`${label}StatusLineReadable`, parseFloat(await status.evaluate((element) => getComputedStyle(element).fontSize)) >= 10);

      await screenshot(page, `m2c-layout-${label}.png`);
    }

    await assertLayout('1024x640');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await assertLayout('1440x900');
    await screenshot(page, 'm2c-execution.png');
  });
});
