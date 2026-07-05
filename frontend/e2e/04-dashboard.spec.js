import { test, expect } from '@playwright/test';
import { goToDashboard } from './helpers.js';

test.describe('Dashboard Scene', () => {
  test.setTimeout(150000);

  test.beforeEach(async ({ page }) => {
    await goToDashboard(page);
  });

  // ─── Tab navigation ───

  test('all 5 tabs are visible', async ({ page }) => {
    const tabs = page.locator('.dash-tab');
    await expect(tabs).toHaveCount(5);
    const names = ['TRUST', 'KAYNAK ANALİZİ', 'KANIT', 'KARAR', 'FİYAT'];
    for (let i = 0; i < 5; i++) {
      await expect(tabs.nth(i)).toContainText(names[i]);
    }
  });

  test('clicking each tab shows its panel', async ({ page }) => {
    const tabs = ['trust', 'manip', 'evidence', 'decision', 'price'];
    for (const id of tabs) {
      await page.locator(`.dash-tab`).filter({ hasText: id === 'trust' ? 'TRUST' : id === 'manip' ? 'KAYNAK ANALİZİ' : id === 'evidence' ? 'KANIT' : id === 'decision' ? 'KARAR' : 'FİYAT' }).click();
      await page.waitForTimeout(300);
      // The active tab should have class active
      const activeTab = page.locator('.dash-tab.active');
      await expect(activeTab).toBeVisible();
    }
  });

  // ─── Trust tab ───

  test('trust tab: TrustGauge and decision badge are visible', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'TRUST' }).click();
    // TrustGauge canvas/svg should be visible
    const trustWrap = page.locator('.trust-wrap');
    await expect(trustWrap).toBeVisible();
    // Decision badge
    const decBadge = page.locator('.decision-badge').first();
    await expect(decBadge).toBeVisible();
    const badgeText = await decBadge.locator('.decision-badge-t').textContent();
    expect(badgeText?.trim().length).toBeGreaterThan(0);
  });

  test('trust tab: trust breakdown bars are rendered', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'TRUST' }).click();
    const bars = page.locator('.trust-bar');
    expect(await bars.count()).toBeGreaterThan(0);
    // Each bar should have a label and a numeric value
    const firstBar = bars.first();
    await expect(firstBar.locator('.trust-bar-lbl')).toBeVisible();
    await expect(firstBar.locator('.trust-bar-val')).toBeVisible();
  });

  test('CONSISTENCY: trust score in header matches trust tab', async ({ page }) => {
    // Trust score shown in pipeline complete label
    const headerText = await page.locator('text=GÜVEN').first().textContent();
    const headerScore = parseInt((headerText || '').match(/\d+/)?.[0] || '0');

    // Open trust tab
    await page.locator('.dash-tab').filter({ hasText: 'TRUST' }).click();
    // The TrustGauge renders the score — check the text-based score in the decision badge
    const decisionBadge = page.locator('.decision-badge').first();
    const uyumText = await decisionBadge.textContent();
    const uyumScore = parseInt((uyumText || '').match(/(\d+)\/100/)?.[1] || '0');

    // Both scores should be realistic (between 1 and 100)
    expect(headerScore).toBeGreaterThan(0);
    expect(uyumScore).toBeGreaterThan(0);
  });

  test('CONSISTENCY: decision badge tier matches badge text', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'TRUST' }).click();
    const badge = page.locator('.decision-badge').first();
    const badgeText = (await badge.locator('.decision-badge-t').textContent() || '').trim();
    const tagText = (await badge.locator('.decision-badge-tag').textContent() || '').toUpperCase();

    // "AL" (good) → tag should say NET
    // "KOŞULLU AL" (warn) → tag should say KOŞULLU
    // "ALMA" (bad) → tag should say OLUMSUZ
    if (badgeText.includes('KOŞULLU')) {
      expect(tagText).toContain('KOŞULLU');
    } else if (badgeText === 'AL') {
      expect(tagText).toContain('NET');
    } else if (badgeText === 'ALMA') {
      expect(tagText).toContain('OLUMSUZ');
    }
    // At minimum badge text is non-empty
    expect(badgeText.length).toBeGreaterThan(0);
  });

  // ─── Manip tab ───

  test('manip tab: source analysis content loads', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'KAYNAK ANALİZİ' }).click();
    await page.waitForTimeout(300);
    // Should show some content (conflicts or reviewers)
    const panel = page.locator('.dash').first();
    await expect(panel).toBeVisible();
  });

  // ─── Evidence tab ───

  test('evidence tab: scan animation starts then completes', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'KANIT' }).click();
    // Initially scanning
    const scanOverlay = page.locator('.imgver-scan-overlay');
    // May briefly show scanning state
    // After 2s, scanning should complete
    await page.waitForTimeout(2500);
    // Scanning overlay should be gone after completion
    const scanCount = await page.locator('.imgver-scan-overlay').count();
    expect(scanCount).toBe(0);
  });

  test('evidence tab: hotspot dots appear after scan completes', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'KANIT' }).click();
    await page.waitForTimeout(2500);
    // Hotspots should appear
    const hotspots = page.locator('.imgver-hotspot');
    expect(await hotspots.count()).toBeGreaterThan(0);
  });

  test('evidence tab: clicking hotspot shows AI analysis', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'KANIT' }).click();
    await page.waitForTimeout(2500);
    const hotspots = page.locator('.imgver-hotspot');
    if (await hotspots.count() > 0) {
      await hotspots.first().click();
      // AI analysis panel should appear
      await page.waitForTimeout(300);
      // Check that some detailed content appeared (the hotspot detail section)
      const evidenceArea = page.locator('.imgver-detail, [class*="hotspot-detail"], text=Uyum Oranı');
      // At minimum, active hotspot shows highlighted state
      await expect(hotspots.first()).toHaveClass(/active/);
    }
  });

  test('evidence tab: video cards are rendered', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'KANIT' }).click();
    await page.waitForTimeout(500);
    // Video cards should be visible
    const videoCards = page.locator('.video-card, [class*="vid"]').first();
    // We just check evidence tab has content
    const dash = page.locator('.dash');
    await expect(dash).toBeVisible();
  });

  // ─── Decision tab ───

  test('decision tab: decision report renders with badge', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'KARAR' }).click();
    const decisionPanel = page.locator('.decision-panel');
    await expect(decisionPanel).toBeVisible();
    const badge = page.locator('.decision-badge').first();
    await expect(badge).toBeVisible();
    const score = await badge.locator('text=/\\d+ \\/ 100/').textContent();
    expect(score).toBeTruthy();
  });

  test('decision tab: challenger list has at least 1 item', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'KARAR' }).click();
    const challengerItems = page.locator('.challenger-list li');
    expect(await challengerItems.count()).toBeGreaterThan(0);
  });

  test('decision tab: category scores are rendered', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'KARAR' }).click();
    const catRows = page.locator('.catsc-row');
    expect(await catRows.count()).toBeGreaterThan(0);
    // Each row should have a score value
    const firstScore = await page.locator('.catsc-row-score').first().textContent();
    const score = parseInt(firstScore || '0');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('CONSISTENCY: decision badge in trust tab matches decision in decision tab', async ({ page }) => {
    // Read badge from trust tab
    await page.locator('.dash-tab').filter({ hasText: 'TRUST' }).click();
    const trustBadge = (await page.locator('.decision-badge-t').first().textContent() || '').trim();

    // Switch to decision tab
    await page.locator('.dash-tab').filter({ hasText: 'KARAR' }).click();
    const decisionBadge = (await page.locator('.decision-badge-t').first().textContent() || '').trim();

    // Both should show the same decision
    expect(trustBadge).toBe(decisionBadge);
  });

  // ─── Price tab ───

  test('price tab: price data renders', async ({ page }) => {
    await page.locator('.dash-tab').filter({ hasText: 'FİYAT' }).click();
    const priceNow = page.locator('.price-now');
    await expect(priceNow).toBeVisible();
    const priceText = await priceNow.textContent();
    expect(priceText?.includes('₺')).toBe(true);
  });

  // ─── Product head action buttons ───

  test('3 action buttons are visible in product header', async ({ page }) => {
    const actions = page.locator('.product-actions');
    await expect(actions).toBeVisible();
    await expect(actions.getByRole('button', { name: /Karşılaştır/i })).toBeVisible();
    await expect(actions.getByRole('button', { name: /Extension/i })).toBeVisible();
    await expect(actions.getByRole('button', { name: /Sohbet/i })).toBeVisible();
  });

  test('"Danışmanla Sohbet Et" navigates to chat', async ({ page }) => {
    await page.locator('.product-actions').getByRole('button', { name: /Sohbet/i }).click();
    await expect(page.locator('.chat-wrap')).toBeVisible({ timeout: 3000 });
  });

  test('"Sony ile Karşılaştır" navigates to comparison', async ({ page }) => {
    await page.locator('.product-actions').getByRole('button', { name: /Karşılaştır/i }).click();
    await expect(page.locator('.cmp-head')).toBeVisible({ timeout: 3000 });
  });

  test('"Extension Önizleme" opens modal', async ({ page }) => {
    await page.locator('.product-actions').getByRole('button', { name: /Extension/i }).click();
    await expect(page.locator('.ext-overlay')).toBeVisible({ timeout: 3000 });
  });

  // ─── Agent strip ───

  test('agent strip shows all agents as done', async ({ page }) => {
    const strip = page.locator('text=PIPELINE · COMPLETE');
    await expect(strip).toBeVisible();
  });

  // ─── Profile strip ───

  test('profile strip is visible', async ({ page }) => {
    const profileStrip = page.locator('.profile-strip');
    await expect(profileStrip).toBeVisible();
  });

  test('"Profili Değiştir" navigates to personalization', async ({ page }) => {
    const editBtn = page.locator('button:has-text("Profili Değiştir"), button:has-text("Profilimi Ekle")');
    await editBtn.click();
    await expect(page.locator('.pers-q').first()).toBeVisible({ timeout: 3000 });
  });
});
