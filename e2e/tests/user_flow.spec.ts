import { test, expect } from '@playwright/test';

test.describe('Replexity User Flow', () => {
  test.setTimeout(120000); // 2 minutes, as backend analysis can be slow

  test('completes a full GitHub repository analysis flow', async ({ page }) => {
    // 1. Visit the home page
    await page.goto('http://localhost:5173/');
    
    // Expect brand name
    await expect(page.locator('h1').filter({ hasText: 'Replexity' })).toBeVisible();

    // 2. Navigate to Analyze page
    await page.getByRole('link', { name: /Launch Analysis|Analyze/i }).first().click();
    
    // Should be on the /analyze page
    await expect(page).toHaveURL(/.*\/analyze/);
    
    // 3. Enter a small public repository URL to analyze
    const urlInput = page.getByPlaceholder(/github\.com/i);
    await urlInput.fill('https://github.com/expressjs/cors');
    
    // 4. Submit the analysis
    await page.getByRole('button', { name: /Analyze/i }).click();
    await page.waitForTimeout(2000); // give it a beat to show loading
    await page.screenshot({ path: 'debug1.png' });

    // 5. Wait for the analysis to process and redirect to dashboard
    try {
      await page.waitForURL(/.*\/dashboard/, { timeout: 60000 });
    } catch (e) {
      await page.screenshot({ path: 'debug2_failed.png' });
      throw e;
    }
    
    // 6. Assert dashboard metrics are rendered
    await expect(page.getByText(/Risk Distribution/i)).toBeVisible();
    await expect(page.getByText(/Complexity Profile/i)).toBeVisible();
    await expect(page.getByText(/Maintenance Trends/i)).toBeVisible();
  });
});
