import { test, expect } from '@playwright/test';

test.describe('Loan Application Flow', () => {
    test('should complete eligibility check and start application', async ({ page }) => {
        // 1. Navigate to Home
        await page.goto('/');

        // 2. Click "Apply for Loan" (Quick Action)
        await page.getByText('Apply for Loan').click();

        // 3. Eligibility Check
        await page.getByPlaceholder('e.g. 5').fill('5'); // Years in business
        await page.getByPlaceholder('e.g. 720').fill('750'); // Credit Score
        await page.getByText('Check Eligibility').click();

        // 4. Verify Product Selection (Step 0 -> Step 1 transition)
        await expect(page.getByText('Select a Loan Product')).toBeVisible();

        // 5. Select SBA 504
        await page.getByText('SBA 504 Loan').click();

        // 6. Verify Business Info Form (Step 1)
        await expect(page.getByText('Business Name')).toBeVisible();
        await page.getByPlaceholder("e.g. Joe's Coffee").fill('Test Biz Inc');
        await page.getByPlaceholder("e.g. 500000").fill('1000000'); // Revenue

        // 7. Next Step
        await page.getByText('Next Step').click();

        // 8. Verify Loan Details (Step 2)
        await expect(page.getByText('Loan Amount')).toBeVisible();
    });
});
