import { test, expect } from '@playwright/test';

test.describe('MergeN Frontend Smoke Tests', () => {

  test('1 - Hero page full walkthrough', async ({ page }) => {
    await test.step('Ana sayfaya git', async () => {
      await page.goto('/');
      await page.waitForTimeout(800);
    });

    await test.step('Başlık ve alt başlık görünür', async () => {
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      await expect(h1).toContainText('röntgenle');
      await page.waitForTimeout(500);
    });

    await test.step('Arama kutusu ve buton görünür', async () => {
      await expect(page.locator('.search-box input')).toBeVisible();
      await expect(page.locator('text=Röntgenden Geçir')).toBeVisible();
      await page.waitForTimeout(500);
    });
  });

  test('2 - Örnek ürün chip tıklama ve loading', async ({ page }) => {
    await test.step('Ana sayfaya git', async () => {
      await page.goto('/');
      await page.waitForTimeout(800);
    });

    await test.step('Örnek chip\'leri gör', async () => {
      const chips = page.locator('.chip');
      const count = await chips.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    await test.step('İlk chip\'e tıkla — Apple AirPods Pro 2', async () => {
      await page.locator('.chip').first().click();
      await page.waitForTimeout(1000);
    });

    await test.step('Loading ekranı görünür', async () => {
      await expect(page.locator('.scanner')).toBeVisible({ timeout: 8000 });
      await page.waitForTimeout(1000);
    });
  });

  test('3 - Arama kutusuna yazı yaz ve Enter\'a bas', async ({ page }) => {
    await test.step('Ana sayfaya git', async () => {
      await page.goto('/');
      await page.waitForTimeout(800);
    });

    await test.step('Arama kutusunu bul', async () => {
      await expect(page.locator('.search-box input')).toBeVisible();
    });

    await test.step('Ürün adı yaz — Sony WH-1000XM5', async () => {
      const input = page.locator('.search-box input');
      await input.click();
      await input.fill('Sony WH-1000XM5');
      await page.waitForTimeout(500);
    });

    await test.step('Enter\'a bas — loading başlar', async () => {
      await page.locator('.search-box input').press('Enter');
    });

    await test.step('Scanner/Loading ekranı açılır', async () => {
      await expect(page.locator('.scanner')).toBeVisible({ timeout: 8000 });
      await page.waitForTimeout(1000);
    });
  });

  test('4 - Header navigasyon elementleri', async ({ page }) => {
    await test.step('Ana sayfaya git', async () => {
      await page.goto('/');
      await page.waitForTimeout(800);
    });

    await test.step('Header logo görünür', async () => {
      await expect(page.locator('.header .logo-text')).toContainText('MERGEN');
    });

    await test.step('Geçmiş butonu görünür', async () => {
      await expect(page.locator('.header').getByText('Geçmiş')).toBeVisible();
    });

    await test.step('Yeni Röntgen butonu görünür', async () => {
      await expect(page.locator('.header').getByText('Yeni Röntgen')).toBeVisible();
    });

    await test.step('Nasıl Çalışır? linki görünür', async () => {
      await expect(page.locator('.header').getByText('Nasıl Çalışır?')).toBeVisible();
    });
  });

  test('5 - Yeni Röntgen butonu hero\'da kalır', async ({ page }) => {
    await test.step('Ana sayfaya git', async () => {
      await page.goto('/');
      await page.waitForTimeout(800);
    });

    await test.step('Yeni Röntgen butonuna tıkla', async () => {
      await page.locator('.header').getByText('Yeni Röntgen').click();
      await page.waitForTimeout(500);
    });

    await test.step('Hala hero sayfasında', async () => {
      await expect(page.locator('h1')).toContainText('röntgenle');
      await expect(page.locator('.search-box input')).toBeVisible();
    });
  });

  test('6 - Footer bilgileri', async ({ page }) => {
    await test.step('Ana sayfaya git', async () => {
      await page.goto('/');
      await page.waitForTimeout(800);
    });

    await test.step('Footer görünür', async () => {
      await expect(page.locator('.footer')).toBeVisible();
    });

    await test.step('Gerçeği Keşfedin. metni var', async () => {
      await expect(page.locator('.footer')).toContainText('Gerçeği Keşfedin.');
    });

    await test.step('Kullanıcı Güvenliği Odaklı metni görünür', async () => {
      await expect(page.locator('.footer')).toContainText('Kullanıcı Güvenliği Odaklı');
    });

    await test.step('Tüm hakları saklıdır görünür', async () => {
      await expect(page.locator('.footer')).toContainText('Tüm hakları saklıdır');
    });
  });

  test('7 - Beş ajan kartı görünür ve isimleri doğru', async ({ page }) => {
    await test.step('Ana sayfaya git', async () => {
      await page.goto('/');
      await page.waitForTimeout(800);
    });

    await test.step('Hero agent kartları görünür', async () => {
      const agentCards = page.locator('.hero-agent');
      await expect(agentCards).toHaveCount(5);
    });

    await test.step('Tulpar (Araştırma) görünür', async () => {
      await expect(page.locator('text=Tulpar')).toBeVisible();
    });

    await test.step('Kam (Röntgen) görünür', async () => {
      await expect(page.locator('text=Kam')).toBeVisible();
    });

    await test.step('Bilge (Analiz) görünür', async () => {
      await expect(page.locator('text=Bilge')).toBeVisible();
    });

    await test.step('Yargucu (Karar) görünür', async () => {
      await expect(page.locator('text=Yargucu')).toBeVisible();
    });

    await test.step('Erlik (Karşı-Argüman) görünür', async () => {
      await expect(page.locator('text=Erlik')).toBeVisible();
    });
  });

  test('8 - Hero istatistik kartları', async ({ page }) => {
    await test.step('Ana sayfaya git', async () => {
      await page.goto('/');
      await page.waitForTimeout(800);
    });

    await test.step('Hero stat kartları görünür', async () => {
      const stats = page.locator('.hero-stat');
      await expect(stats).toHaveCount(4);
    });

    await test.step('%18 yüksek şüpheli yorum istatistiği var', async () => {
      await expect(page.locator('.hero-stat').nth(0)).toContainText('%18');
    });

    await test.step('5 LangGraph Ajanı yazıyor', async () => {
      await expect(page.locator('.hero-stat').nth(1)).toContainText('5');
    });

    await test.step('~24s tam röntgen süresi yazıyor', async () => {
      await expect(page.locator('.hero-stat').nth(3)).toContainText('~24s');
    });
  });

});
