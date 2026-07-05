import { test, expect } from '@playwright/test';
import { goToDashboard } from './helpers.js';

test.describe('Comparison Scene', () => {
  test.setTimeout(150000);

  test.beforeEach(async ({ page }) => {
    await goToDashboard(page);
    await page.locator('.product-actions').getByRole('button', { name: /Karşılaştır/i }).click();
    await page.waitForSelector('.cmp-head', { timeout: 5000 });
  });

  test('comparison scene header shows both product names', async ({ page }) => {
    const header = page.locator('.cmp-head h1');
    await expect(header).toBeVisible();
    const text = await header.textContent();
    expect(text).toContain('AirPods');
    expect(text).toContain('Sony');
  });

  test('"← Geri" button returns to dashboard', async ({ page }) => {
    await page.click('button:has-text("← Geri")');
    await expect(page.locator('.dash-tabs')).toBeVisible({ timeout: 3000 });
  });

  test('radar chart is rendered', async ({ page }) => {
    // ComparisonRadar renders SVG
    const svgOrCanvas = page.locator('.cmp-overlay-panel svg, .cmp-overlay-panel canvas');
    expect(await svgOrCanvas.count()).toBeGreaterThan(0);
  });

  test('DNA comparison panel is visible', async ({ page }) => {
    const panel = page.locator('.cmp-overlay-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('h3')).toContainText('DNA Karşılaştırma');
  });

  test('comparison category bars are rendered', async ({ page }) => {
    const cats = page.locator('.cmp-cat');
    expect(await cats.count()).toBeGreaterThan(0);
    // Each category has a name and two sides
    const first = cats.first();
    await expect(first.locator('.cmp-cat-name')).toBeVisible();
    await expect(first.locator('.cmp-cat-val').first()).toBeVisible();
  });

  test('CONSISTENCY: category bar values are between 0-100', async ({ page }) => {
    const vals = page.locator('.cmp-cat-val');
    const count = await vals.count();
    for (let i = 0; i < count; i++) {
      const text = await vals.nth(i).textContent();
      const n = parseInt(text || '0');
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(100);
    }
  });
});
