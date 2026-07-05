import { test, expect } from '@playwright/test';
import { goToDashboard } from './helpers.js';

test.describe('Extension Preview Modal', () => {
  test.setTimeout(150000);

  test.beforeEach(async ({ page }) => {
    await goToDashboard(page);
  });

  async function openModal(page) {
    await page.locator('.product-actions').getByRole('button', { name: /Extension/i }).click();
    await page.waitForSelector('.ext-overlay', { timeout: 3000 });
  }

  test('modal opens when clicking "Extension Önizleme"', async ({ page }) => {
    await openModal(page);
    await expect(page.locator('.ext-overlay')).toBeVisible();
    await expect(page.locator('.ext-frame')).toBeVisible();
  });

  test('modal shows chrome side panel bar', async ({ page }) => {
    await openModal(page);
    await expect(page.locator('.ext-bar')).toContainText('chrome');
  });

  test('modal shows product name', async ({ page }) => {
    await openModal(page);
    const prodName = page.locator('.ext-h-prod');
    await expect(prodName).toBeVisible();
    const text = await prodName.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('modal shows MiniGauge', async ({ page }) => {
    await openModal(page);
    // MiniGauge renders SVG or canvas
    const body = page.locator('.ext-body');
    await expect(body).toBeVisible();
    // ext-trust section contains gauge + badge info
    const trust = page.locator('.ext-trust');
    await expect(trust).toBeVisible();
  });

  test('modal shows decision badge text', async ({ page }) => {
    await openModal(page);
    const badge = page.locator('.ext-h-cat');
    await expect(badge).toBeVisible();
    const text = await badge.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('"Detaylı Rapor" button is visible and closes modal', async ({ page }) => {
    await openModal(page);
    const btn = page.locator('button:has-text("Detaylı Rapor")');
    await expect(btn).toBeVisible();
    await btn.click();
    // Modal should close (onClose is passed to this button too)
    await expect(page.locator('.ext-overlay')).not.toBeVisible({ timeout: 2000 });
  });

  test('clicking × button closes modal', async ({ page }) => {
    await openModal(page);
    await page.locator('.ext-close').click();
    await expect(page.locator('.ext-overlay')).not.toBeVisible({ timeout: 2000 });
  });

  test('clicking backdrop closes modal', async ({ page }) => {
    await openModal(page);
    // Click the overlay background (not the frame)
    await page.locator('.ext-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.ext-overlay')).not.toBeVisible({ timeout: 2000 });
  });

  test('modal can be reopened after closing', async ({ page }) => {
    await openModal(page);
    await page.locator('.ext-close').click();
    await expect(page.locator('.ext-overlay')).not.toBeVisible({ timeout: 2000 });
    // Reopen
    await openModal(page);
    await expect(page.locator('.ext-overlay')).toBeVisible();
  });

  test('dashboard is still accessible after closing modal', async ({ page }) => {
    await openModal(page);
    await page.locator('.ext-close').click();
    // Dashboard should still be behind the modal
    await expect(page.locator('.dash-tabs')).toBeVisible({ timeout: 2000 });
  });
});
