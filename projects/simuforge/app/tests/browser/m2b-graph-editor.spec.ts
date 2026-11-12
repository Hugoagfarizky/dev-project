import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const evidencePath = resolve(process.cwd(), '../reports/mvp-2/evidence/m2b-browser-acceptance.json');
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
  milestone: 'M2-B',
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
  return page.locator('.sf-graph-palette button', { hasText: type });
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
  // React Flow starts a connection on the first move after the handle press.
  await page.mouse.move(start.x + 8, start.y + 8, { steps: 4 });
  await page.mouse.move(end.x, end.y, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

test.describe('M2-B graph editor', () => {
  test('empty graph state and six-node palette', async ({ page }) => {
    await openProgram(page);

    const paletteButtons = page.locator('.sf-graph-palette button');
    await expect(paletteButtons).toHaveCount(6);
    check('paletteHasSixNodes', (await paletteButtons.count()) === 6);

    await expect(page.locator('.sf-graph-empty')).toBeVisible();
    check('emptyStateVisible', await page.locator('.sf-graph-empty').isVisible());
    check('noGraphNodeSelected', (await page.locator('.sf-graph-inspector').count()) === 0);
    check('noDiagnosticsOnEmptyGraph', (await page.locator('.sf-graph-diagnostics').count()) === 0);

    await screenshot(page, 'm2b-empty-graph.png');

    await addNode(page, 'onStart');

    await expect(page.locator('.react-flow__node')).toHaveCount(1);
    check('firstNodeAdded', (await page.locator('.react-flow__node').count()) === 1);
    check('emptyStateCleared', (await page.locator('.sf-graph-empty').count()) === 0);
    check('noStaleSelection', (await page.locator('.sf-graph-inspector').count()) === 0);
  });

  test('direct selection, movement, and deletion with connected edges', async ({ page }) => {
    await openProgram(page);
    await addNode(page, 'onStart');
    await addNode(page, 'applyForce');

    await selectNode(page, 'applyForce');
    check('directNodeSelection', await page.locator('.sf-graph-inspector').isVisible());
    await expect(page.locator('.sf-graph-node-selected')).toHaveCount(1);
    check('selectedStateVisible', (await page.locator('.sf-graph-node-selected').count()) === 1);
    await expect(page.locator('.sf-graph-inspector')).toContainText('applyForce');
    await screenshot(page, 'm2b-node-selected.png');

    const node = nodeByType(page, 'applyForce').first();
    const beforeTransform = await node.evaluate((element) => (element as HTMLElement).style.transform);
    const box = await node.boundingBox();
    if (!box) throw new Error('Node is not visible for dragging.');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const afterTransform = await node.evaluate((element) => (element as HTMLElement).style.transform);
    check('nodeMoved', beforeTransform !== afterTransform, 'Node transform should change after dragging.');
    await screenshot(page, 'm2b-node-moved.png');

    // Editing a node through the inspector rebuilds editor nodes from the
    // canonical graph, so the moved position must survive that rebuild.
    const forceX = page.locator('.sf-graph-inspector input[type="number"]').nth(0);
    await forceX.fill('1');
    await page.waitForTimeout(300);
    const persistedTransform = await node.evaluate((element) => (element as HTMLElement).style.transform);
    check('movedPositionPersists', persistedTransform === afterTransform, 'Canonical position should survive a rebuild.');

    await connect(page, 'onStart', 'applyForce');
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    check('edgeCreatedBeforeDelete', (await page.locator('.react-flow__edge').count()) === 1);

    await selectNode(page, 'applyForce');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    await expect(page.locator('.react-flow__node')).toHaveCount(1);
    check('nodeDeleted', (await page.locator('.react-flow__node').count()) === 1);
    check('connectedEdgeRemoved', (await page.locator('.react-flow__edge').count()) === 0);
    check('selectionClearedAfterDelete', (await page.locator('.sf-graph-inspector').count()) === 0);
    await screenshot(page, 'm2b-node-deleted.png');
  });

  test('connection, canonical persistence, disconnection, and invalid duplicate', async ({ page }) => {
    await openProgram(page);
    await addNode(page, 'onStart');
    await addNode(page, 'applyForce');

    await connect(page, 'onStart', 'applyForce');
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    check('validConnectionCreated', (await page.locator('.react-flow__edge').count()) === 1);
    await screenshot(page, 'm2b-connected-graph.png');

    // A store-driven rebuild must preserve the edge, proving it lives in the canonical graph.
    await selectNode(page, 'applyForce');
    const forceX = page.locator('.sf-graph-inspector input[type="number"]').nth(0);
    await forceX.fill('2');
    await page.waitForTimeout(300);
    check('connectionPersistsAcrossRebuild', (await page.locator('.react-flow__edge').count()) === 1);

    await page.locator('.react-flow__edge-interaction').first().click({ force: true });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    check('edgeDisconnected', (await page.locator('.react-flow__edge').count()) === 0);

    await selectNode(page, 'applyForce');
    const forceY = page.locator('.sf-graph-inspector input[type="number"]').nth(1);
    await forceY.fill('3');
    await page.waitForTimeout(300);
    check('disconnectionPersistsAcrossRebuild', (await page.locator('.react-flow__edge').count()) === 0);

    await connect(page, 'onStart', 'applyForce');
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    await connect(page, 'onStart', 'applyForce');
    await page.waitForTimeout(300);

    await expect(page.locator('.sf-graph-diagnostics')).toBeVisible();
    const diagnosticText = await page.locator('.sf-graph-diagnostics').innerText();
    check('duplicateConnectionReported', diagnosticText.includes('GRAPH_DUPLICATE_CONNECTION'), diagnosticText);
    check('duplicateConnectionNotAccepted', (await page.locator('.react-flow__edge').count()) === 1);
    await screenshot(page, 'm2b-invalid-connection.png');
  });

  test('inspector configuration editing against a demo entity', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.sf-topbar')).toBeVisible();
    await page.locator('[data-testid="load-demo-scenario"]').click();
    await expect(page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' })).toBeVisible();

    await page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' }).click();
    const entityId = (await page.locator('.sf-inspector-id').innerText()).trim();
    check('demoEntityIdAvailable', entityId.length > 0);

    await page.locator('.sf-preset button').nth(1).click();
    await addNode(page, 'applyForce');
    await selectNode(page, 'applyForce');

    const inspector = page.locator('.sf-graph-inspector');
    const targetInput = inspector.locator('input[type="text"]').first();
    await targetInput.fill(entityId);
    await page.waitForTimeout(200);

    const forceInputs = inspector.locator('input[type="number"]');
    await forceInputs.nth(0).fill('5');
    await page.waitForTimeout(200);

    const nodeText = await nodeByType(page, 'applyForce').first().innerText();
    check('rendererReflectsTarget', nodeText.includes(entityId), nodeText);
    check('rendererReflectsForce', nodeText.includes('Force (5, 0, 0)'), nodeText);
    check('noTargetDiagnosticAfterEdit', (await page.locator('.sf-graph-diagnostics').count()) === 0);
    await screenshot(page, 'm2b-inspector-editing.png');

    await clearSelection(page);
    await selectNode(page, 'applyForce');

    check('targetPersistsInCanonicalGraph', (await targetInput.inputValue()) === entityId);
    check('editedForcePersists', (await forceInputs.nth(0).inputValue()) === '5');
    check('unrelatedForceFieldsIntact', (await forceInputs.nth(1).inputValue()) === '0' && (await forceInputs.nth(2).inputValue()) === '0');
  });

  test('validation diagnostics update and clear', async ({ page }) => {
    await openProgram(page);
    await addNode(page, 'applyForce');

    await expect(page.locator('.sf-graph-diagnostics')).toBeVisible();
    const missingTargetText = await page.locator('.sf-graph-diagnostics').innerText();
    check('missingTargetDiagnosticShown', missingTargetText.includes('GRAPH_MISSING_TARGET_ENTITY'), missingTargetText);
    check('diagnosticSeverityShown', missingTargetText.includes('[error]'), missingTargetText);
    check('diagnosticMessageShown', missingTargetText.includes('requires a non-empty targetEntityId'), missingTargetText);

    await selectNode(page, 'applyForce');
    const targetInput = page.locator('.sf-graph-inspector input[type="text"]').first();
    await targetInput.fill('ghost-entity');
    await page.waitForTimeout(200);

    const invalidTargetText = await page.locator('.sf-graph-diagnostics').innerText();
    check('diagnosticsUpdateAfterEdit', invalidTargetText.includes('GRAPH_INVALID_TARGET_ENTITY'), invalidTargetText);
    check('updatedMessageShown', invalidTargetText.includes('ghost-entity'), invalidTargetText);
    await screenshot(page, 'm2b-validation.png');

    await nodeByType(page, 'applyForce').first().click();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    check('diagnosticsCleared', (await page.locator('.sf-graph-diagnostics').count()) === 0);
    check('emptyStateRestored', await page.locator('.sf-graph-empty').isVisible());
    check('selectionCleared', (await page.locator('.sf-graph-inspector').count()) === 0);
  });

  test('responsive layout at 1024x640 and 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 640 });
    await openProgram(page);
    await addNode(page, 'onStart');
    await addNode(page, 'applyForce');
    await selectNode(page, 'applyForce');

    async function assertLayout(label: string) {
      const palette = page.locator('.sf-graph-palette');
      const editor = page.locator('.sf-graph-editor');
      const inspector = page.locator('.sf-graph-inspector');
      const diagnostics = page.locator('.sf-graph-diagnostics');
      const viewport = page.viewportSize();

      check(`${label}PaletteVisible`, await palette.isVisible());
      check(`${label}CanvasVisible`, await page.locator('.react-flow').isVisible());
      check(`${label}InspectorVisible`, await inspector.isVisible());
      check(`${label}DiagnosticsVisible`, await diagnostics.isVisible());
      check(`${label}PaletteButtonsVisible`, (await palette.locator('button:visible').count()) === 6);

      const paletteBox = await palette.boundingBox();
      const editorBox = await editor.boundingBox();
      const canvasBox = await page.locator('.sf-graph-canvas').boundingBox();
      const inspectorBox = await inspector.boundingBox();
      const diagnosticsBox = await diagnostics.boundingBox();
      if (!paletteBox || !editorBox || !canvasBox || !inspectorBox || !diagnosticsBox || !viewport) {
        throw new Error('Missing layout boxes.');
      }

      check(`${label}CanvasUsableHeight`, canvasBox.height >= 60, `Canvas height was ${canvasBox.height}.`);
      check(`${label}DiagnosticsBelowCanvas`, canvasBox.y + canvasBox.height <= diagnosticsBox.y + 1);
      check(`${label}PaletteDoesNotOverlapCanvas`, paletteBox.y + paletteBox.height <= editorBox.y + 1);
      check(`${label}InspectorDoesNotOverlapCanvas`, inspectorBox.x >= editorBox.x + editorBox.width);
      check(`${label}LayoutFitsViewport`,
        inspectorBox.x + inspectorBox.width <= viewport.width + 1 &&
        editorBox.y + editorBox.height <= viewport.height + 1);
      check(`${label}DiagnosticsReadable`, parseFloat(await diagnostics.evaluate((element) => getComputedStyle(element).fontSize)) >= 11);

      await screenshot(page, `m2b-responsive-${label}.png`);
    }

    await assertLayout('1024x640');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await assertLayout('1440x900');
    await screenshot(page, 'm2b-graph-editor.png');
  });
});
