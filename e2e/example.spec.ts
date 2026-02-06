import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    // We assume the title is "CMMS - Dashboard" or similar. 
    // Adjust regex as needed based on actual layout.
    await expect(page).toHaveTitle(/Dashboard|CMMS/);
});
