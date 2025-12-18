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

test.describe('Apply pre-check flow', () => {
  test('User can complete pre-check to eligible state', async ({ page }) => {
    await enterDemoMode(page);

    await openTab(page, 'Apply');
    await expect(page.getByText('Instant Application', { exact: true })).toBeVisible({ timeout: 30_000 });

    await page.getByText('Start Pre-Check', { exact: true }).click();
    await expect(page.getByText('Preliminary Check', { exact: true })).toBeVisible();

    await page.getByText('Yes', { exact: true }).click();
    await page.getByPlaceholder('e.g. 500000', { exact: true }).fill('250000');
    await page.getByPlaceholder('e.g. 3', { exact: true }).fill('2');

    await page.getByText('Check Eligibility', { exact: true }).click();

    await expect(page.getByText("You're Eligible!", { exact: true })).toBeVisible({ timeout: 30_000 });
  });
});
