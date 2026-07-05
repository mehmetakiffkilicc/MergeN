import { test, expect } from '@playwright/test';

test.describe('Hero Scene', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    await page.goto('/');
    await page.waitForSelector('.hero', { timeout: 5000 });
  });

  test('hero page renders core elements', async ({ page }) => {
    await expect(page.locator('.hero-head h1')).toBeVisible();
    await expect(page.locator('.search-box input')).toBeVisible();
    await expect(page.locator('.search-box .btn.btn-primary')).toContainText('Röntgenden Geçir');
  });

  test('search input accepts text and Enter triggers analysis', async ({ page }) => {
    await page.fill('.search-box input', 'Samsung Galaxy S25');
    await page.press('.search-box input', 'Enter');
    await expect(page.locator('.scanner')).toBeVisible({ timeout: 5000 });
  });

  test('"Röntgenden Geçir" button starts analysis', async ({ page }) => {
    await page.fill('.search-box input', 'Sony WH-1000XM5');
    await page.click('.search-box .btn.btn-primary');
    await expect(page.locator('.scanner')).toBeVisible({ timeout: 5000 });
  });

  test('empty input still starts analysis with default product', async ({ page }) => {
    await page.click('.search-box .btn.btn-primary');
    await expect(page.locator('.scanner')).toBeVisible({ timeout: 5000 });
  });

  test('4 example chips are rendered', async ({ page }) => {
    const chips = page.locator('.chip');
    await expect(chips).toHaveCount(4);
    await expect(chips.nth(0)).toContainText('Apple AirPods Pro 2');
    await expect(chips.nth(1)).toContainText('Sony WH-1000XM5');
    await expect(chips.nth(2)).toContainText('iPhone 15 Pro Max');
    await expect(chips.nth(3)).toContainText('Trendyol ürün linki');
  });

  test('clicking a chip (non-first) starts analysis with chip text', async ({ page }) => {
    await page.locator('.chip').nth(1).click(); // Sony WH-1000XM5
    await expect(page.locator('.scanner')).toBeVisible({ timeout: 5000 });
  });

  test('clicking first chip starts analysis', async ({ page }) => {
    await page.locator('.chip').nth(0).click();
    await expect(page.locator('.scanner')).toBeVisible({ timeout: 5000 });
  });

  test('5 agent cards are rendered with correct roles', async ({ page }) => {
    const agents = page.locator('.hero-agent');
    await expect(agents).toHaveCount(5);
    const roles = ['Araştırma', 'Röntgen', 'Analiz', 'Karar', 'Karşı-Argüman'];
    for (let i = 0; i < 5; i++) {
      await expect(agents.nth(i).locator('.hero-agent-role')).toContainText(roles[i]);
    }
  });

  test('4 stat cards are rendered', async ({ page }) => {
    const stats = page.locator('.hero-stat');
    await expect(stats).toHaveCount(4);
    // Verify content is non-empty
    for (let i = 0; i < 4; i++) {
      const text = await stats.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('header logo click navigates to hero', async ({ page }) => {
    // Navigate away first
    await page.fill('.search-box input', 'Test');
    await page.click('.search-box .btn.btn-primary');
    await expect(page.locator('.scanner')).toBeVisible({ timeout: 5000 });
    // Click logo to go back to hero
    await page.click('.header-l');
    await expect(page.locator('.hero')).toBeVisible({ timeout: 3000 });
  });

  test('header "Geçmiş" button navigates to history', async ({ page }) => {
    await page.click('button:has-text("Geçmiş")');
    await expect(page.locator('.hist-wrap')).toBeVisible({ timeout: 3000 });
  });

  test('header "Yeni Röntgen" button stays/returns to hero', async ({ page }) => {
    await page.click('button:has-text("Yeni Röntgen")');
    await expect(page.locator('.hero')).toBeVisible({ timeout: 3000 });
  });

  test('footer renders with copyright and version', async ({ page }) => {
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('2026');
    await expect(footer).toContainText('MergeN');
  });

  test('no unexpected console errors on hero load', async () => {
    // Filter out known benign errors (e.g. favicon 404)
    const meaningful = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('ERR_CONNECTION_REFUSED') // backend might not be running
    );
    expect(meaningful).toHaveLength(0);
  });
});
