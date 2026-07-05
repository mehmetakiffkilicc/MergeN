import { expect } from '@playwright/test';

export const MOCK_HISTORY_ITEM = {
  id: 'mock-001',
  name: 'Test Ürün',
  category: 'Elektronik',
  trustScore: 70,
  decision: 'AL',
  decisionTier: 'good',
  headline: 'Test ürün raporu',
  pinned: false,
  bucket: 'today',
  ts: Date.now(),
};

/**
 * Navigates to the dashboard scene using the mock flow.
 * Starts analysis → waits for personalization → skips it → waits for dashboard.
 */
export async function goToDashboard(page) {
  await page.goto('/');
  await page.fill('.search-box input', 'Apple AirPods Pro 2');
  await page.click('.search-box .btn.btn-primary');

  // Wait for personalization scene (mock kicks in after ~18s, real backend ~60-90s)
  await page.waitForSelector('.pers-q', { timeout: 120000 });

  // Skip personalization to get to dashboard
  const skipBtn = page.locator('.pers-foot').getByRole('button', { name: 'Atla' });
  await skipBtn.click();

  await page.waitForSelector('.dash-tabs', { timeout: 10000 });
}
