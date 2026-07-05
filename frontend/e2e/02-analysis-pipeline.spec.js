import { test, expect } from '@playwright/test';

test.describe('Analysis Pipeline Scene', () => {
  test.setTimeout(150000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('.search-box input', 'Apple AirPods Pro 2');
    await page.click('.search-box .btn.btn-primary');
  });

  test('analysis scene renders scanner and agent graph', async ({ page }) => {
    await expect(page.locator('.scanner')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.analysis-wrap')).toBeVisible({ timeout: 5000 });
  });

  test('counter labels are visible (YORUM, FORUM POST, VİDEO, SİNYAL)', async ({ page }) => {
    await page.waitForSelector('.analysis-wrap', { timeout: 8000 });
    const text = await page.locator('.analysis-wrap').textContent();
    expect(text).toContain('YORUM');
    expect(text).toContain('FORUM');
    expect(text).toContain('VİDEO');
    expect(text).toContain('SİNYAL');
  });

  test('phase ticker is visible with status message', async ({ page }) => {
    await page.waitForSelector('.analysis-wrap', { timeout: 8000 });
    // Stream label should be visible
    const streamLabel = page.locator('text=STREAM');
    await expect(streamLabel).toBeVisible({ timeout: 5000 });
  });

  test('counters increase as pipeline progresses', async ({ page }) => {
    await page.waitForSelector('.analysis-wrap', { timeout: 8000 });

    // Wait for some progress (3s+ for mock to kick in)
    await page.waitForTimeout(4000);

    // At least one counter should have non-zero value
    const wrap = page.locator('.analysis-wrap');
    const text = await wrap.textContent();
    // After mock starts, reviews counter starts incrementing
    const hasNonZero = /[1-9]\d*/.test(text || '');
    expect(hasNonZero).toBe(true);
  });

  test('pipeline eventually transitions to personalization', async ({ page }) => {
    // Wait for personalization (mock: ~18s; real backend: ~60s)
    await expect(page.locator('.pers-q').first()).toBeVisible({ timeout: 120000 });
  });

  test('personalization has at least 1 question card', async ({ page }) => {
    await page.waitForSelector('.pers-q', { timeout: 120000 });
    const qs = page.locator('.pers-q');
    const count = await qs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('back to hero via header logo during analysis', async ({ page }) => {
    await page.waitForSelector('.scanner', { timeout: 8000 });
    await page.click('.header-l');
    await expect(page.locator('.hero')).toBeVisible({ timeout: 3000 });
  });
});
