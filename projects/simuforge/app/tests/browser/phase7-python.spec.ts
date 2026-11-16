import { test, expect } from '@playwright/test';

test('Phase 07 - open Python editor', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  const btn = page.locator('[data-testid="open-python-editor"]');
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(page.locator('.sf-python-panel')).toBeVisible();
});

test('Phase 07 - create and edit a script', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="open-python-editor"]').click();
  await page.locator('.sf-python-panel input[type="text"]').first().fill('Hello');
  await page.locator('.sf-python-panel button', { hasText: 'New Script' }).click();
  await expect(page.locator('.sf-python-panel textarea')).toBeVisible();
  await page.locator('.sf-python-panel textarea').fill('from simuforge import world\nworld.log("hi")');
  await expect(page.locator('.sf-python-panel textarea')).toHaveValue(/world.log/);
});
