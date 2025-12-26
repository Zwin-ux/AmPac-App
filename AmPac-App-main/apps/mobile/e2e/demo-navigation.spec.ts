import { test, expect, type Page } from '@playwright/test';

const gotoLanding = async (page: Page) => {
  await page.goto('/');

  const landingTitle = page.getByText('AmPac Business Capital');
  const splashDismiss = page.getByText('GOT IT! THANK YOU!', { exact: true });

  await Promise.race([
    landingTitle.waitFor({ state: 'visible', timeout: 15_000 }),
    splashDismiss.waitFor({ state: 'visible', timeout: 15_000 }),
  ]);

  if (await splashDismiss.isVisible()) {
    await splashDismiss.click();
  }

  await expect(landingTitle).toBeVisible({ timeout: 30_000 });
};

const enterDemoMode = async (page: Page) => {
  await gotoLanding(page);

  await page.getByText('Sign In', { exact: true }).click();
  await expect(page.getByText('Demo Mode (Bypass)', { exact: true })).toBeVisible();

  await page.getByText('Demo Mode (Bypass)', { exact: true }).click();
  await expect(page.getByText('Tools & Services')).toBeVisible({ timeout: 30_000 });
};

const openTab = async (page: Page, label: string) => {
  const candidates = [
    page.getByRole('button', { name: label }),
    page.getByRole('link', { name: label }),
    page.getByText(label, { exact: true }),
  ];

  for (const candidate of candidates) {
    try {
      await candidate.first().click({ timeout: 10_000 });
      return;
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Could not find tab control for "${label}".`);
};

test.describe('Demo mode navigation', () => {
  test('Demo mode reaches Home', async ({ page }) => {
    await enterDemoMode(page);
    await expect(page.getByText('Tools & Services')).toBeVisible();
  });

  test('Home → Spaces renders', async ({ page }) => {
    await enterDemoMode(page);

    await openTab(page, 'Spaces');
    await expect(page.getByText('Rent a Space', { exact: true })).toBeVisible({ timeout: 30_000 });
  });

  test('Home → Support renders', async ({ page }) => {
    await enterDemoMode(page);

    await openTab(page, 'Support');
    await expect(page.getByText('Support Hotline', { exact: true })).toBeVisible({ timeout: 30_000 });
  });
});
