import { test, expect } from '@playwright/test';
import { goToDashboard } from './helpers.js';

test.describe('Chat Scene', () => {
  test.setTimeout(150000);

  test.beforeEach(async ({ page }) => {
    await goToDashboard(page);
    // Navigate to chat
    await page.locator('.product-actions').getByRole('button', { name: /Sohbet/i }).click();
    await page.waitForSelector('.chat-wrap', { timeout: 5000 });
  });

  test('chat scene renders correctly', async ({ page }) => {
    await expect(page.locator('.chat-stream')).toBeVisible();
    await expect(page.locator('.chat-input input')).toBeVisible();
    await expect(page.locator('.chat-input .btn.btn-primary')).toContainText('Gönder');
    await expect(page.locator('button:has-text("← Dashboard")')).toBeVisible();
  });

  test('chat title shows product name', async ({ page }) => {
    const header = await page.locator('text=SOHBET').first().textContent();
    expect(header?.trim().length).toBeGreaterThan(0);
  });

  test('initial chat history messages are shown if any', async ({ page }) => {
    // mockData has chatHistory — it may have pre-populated messages
    // We just check the structure
    const stream = page.locator('.chat-stream');
    await expect(stream).toBeVisible();
  });

  test('typing and pressing Enter sends a message', async ({ page }) => {
    await page.fill('.chat-input input', 'Ürün kalitesi hakkında ne düşünüyorsun?');
    await page.press('.chat-input input', 'Enter');
    // User message should appear
    const userMsg = page.locator('.msg.msg-user').last();
    await expect(userMsg).toBeVisible({ timeout: 3000 });
    await expect(userMsg.locator('.msg-bubble')).toContainText('Ürün kalitesi');
  });

  test('clicking "Gönder" button sends a message', async ({ page }) => {
    await page.fill('.chat-input input', 'Pil ömrü gerçekten 30 saat mi?');
    await page.click('.chat-input .btn.btn-primary');
    const userMsg = page.locator('.msg.msg-user').last();
    await expect(userMsg).toBeVisible({ timeout: 3000 });
    await expect(userMsg.locator('.msg-bubble')).toContainText('Pil ömrü');
  });

  test('empty message does not get sent', async ({ page }) => {
    const initialCount = await page.locator('.msg').count();
    await page.click('.chat-input .btn.btn-primary');
    await page.waitForTimeout(500);
    const afterCount = await page.locator('.msg').count();
    expect(afterCount).toBe(initialCount);
  });

  test('bot responds after sending a message', async ({ page }) => {
    await page.fill('.chat-input input', 'ANC kalitesi nasıl?');
    await page.click('.chat-input .btn.btn-primary');
    // "Asistan · düşünüyor..." typing indicator appears first
    await expect(page.locator('text=düşünüyor')).toBeVisible({ timeout: 5000 });
    // Then bot response arrives (wait up to 30s for real backend response)
    await expect(page.locator('.msg.msg-bot').last().locator('.msg-bubble')).toBeVisible({ timeout: 30000 });
  });

  test('input clears after sending', async ({ page }) => {
    await page.fill('.chat-input input', 'Test sorusu');
    await page.click('.chat-input .btn.btn-primary');
    await page.waitForTimeout(300);
    const inputValue = await page.inputValue('.chat-input input');
    expect(inputValue).toBe('');
  });

  test('"← Dashboard" button returns to dashboard', async ({ page }) => {
    await page.click('button:has-text("← Dashboard")');
    await expect(page.locator('.dash-tabs')).toBeVisible({ timeout: 3000 });
  });
});
