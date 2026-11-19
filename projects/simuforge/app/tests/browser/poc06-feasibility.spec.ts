import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const protoPath = resolve(process.cwd(), '../reports/phase-11/evidence/poc06/index.html');
const outPath = resolve(process.cwd(), '../reports/phase-11/evidence/poc06/result.json');

test.describe.configure({ timeout: 60_000 });

test('POC-06 hybrid 2D/3D feasibility: 2D overlay over WebGL', async ({ page }) => {
  await page.goto('file:///' + protoPath.replace(/\\/g, '/'));
  await expect(page.locator('#hud')).toBeVisible();
  await page.waitForFunction(() => (window as any).__poc06Done, null, { timeout: 10_000 });
  const result = await page.evaluate(() => (window as any).__poc06Done);
  mkdirSync(resolve(process.cwd(), '../reports/phase-11/evidence/poc06'), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log('POC06 result:', JSON.stringify(result));
  expect(result.avgFps).toBeGreaterThan(30);
});