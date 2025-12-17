import { test, expect } from '@playwright/test';

test.describe('Group Chat & Social Features', () => {
  // Note: These tests assume a web-build of the React Native app is served.
  // We need to bypass Auth or have a seeded auth state.
  
  test('User can switch channels and see messages', async ({ page }) => {
    // 1. Login (Simulated)
    await page.goto('/'); 
    // Wait for app load
    await expect(page.locator('text=AmPac')).toBeVisible();

    // 2. Navigate to Chat (assuming "Chat" tab exists or we force nav)
    // Checks for existence of Channel List
    await page.click('text=Chat'); 
    await expect(page.locator('text=#General')).toBeVisible();

    // 3. Enter Channel
    await page.click('text=#General');
    await expect(page.locator('text=Message #General')).toBeVisible();

    // 4. Send Message
    const testMessage = `Test Message ${Date.now()}`;
    await page.fill('input[placeholder="Message #General"]', testMessage);
    await page.click('text=Send');

    // 5. Verify Message Appears
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
  });

  test('User can like a feed post', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Community'); // Assuming Feed is "Community" tab

    // Find first post like button
    const likeBtn = page.locator('text=🤍').first();
    await likeBtn.click();

    // Verify change to Liked state
    await expect(page.locator('text=❤️').first()).toBeVisible();
  });
});
