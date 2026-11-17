import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 07 end-to-end acceptance.
 *
 * These scenarios drive the real Studio UI and the real Pyodide worker. They do
 * not mock worker responses: a script must actually run, its declarative actions
 * must reach the M1-E physics runtime, and its console output must appear under
 * the PYTHON source.
 */

test.describe.configure({ timeout: 150_000 });

// 1440x900 keeps the Program and Console panels both expandable. At 720p the
// responsive layout force-collapses the Console while Program is open, so the
// Console assertions are made at a standard desktop height.
test.use({ viewport: { width: 1440, height: 900 } });

const READY_TIMEOUT = 90_000;

async function loadDemoBall(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  await page.locator('[data-testid="load-demo-scenario"]').click();
  await expect(page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' })).toBeVisible();
  // Select the ball so the runtime monitor shows its live velocity.
  await page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' }).click();
  await page.locator('.sf-preset button').nth(1).click();
  await expect(page.locator('.sf-graph-palette')).toBeVisible();
}

async function openPythonPanel(page: Page): Promise<void> {
  await page.locator('[data-testid="open-python-editor"]').click();
  await expect(page.locator('.sf-python-panel')).toBeVisible();
}

async function waitForRuntimeReady(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="python-runtime-status"]')).toHaveText('ready', {
    timeout: READY_TIMEOUT
  });
}

async function closePythonPanel(page: Page): Promise<void> {
  await page.locator('.sf-python-modal button', { hasText: 'Close' }).click();
  await expect(page.locator('.sf-python-panel')).not.toBeVisible();
}

