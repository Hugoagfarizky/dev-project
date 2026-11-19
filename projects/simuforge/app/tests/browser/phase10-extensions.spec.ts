import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 1440, height: 900 } });

const SAMPLE_ID = '3f2a9c1e-8b4d-4f6a-9c2e-1d7b5a3f9e01';

async function openExtensionsTab(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.sf-topbar')).toBeVisible();
  await page.locator('.sf-preset button').nth(1).click();
  await expect(page.locator('[data-testid="program-tab-extensions"]')).toBeVisible();
  await page.locator('[data-testid="program-tab-extensions"]').click();
  await expect(page.locator('[data-testid="extension-manager"]')).toBeVisible();
}

async function installSample(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[data-testid="install-sample-extension"]').click();
  await expect(page.locator(`[data-testid="extension-item-${SAMPLE_ID}"]`)).toBeVisible();
  await expect(page.locator(`[data-testid="extension-worker-${SAMPLE_ID}"]`)).toContainText(
    'worker ready',
    { timeout: 20_000 }
  );
}

test('Phase 10 extension manager installs the sample and registers its component', async ({ page }) => {
  await openExtensionsTab(page);
  await installSample(page);

  await expect(page.locator('[data-testid="extension-runtime-status"]')).toContainText('loaded');

  // The extension-provided component type is available in the add-component menu.
  await page.locator('[data-testid="load-demo-scenario"]').click();
  await page.locator('.sf-hierarchy-row', { hasText: 'Demo Ball' }).click();
  const select = page.locator('[data-testid="add-component-menu"] select');
  await expect(select.locator('option[value="sampleOscillator"]')).toHaveCount(1);
  await select.selectOption('sampleOscillator');
  await expect(page.locator('[data-testid="component-card-sampleOscillator"]')).toBeVisible();
});

test('Phase 10 extension hooks run while the simulation is running', async ({ page }) => {
  await openExtensionsTab(page);
  await installSample(page);

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('.sf-state-pill')).toHaveText('Running');

  await expect
    .poll(
      async () =>
        page.locator('[data-testid="extension-runtime-status"]').innerText(),
      { timeout: 20_000 }
    )
    .toMatch(/[1-9]\d* tick/);

  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.locator('.sf-state-pill')).toHaveText('Editing');
});
