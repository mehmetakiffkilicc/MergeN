import { test, expect } from '@playwright/test';
import { MOCK_HISTORY_ITEM } from './helpers.js';

test.describe('History Scene', () => {
  test.setTimeout(30000);

  const SEED_ITEMS = [
    { ...MOCK_HISTORY_ITEM, id: 'h-001', name: 'Apple AirPods Pro 2', decisionTier: 'warn', decision: 'KOŞULLU AL', trustScore: 68, pinned: false, bucket: 'today' },
    { ...MOCK_HISTORY_ITEM, id: 'h-002', name: 'Sony WH-1000XM5', decisionTier: 'good', decision: 'AL', trustScore: 82, pinned: false, bucket: 'today' },
    { ...MOCK_HISTORY_ITEM, id: 'h-003', name: 'Jabra Elite 10', decisionTier: 'bad', decision: 'ALMA', trustScore: 38, pinned: true, bucket: 'week' },
  ];

  test.beforeEach(async ({ page }) => {
    // Seed localStorage before page loads
    await page.addInitScript((items) => {
      localStorage.setItem('mergen_history', JSON.stringify(items));
    }, SEED_ITEMS);

    await page.goto('/');
    await page.click('button:has-text("Geçmiş")');
    await page.waitForSelector('.hist-wrap', { timeout: 5000 });
  });

  test('history scene renders with correct file count', async ({ page }) => {
    await expect(page.locator('.hist-wrap')).toBeVisible();
    // Total stat should show 3 files
    const totalStat = page.locator('.hist-stat').filter({ has: page.locator('.hist-stat-l', { hasText: /^TOPLAM DOSYA$/ }) });
    const totalText = await totalStat.locator('.hist-stat-n').textContent();
    expect(parseInt(totalText || '0')).toBe(3);
  });

  test('all seeded history items are displayed', async ({ page }) => {
    await expect(page.locator('text=Apple AirPods Pro 2')).toBeVisible();
    await expect(page.locator('text=Sony WH-1000XM5')).toBeVisible();
    await expect(page.locator('text=Jabra Elite 10')).toBeVisible();
  });

  test('filter chips are all visible', async ({ page }) => {
    const chips = page.locator('.hist-chip');
    expect(await chips.count()).toBeGreaterThanOrEqual(5);
    await expect(chips.filter({ hasText: 'Hepsi' })).toBeVisible();
    await expect(chips.filter({ hasText: /^AL/ })).toBeVisible();
    await expect(chips.filter({ hasText: 'Koşullu' })).toBeVisible();
    await expect(chips.filter({ hasText: 'Alma' })).toBeVisible();
    await expect(chips.filter({ hasText: 'Sabitli' })).toBeVisible();
  });

  test('"AL" filter shows only good-tier items', async ({ page }) => {
    await page.locator('.hist-chip').filter({ hasText: /^AL/ }).click();
    await page.waitForTimeout(200);
    // Only Sony WH (good) should show
    await expect(page.locator('text=Sony WH-1000XM5')).toBeVisible();
    await expect(page.locator('text=Apple AirPods Pro 2')).not.toBeVisible();
    await expect(page.locator('text=Jabra Elite 10')).not.toBeVisible();
  });

  test('"Koşullu" filter shows only warn-tier items', async ({ page }) => {
    await page.locator('.hist-chip').filter({ hasText: 'Koşullu' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('text=Apple AirPods Pro 2')).toBeVisible();
    await expect(page.locator('text=Sony WH-1000XM5')).not.toBeVisible();
  });

  test('"Alma" filter shows only bad-tier items', async ({ page }) => {
    await page.locator('.hist-chip').filter({ hasText: 'Alma' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('text=Jabra Elite 10')).toBeVisible();
    await expect(page.locator('text=Apple AirPods Pro 2')).not.toBeVisible();
  });

  test('"Sabitli" filter shows only pinned items', async ({ page }) => {
    await page.locator('.hist-chip').filter({ hasText: 'Sabitli' }).click();
    await page.waitForTimeout(200);
    // Jabra is pinned
    await expect(page.locator('text=Jabra Elite 10')).toBeVisible();
    await expect(page.locator('text=Apple AirPods Pro 2')).not.toBeVisible();
  });

  test('"Hepsi" filter resets to show all items', async ({ page }) => {
    await page.locator('.hist-chip').filter({ hasText: /^AL/ }).click();
    await page.waitForTimeout(200);
    await page.locator('.hist-chip').filter({ hasText: 'Hepsi' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('text=Apple AirPods Pro 2')).toBeVisible();
    await expect(page.locator('text=Sony WH-1000XM5')).toBeVisible();
    await expect(page.locator('text=Jabra Elite 10')).toBeVisible();
  });

  test('search input filters items by name', async ({ page }) => {
    await page.fill('.hist-search input', 'Sony');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Sony WH-1000XM5')).toBeVisible();
    await expect(page.locator('text=Apple AirPods Pro 2')).not.toBeVisible();
    await expect(page.locator('text=Jabra Elite 10')).not.toBeVisible();
  });

  test('clearing search restores all items', async ({ page }) => {
    await page.fill('.hist-search input', 'Sony');
    await page.waitForTimeout(200);
    await page.click('.hist-search-clear');
    await page.waitForTimeout(200);
    await expect(page.locator('text=Apple AirPods Pro 2')).toBeVisible();
    await expect(page.locator('text=Jabra Elite 10')).toBeVisible();
  });

  test('sort by trust score reorders items', async ({ page }) => {
    await page.locator('.hist-sort-btn').filter({ hasText: 'Güven' }).click();
    await page.waitForTimeout(300);
    // Sony (82) should appear before AirPods (68) before Jabra (38)
    const names = await page.locator('.hist-prod-name').allTextContents();
    const sonyIdx = names.findIndex(n => n.includes('Sony'));
    const airpodsIdx = names.findIndex(n => n.includes('AirPods'));
    const jabraIdx = names.findIndex(n => n.includes('Jabra'));
    expect(sonyIdx).toBeLessThan(airpodsIdx);
    expect(airpodsIdx).toBeLessThan(jabraIdx);
  });

  test('pin button toggles pin state', async ({ page }) => {
    // Find the pin button for AirPods (not pinned)
    const rows = page.locator('.hist-row.hist-row-data');
    const airpodsRow = rows.filter({ hasText: 'Apple AirPods Pro 2' });
    const pinBtn = airpodsRow.locator('.hist-pin');
    await expect(pinBtn).toHaveAttribute('data-on', 'false');
    await pinBtn.click();
    await expect(pinBtn).toHaveAttribute('data-on', 'true');
  });

  test('individual delete button removes item', async ({ page }) => {
    const rows = page.locator('.hist-row.hist-row-data');
    const sonyRow = rows.filter({ hasText: 'Sony WH-1000XM5' });
    await sonyRow.locator('.hist-iconbtn.danger').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Sony WH-1000XM5')).not.toBeVisible();
    // Other items still present
    await expect(page.locator('text=Apple AirPods Pro 2')).toBeVisible();
  });

  test('"Tümünü Sil" clears all history', async ({ page }) => {
    await page.locator('.hist-sort-btn.danger').click();
    await page.waitForTimeout(300);
    // All items gone
    await expect(page.locator('text=Apple AirPods Pro 2')).not.toBeVisible();
    await expect(page.locator('text=Sony WH-1000XM5')).not.toBeVisible();
    // Empty state shown
    await expect(page.locator('.hist-empty')).toBeVisible();
  });

  test('clicking history row opens dashboard for that product', async ({ page }) => {
    const rows = page.locator('.hist-row.hist-row-data');
    const airpodsRow = rows.filter({ hasText: 'Apple AirPods Pro 2' });
    await airpodsRow.click();
    await expect(page.locator('.dash-tabs')).toBeVisible({ timeout: 3000 });
  });

  test('"Tekrar röntgenle" starts new analysis for that product', async ({ page }) => {
    const rows = page.locator('.hist-row.hist-row-data');
    const airpodsRow = rows.filter({ hasText: 'Apple AirPods Pro 2' });
    await airpodsRow.locator('.hist-iconbtn[title="Tekrar röntgenle"]').click();
    // Should navigate to analysis scene
    await expect(page.locator('.scanner')).toBeVisible({ timeout: 5000 });
  });

  test('empty state shown when no items match filter', async ({ page }) => {
    // Use a filter that has 0 matches — since no 'good' item when we filter differently
    await page.fill('.hist-search input', 'xxxxxxxxxxx_no_match');
    await page.waitForTimeout(300);
    await expect(page.locator('.hist-empty')).toBeVisible();
  });

  test('stat counters match actual items', async ({ page }) => {
    const stats = page.locator('.hist-stat');
    const byLabel = (label) => stats.filter({ has: page.locator('.hist-stat-l', { hasText: label }) });

    const totalText = await byLabel(/^TOPLAM DOSYA$/).locator('.hist-stat-n').textContent();
    expect(parseInt(totalText || '0')).toBe(3);

    const goodText = await byLabel(/^AL$/).locator('.hist-stat-n').textContent();
    expect(parseInt(goodText || '0')).toBe(1); // Sony

    const warnText = await byLabel(/^KOŞULLU$/).locator('.hist-stat-n').textContent();
    expect(parseInt(warnText || '0')).toBe(1); // AirPods

    const badText = await byLabel(/^ALMA$/).locator('.hist-stat-n').textContent();
    expect(parseInt(badText || '0')).toBe(1); // Jabra
  });
});