async function createScript(page: Page, name: string, source: string): Promise<void> {
  await page.locator('.sf-python-panel input[type="text"]').first().fill(name);
  await page.locator('.sf-python-panel button', { hasText: 'New Script' }).click();
  await page.locator('.sf-python-panel textarea').fill(source);
  await expect(page.locator('.sf-python-panel textarea')).toHaveValue(source);
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

async function assignScript(page: Page, scriptName: string): Promise<void> {
  await selectNode(page, 'runPython');
  const select = page.locator('.sf-graph-inspector select');
  await select.selectOption({ label: scriptName });
  await expect(select).toHaveValue(/.+/);
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

async function buildPythonGraph(page: Page, scriptName: string): Promise<void> {
  await addNode(page, 'onStart');
  await addNode(page, 'runPython');
  await assignScript(page, scriptName);
  await connect(page, 'onStart', 'runPython');
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
}

function topButton(page: Page, label: 'Play' | 'Pause' | 'Stop' | 'Reset') {
  return page.locator('.sf-top-center button').filter({ hasText: label });
}

function executionStatus(page: Page) {
  return page.locator('[data-testid="graph-execution-status"]');
}

async function monitorVec(page: Page, label: string): Promise<{ x: number; y: number; z: number }> {
  const row = page.locator('.sf-runtime-monitor .sf-inspector-row').filter({ hasText: label });
  const text = (await row.locator('.sf-inspector-value').innerText()).trim();
  const parts = text.split(',').map((part) => Number(part.trim()));
  return { x: parts[0] ?? NaN, y: parts[1] ?? NaN, z: parts[2] ?? NaN };
}

async function ensureConsole(page: Page): Promise<void> {
  if (!(await page.locator('.sf-console-drawer').isVisible())) {
    await page.locator('.sf-panel-toggle[aria-label="Expand Console"]').click();
  }
  await expect(page.locator('.sf-console-drawer')).toBeVisible();
}

function consoleRowsWithSource(page: Page, source: string) {
  return page.locator('.sf-console-row').filter({
    has: page.locator('.sf-console-source', { hasText: source })
  });
}

test.describe('Phase 07 acceptance', () => {
  test('real graph execution applies a simuforge impulse and logs under PYTHON', async ({ page }) => {
    await loadDemoBall(page);
    await openPythonPanel(page);
    await waitForRuntimeReady(page);
    await createScript(
      page,
      'Boost',
      [
        'from simuforge import world, simulation',
        'ball = world.get("Demo Ball")',
        'ball.apply_impulse((6.0, 0.0, 0.0))',
        'world.log("boost-marker t=%.2f" % simulation.time)'
      ].join('\n')
    );
    await closePythonPanel(page);
    await buildPythonGraph(page, 'Boost');

    await topButton(page, 'Play').click();
    await expect(executionStatus(page)).toContainText('completed', { timeout: 30_000 });
    await expect(executionStatus(page)).toContainText('2 node');

    const velocity = await monitorVec(page, 'Velocity (m/s)');
    expect(Math.abs(velocity.x - 6), `velocity was ${JSON.stringify(velocity)}`).toBeLessThan(0.01);

    await ensureConsole(page);
    const pythonRows = consoleRowsWithSource(page, 'PYTHON');
    await expect(pythonRows.filter({ hasText: 'boost-marker' })).toHaveCount(1);
  });

  test('Python runtime error surfaces in Console and applies no partial actions', async ({ page }) => {
    await loadDemoBall(page);
    await openPythonPanel(page);
    await waitForRuntimeReady(page);
    await createScript(
      page,
      'Boom',
      [
        'from simuforge import world',
        'ball = world.get("Demo Ball")',
        'ball.apply_impulse((5.0, 0.0, 0.0))',
        'raise RuntimeError("boom-marker")'
      ].join('\n')
    );
    await closePythonPanel(page);
    await buildPythonGraph(page, 'Boom');

    await topButton(page, 'Play').click();
    await expect(executionStatus(page)).toContainText('failed', { timeout: 30_000 });
    await expect(executionStatus(page)).toContainText('PYTHON_FAILED');
    await expect(page.locator('.sf-state-pill')).toHaveText('Paused');

    // The impulse requested before the exception must not be committed.
    const velocity = await monitorVec(page, 'Velocity (m/s)');
    expect(Math.abs(velocity.x), `velocity was ${JSON.stringify(velocity)}`).toBeLessThan(1e-6);

    await ensureConsole(page);
    await expect(
      page.locator('.sf-console-row.sf-console-error').filter({ hasText: 'boom-marker' }).first()
    ).toBeVisible();

    // The runtime status also reports the failure.
    await openPythonPanel(page);
    await expect(page.locator('[data-testid="python-runtime-status"]')).toHaveText('error', {
      timeout: 15_000
    });
  });

  test('Stop and Reset cancel pending Python execution and drop late results', async ({ page }) => {
    await loadDemoBall(page);
    await openPythonPanel(page);
    await waitForRuntimeReady(page);
    await createScript(
      page,
      'Slow',
      [
        'import time',
        'from simuforge import world',
        'ball = world.get("Demo Ball")',
        'end = time.time() + 2.0',
        'while time.time() < end:',
        '    pass',
        'ball.apply_impulse((9.0, 0.0, 0.0))',
        'world.log("late-marker")'
      ].join('\n')
    );
    await closePythonPanel(page);
    await buildPythonGraph(page, 'Slow');

    // Stop while the script is still running inside the worker.
    await topButton(page, 'Play').click();
    await expect(executionStatus(page)).toContainText('executing', { timeout: 15_000 });
    await topButton(page, 'Stop').click();
    await expect(page.locator('.sf-state-pill')).toHaveText('Editing');
    await expect(executionStatus(page)).not.toContainText('executing');

    // Give the cancelled invocation time to settle before the next session.
    await page.waitForTimeout(800);

    // Reset while the script is running inside the worker. Reset restores the
    // snapshot but keeps the session running (D-M2C-02), so only the cancelled
    // execution and the restored rest state are asserted here.
    await topButton(page, 'Play').click();
    await expect(executionStatus(page)).toContainText('executing', { timeout: 15_000 });
    await topButton(page, 'Reset').click();
    await expect(page.locator('.sf-state-pill')).toHaveText('Running');
    await expect(executionStatus(page)).not.toContainText('executing');
    const resetVelocity = await monitorVec(page, 'Velocity (m/s)');
    expect(Math.abs(resetVelocity.x), `velocity was ${JSON.stringify(resetVelocity)}`).toBeLessThan(1e-6);

    // A late worker result must not resume the cancelled chain.
    await page.waitForTimeout(3000);
    await expect(executionStatus(page)).not.toContainText('executing');
    await expect(executionStatus(page)).not.toContainText('completed');
    await ensureConsole(page);
    await expect(consoleRowsWithSource(page, 'PYTHON').filter({ hasText: 'late-marker' })).toHaveCount(0);
  });

  test('timeout is enforced and the runtime recovers for a later run', async ({ page }) => {
    await loadDemoBall(page);
    await openPythonPanel(page);
    await waitForRuntimeReady(page);
    await createScript(page, 'Spin', ['while True:', '    pass'].join('\n'));
    await closePythonPanel(page);
    await buildPythonGraph(page, 'Spin');

    await topButton(page, 'Play').click();
    await expect(executionStatus(page)).toContainText('failed', { timeout: 20_000 });
    await expect(executionStatus(page)).toContainText('PYTHON_TIMEOUT');
    await expect(page.locator('.sf-state-pill')).toHaveText('Paused');

    await ensureConsole(page);
    await expect(
      page.locator('.sf-console-row.sf-console-error').filter({ hasText: '1000 ms execution budget' }).first()
    ).toBeVisible();

    // Stop (back to editing), replace the script source, and prove the runtime
    // still executes after the timed-out invocation.
    await topButton(page, 'Stop').click();
    await expect(page.locator('.sf-state-pill')).toHaveText('Editing');
    await openPythonPanel(page);
    await page
      .locator('.sf-python-panel textarea')
      .fill(['from simuforge import world', 'world.get("Demo Ball").apply_impulse((4.0, 0.0, 0.0))'].join('\n'));
    await closePythonPanel(page);

    await topButton(page, 'Play').click();
    await expect(executionStatus(page)).toContainText('completed', { timeout: 60_000 });
    const velocity = await monitorVec(page, 'Velocity (m/s)');
    expect(Math.abs(velocity.x - 4), `velocity was ${JSON.stringify(velocity)}`).toBeLessThan(0.01);
  });

  test('save and reopen restores scripts, graph node and script reference without dirtying', async ({ page }) => {
    await loadDemoBall(page);
    await openPythonPanel(page);
    await waitForRuntimeReady(page);
    const source = [
      'from simuforge import world',
      'world.get("Demo Ball").apply_impulse((3.0, 0.0, 0.0))',
      'world.log("persist-marker")'
    ].join('\n');
    await createScript(page, 'Persist Boost', source);
    await closePythonPanel(page);
    await buildPythonGraph(page, 'Persist Boost');

    await page.locator('button', { hasText: 'Save' }).click();
    await expect(page.locator('.sf-statusbar')).toContainText('Save: clean', { timeout: 15_000 });

    await page.locator('button', { hasText: 'Project Hub' }).click();
    await expect(page.locator('.sf-project-hub')).toBeVisible();
    const openButton = page
      .locator('.sf-hub-item')
      .filter({ hasText: 'Untitled Simulation' })
      .locator('button', { hasText: 'Open' })
      .first();
    await openButton.click();
    await page.waitForTimeout(500);
    await page.locator('.sf-preset button').nth(1).click();
    await expect(page.locator('.sf-graph-palette')).toBeVisible();
    // Hydration clears the selection, so re-select the ball for the monitor.
    await page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' }).click();

    // Hydration must not mark the project dirty.
    await expect(page.locator('.sf-statusbar')).toContainText('Save: clean');
    await expect(page.locator('.react-flow__node')).toHaveCount(2);
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    await selectNode(page, 'runPython');
    await expect(page.locator('.sf-graph-inspector select')).toHaveValue(/.+/);
    await expect(page.locator('.sf-graph-inspector select option').filter({ hasText: 'Persist Boost' })).toHaveCount(1);

    await openPythonPanel(page);
    await waitForRuntimeReady(page);
    const scriptButton = page.locator('.sf-python-list button', { hasText: 'Persist Boost' });
    await expect(scriptButton).toHaveCount(1);
    await scriptButton.click();
    await expect(page.locator('.sf-python-panel textarea')).toHaveValue(source);
    await closePythonPanel(page);

    // The restored reference must still resolve and execute.
    await topButton(page, 'Play').click();
    await expect(executionStatus(page)).toContainText('completed', { timeout: 30_000 });
    const velocity = await monitorVec(page, 'Velocity (m/s)');
    expect(Math.abs(velocity.x - 3), `velocity was ${JSON.stringify(velocity)}`).toBeLessThan(0.01);
  });

  test('missing and invalid Python script references are handled safely', async ({ page }) => {
    await loadDemoBall(page);
    await addNode(page, 'runPython');
    await expect(page.locator('.sf-graph-diagnostics')).toContainText('GRAPH_MISSING_SCRIPT');

    await topButton(page, 'Play').click();
    await expect(executionStatus(page)).toContainText('skipped', { timeout: 15_000 });
    await expect(executionStatus(page)).toContainText('GRAPH_MISSING_SCRIPT');
    await expect(page.locator('.sf-state-pill')).toHaveText('Running');
    await topButton(page, 'Stop').click();

    await openPythonPanel(page);
    await waitForRuntimeReady(page);
    await createScript(page, 'Temp', ['from simuforge import world', 'world.log("temp")'].join('\n'));
    await closePythonPanel(page);
    await assignScript(page, 'Temp');
    await expect(page.locator('.sf-graph-diagnostics')).toHaveCount(0);

    // Deleting the script leaves a dangling reference on the node.
    await openPythonPanel(page);
    await page.locator('.sf-python-panel button', { hasText: 'Delete' }).click();
    await closePythonPanel(page);
    await expect(page.locator('.sf-graph-diagnostics')).toContainText('GRAPH_INVALID_SCRIPT');

    await topButton(page, 'Play').click();
    await expect(executionStatus(page)).toContainText('skipped', { timeout: 15_000 });
    await expect(executionStatus(page)).toContainText('GRAPH_INVALID_SCRIPT');
    await expect(page.locator('.sf-topbar')).toBeVisible();
  });
});
