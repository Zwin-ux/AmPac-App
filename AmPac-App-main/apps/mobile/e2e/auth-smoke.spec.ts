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

const clickVisibleExactText = async (page: Page, text: string) => {
  const locator = page.getByText(text, { exact: true });
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible()) {
      await candidate.click();
      return;
    }
  }
  await locator.first().click();
};

const expectVisibleExactText = async (page: Page, text: string) => {
  const locator = page.getByText(text, { exact: true });
  const count = await locator.count();
  if (count === 0) {
    await expect(locator).toBeVisible();
    return;
  }

  for (let i = 0; i < count; i++) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible()) {
      await expect(candidate).toBeVisible();
      return;
    }
  }

  await expect(locator.first()).toBeVisible();
};

test.describe('Auth smoke', () => {
  test('Landing loads and navigates to Sign In / Sign Up', async ({ page }) => {
    await gotoLanding(page);

    await clickVisibleExactText(page, 'Sign In');
    await expectVisibleExactText(page, 'Email');
    await expectVisibleExactText(page, 'Demo Mode (Bypass)');

    await clickVisibleExactText(page, 'Sign In');
    await expect(page.getByText('Please fix the highlighted fields.')).toBeVisible();

    await page.getByText('Create account', { exact: true }).click();
    await expectVisibleExactText(page, 'Create Account');
  });

  test('Sign Up requires fields', async ({ page }) => {
    await gotoLanding(page);
    await clickVisibleExactText(page, 'Create Account');
    await expectVisibleExactText(page, 'Create Account');

    await page.getByText('Sign Up', { exact: true }).click();
    await expect(page.getByText('Please fix the highlighted fields.')).toBeVisible();
  });
});
