import { test, expect } from '@playwright/test';

test.describe('Personalization Scene', () => {
  test.setTimeout(150000);

  async function reachPersonalization(page) {
    await page.goto('/');
    await page.fill('.search-box input', 'Sony WH-1000XM5');
    await page.click('.search-box .btn.btn-primary');
    await page.waitForSelector('.pers-q', { timeout: 70000 });
  }

  test('personalization shows question cards', async ({ page }) => {
    await reachPersonalization(page);
    const qs = page.locator('.pers-q');
    expect(await qs.count()).toBeGreaterThanOrEqual(1);
    // Each question card should have an h3
    await expect(qs.first().locator('h3')).toBeVisible();
  });

  test('each question card has option buttons or textarea', async ({ page }) => {
    await reachPersonalization(page);
    const qs = page.locator('.pers-q');
    const count = await qs.count();
    for (let i = 0; i < count; i++) {
      const q = qs.nth(i);
      const opts = q.locator('.pers-opt');
      const textarea = q.locator('.pers-textarea');
      const hasOpts = await opts.count() > 0;
      const hasTextarea = await textarea.count() > 0;
      expect(hasOpts || hasTextarea).toBe(true);
    }
  });

  test('"Atla" button is visible and navigates to dashboard', async ({ page }) => {
    await reachPersonalization(page);
    const skipBtn = page.locator('.pers-foot').getByRole('button', { name: 'Atla' });
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();
    await expect(page.locator('.dash-tabs')).toBeVisible({ timeout: 5000 });
  });

  test('"Cevapla ve Devam Et" is disabled until all questions answered', async ({ page }) => {
    await reachPersonalization(page);
    const submitBtn = page.locator('.pers-foot').getByRole('button', { name: /Cevapla|Devam|Hesapla|Kararı/ });
    // Should be disabled initially (no answers selected)
    await expect(submitBtn).toBeDisabled();
  });

  test('selecting option enables submit for single-question forms', async ({ page }) => {
    await reachPersonalization(page);
    const qs = page.locator('.pers-q');
    const count = await qs.count();

    // Answer all questions by clicking first available option or filling textarea
    for (let i = 0; i < count; i++) {
      const q = qs.nth(i);
      const opts = q.locator('.pers-opt');
      const textarea = q.locator('.pers-textarea');
      if (await opts.count() > 0) {
        await opts.first().click();
      } else if (await textarea.count() > 0) {
        await textarea.fill('Test cevabı');
      }
    }

    // Submit button should now be enabled
    const submitBtn = page.locator('.pers-foot').getByRole('button', { name: /Cevapla|Devam|Hesapla|Kararı/ });
    await expect(submitBtn).toBeEnabled({ timeout: 2000 });
  });

  test('option button toggles data-on attribute when clicked', async ({ page }) => {
    await reachPersonalization(page);
    const firstQ = page.locator('.pers-q').first();
    const firstOpt = firstQ.locator('.pers-opt').first();

    await expect(firstOpt).toHaveAttribute('data-on', 'false');
    await firstOpt.click();
    await expect(firstOpt).toHaveAttribute('data-on', 'true');
  });

  test('answering all questions and submitting navigates to dashboard', async ({ page }) => {
    await reachPersonalization(page);
    const qs = page.locator('.pers-q');
    const count = await qs.count();

    for (let i = 0; i < count; i++) {
      const q = qs.nth(i);
      const opts = q.locator('.pers-opt');
      const textarea = q.locator('.pers-textarea');
      if (await opts.count() > 0) {
        await opts.first().click();
      } else {
        await textarea.fill('Test cevabı');
      }
    }

    const submitBtn = page.locator('.pers-foot').getByRole('button', { name: /Cevapla|Devam|Hesapla|Kararı/ });
    await submitBtn.click();
    // Should navigate to dashboard (may take time if it posts to backend)
    await expect(page.locator('.dash-tabs')).toBeVisible({ timeout: 15000 });
  });

  test('"Profili Değiştir" from dashboard returns to personalization scene', async ({ page }) => {
    // After live analysis + skip, interruptQuestions still hold the pipeline questions.
    // Clicking "Profili Değiştir" brings back the same live-questions personalization.
    await reachPersonalization(page);
    await page.locator('.pers-foot').getByRole('button', { name: 'Atla' }).click();
    await page.waitForSelector('.dash-tabs', { timeout: 5000 });

    const editBtn = page.locator('button:has-text("Profili Değiştir"), button:has-text("Profilimi Ekle")');
    await editBtn.click();
    // Personalization scene (either mode) should be visible
    await expect(page.locator('.pers-q, .pers-opts').first()).toBeVisible({ timeout: 5000 });
    // Submit/skip footer should also be present
    await expect(page.locator('.pers-foot')).toBeVisible();
  });
});
