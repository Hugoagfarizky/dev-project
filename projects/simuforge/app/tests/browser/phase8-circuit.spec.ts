import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 1440, height: 900 } });

async function openCircuit(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  await page.locator('.sf-preset button').nth(1).click();
  await expect(page.locator('[data-testid="program-tab-circuit"]')).toBeVisible();
  await page.locator('[data-testid="program-tab-circuit"]').click();
  await expect(page.locator('[data-testid="circuit-palette"]')).toBeVisible();
}

test('Phase 08 circuit tab: add components and show status', async ({ page }) => {
  await openCircuit(page);

  await page.locator('[data-testid="circuit-add-voltageSource"]').click();
  await page.locator('[data-testid="circuit-add-resistor"]').click();
  await page.locator('[data-testid="circuit-add-ground"]').click();

  await expect(page.locator('[data-testid^="circuit-node-"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="circuit-status"]')).toBeVisible();
  await expect(page.locator('[data-testid="circuit-empty"]')).toHaveCount(0);
});

test('Phase 08 circuit tab: editing locks while running', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  await page.locator('[data-testid="load-demo-scenario"]').click();
  await expect(page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' })).toBeVisible();

  await page.locator('.sf-preset button').nth(1).click();
  await expect(page.locator('[data-testid="program-tab-circuit"]')).toBeVisible();
  await page.locator('[data-testid="program-tab-circuit"]').click();
  await page.locator('[data-testid="circuit-add-voltageSource"]').click();
  await expect(page.locator('[data-testid="circuit-palette"]')).toBeVisible();

  await page.click('button:has-text("Play")');
  await page.waitForTimeout(500);
  await expect(page.locator('[data-testid="circuit-lock-banner"]')).toBeVisible();
  await page.click('button:has-text("Stop")').catch(() => {});
});
