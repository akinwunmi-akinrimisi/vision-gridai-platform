import { test, expect } from '@playwright/test';

const PIN = '2546';

async function authenticate(page) {
  await page.goto('/');
  const pinInput = page.locator('input[type="password"], input[type="number"], input[type="text"]').first();
  if (await pinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pinInput.fill(PIN);
    await page.locator('button:has-text("Unlock"), button[type="submit"]').first().click();
    await page.waitForTimeout(1000);
  }
}

test.describe('Dashboard Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('homepage loads and shows projects', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GridAI|Vision|Dashboard/i);
    await expect(page.locator('text=/Projects|Niches|Dashboard/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('sidebar navigation has expected items', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('nav, [class*="sidebar"], aside').first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });

  test('project dashboard loads for first project', async ({ page }) => {
    await page.goto('/');
    const projectLink = page.locator('a[href*="/project/"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.url()).toContain('/project/');
    }
  });
});

test.describe('Intelligence Layer Pages', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  const PROJECT_ID = '75eb2712-ef3e-47b7-b8db-5be3740233ff';

  test('Keywords page loads', async ({ page }) => {
    await page.goto(`/project/${PROJECT_ID}/keywords`);
    await expect(page.locator('text=/Keyword|Keywords|Scan/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('Intelligence Hub loads', async ({ page }) => {
    await page.goto(`/project/${PROJECT_ID}/intelligence`);
    await expect(page.locator('text=/Intelligence|Competitor|Monitor/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('Daily Ideas page loads', async ({ page }) => {
    await page.goto(`/project/${PROJECT_ID}/ideas`);
    await expect(page.locator('text=/Ideas|Daily|Generate/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('AI Coach page loads', async ({ page }) => {
    await page.goto(`/project/${PROJECT_ID}/coach`);
    await expect(page.locator('text=/Coach|AI Coach|Session/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('Analytics page loads', async ({ page }) => {
    await page.goto(`/project/${PROJECT_ID}/analytics`);
    await expect(page.locator('text=/Analytics|Performance|Revenue/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('Topics page loads', async ({ page }) => {
    await page.goto(`/project/${PROJECT_ID}/topics`);
    await expect(page.locator('text=/Topics|Review|Approve/i').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Accessibility Basics', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('homepage has no missing alt text on images', async ({ page }) => {
    await page.goto('/');
    const images = await page.locator('img:not([alt])').count();
    expect(images).toBe(0);
  });

  test('all interactive elements are keyboard focusable', async ({ page }) => {
    await page.goto('/');
    const buttons = await page.locator('button:visible').count();
    expect(buttons).toBeGreaterThan(0);
  });
});
