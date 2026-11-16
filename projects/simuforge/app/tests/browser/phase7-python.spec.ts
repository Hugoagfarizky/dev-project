import { test, expect, type Page } from '@playwright/test';

async function openProgram(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  await page.locator('.sf-preset button').nth(1).click();
  await expect(page.locator('.sf-graph-palette')).toBeVisible();
}

async function openPythonEditor(page: Page): Promise<void> {
  await page.locator('[data-testid="open-python-editor"]').click();
  await expect(page.locator('.sf-python-panel')).toBeVisible();
}

async function createScript(page: Page, name: string, source: string): Promise<void> {
  await page.locator('.sf-python-panel input[type="text"]').first().fill(name);
  await page.locator('.sf-python-panel button', { hasText: 'New Script' }).click();
  await page.locator('.sf-python-panel textarea').fill(source);
  await page.waitForTimeout(200);
}

test.describe('Phase 07 Python', () => {
  test('1-2. Open editor, create and edit script', async ({ page }) => {
    await openProgram(page);
    await openPythonEditor(page);
    await createScript(page, 'Hello', 'from simuforge import world\nworld.log("hi from python")');
    await expect(page.locator('.sf-python-panel textarea')).toHaveValue(/world.log/);
  });

  test('Load runtime reaches ready', async ({ page }) => {
    page.on('console', (m) => console.log('BROWSER_CONSOLE:', m.text()));
    await openProgram(page);
    await openPythonEditor(page);
    await createScript(page, 'RT', 'from simuforge import world\nworld.log("rt")');
    await expect(page.locator('[data-testid="python-runtime-status"]')).toHaveText('ready', { timeout: 90000 });
  });

  test('9. Missing script reference handled', async ({ page }) => {
    await openProgram(page);
    await page.locator('.sf-graph-palette button', { hasText: 'runPython' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('.react-flow__node')).toBeVisible();
  });

  test('8. Save project', async ({ page }) => {
    await openProgram(page);
    await openPythonEditor(page);
    await createScript(page, 'Persisted', 'from simuforge import world\nworld.log("persisted")');
    await page.locator('button', { hasText: 'Close' }).click();
    await page.locator('button', { hasText: 'Save' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('.sf-topbar')).toBeVisible();
  });
});
