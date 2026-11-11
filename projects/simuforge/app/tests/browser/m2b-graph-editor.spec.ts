import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

test.describe('M2-B graph editor', () => {
  test('graph editor basics', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=SimuForge');

    await page.click('button:has-text("Program")');
    await page.waitForTimeout(300);

    const paletteButtons = page.locator('.sf-graph-palette button');
    await expect(paletteButtons).toHaveCount(6);

    await paletteButtons.nth(0).click();
    await paletteButtons.nth(3).click();
    await page.waitForTimeout(300);

    const nodes = page.locator('.react-flow__node');
    await expect(nodes).toHaveCount(2);

    await page.click('[data-testid="select-first-graph-node"]');
    await page.waitForTimeout(300);
    await expect(page.locator('.sf-graph-inspector')).toBeVisible({ timeout: 10000 });

    const screenshotDir = resolve(process.cwd(), '../reports/mvp-2/evidence/screenshots');
    mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: resolve(screenshotDir, 'm2b-graph-editor.png') });

    const evidence = {
      milestone: 'M2-B',
      generatedAt: new Date().toISOString(),
      browser: 'chromium',
      assertions: {
        programWorkspaceOpened: true,
        paletteHasSixNodes: (await paletteButtons.count()) === 6,
        nodesCreated: (await nodes.count()) === 2,
        inspectorVisible: await page.locator('.sf-graph-inspector').isVisible()
      }
    };
    evidence.assertions.allPassed = Object.values(evidence.assertions).every(Boolean);
    const evidencePath = resolve(process.cwd(), '../reports/mvp-2/evidence/m2b-browser-acceptance.json');
    mkdirSync(resolve(process.cwd(), '../reports/mvp-2/evidence'), { recursive: true });
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

    expect(evidence.assertions.allPassed).toBeTruthy();
  });
});