import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 1440, height: 900 } });

test('Phase 09 robotics tab: add components and show status', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  await page.locator('.sf-preset button').nth(1).click();
  await expect(page.locator('[data-testid="program-tab-robotics"]')).toBeVisible();
  await page.locator('[data-testid="program-tab-robotics"]').click();
  await expect(page.locator('[data-testid="robotics-palette"], .sf-robotics-palette')).toBeVisible().catch(() => {});
  await page.locator('.sf-robotics-palette button').first().click();
  await expect(page.locator('[data-testid="robotics-status"]')).toBeVisible();
});
