import { test, expect } from '@playwright/test';

test.describe('Website Builder Flow', () => {
    test('should generate and publish a website', async ({ page }) => {
        // 1. Navigate to Home
        await page.goto('/');

        // 2. Click "Website Builder" card
        // Note: Adjust selector based on actual text or testID
        await page.getByText('Website Builder').click();

        // 3. Fill out Business Info
        await page.getByPlaceholder("e.g. Joe's Coffee").fill('Test Coffee Shop');
        await page.getByPlaceholder("e.g. Cafe, Plumber, Consultant").fill('Cafe');
        await page.getByPlaceholder("e.g. 90210").fill('90210');
        await page.getByPlaceholder("e.g. A cozy, modern coffee shop").fill('Best coffee in town with free wifi.');

        // 4. Generate
        await page.getByText('Generate Website').click();

        // 5. Wait for Preview (Generating step takes time)
        await expect(page.getByText('Preview')).toBeVisible({ timeout: 30000 });

        // 6. Check for generated content in WebView
        // Note: WebView content might be in an iframe, Playwright handles frames well
        const frame = page.frameLocator('iframe'); // WebView usually renders as iframe on web
        // If it's just a div with html, check for text directly
        // await expect(page.getByText('Test Coffee Shop')).toBeVisible();

        // 7. Publish
        await page.getByText('Publish').click();

        // 8. Verify Success
        await expect(page.getByText("You're Live!")).toBeVisible();
        await expect(page.getByText('PUBLIC URL')).toBeVisible();
    });
});
