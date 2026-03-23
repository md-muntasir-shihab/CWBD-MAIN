import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Communication Hub', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should navigate to Communication Hub and load all panels', async ({ page }) => {
        // 1. Navigate to Campaigns
        await page.getByRole('link', { name: /Campaigns/i }).click();
        await expect(page).toHaveURL(/.*\/admin\/campaigns.*/);

        // 2. Click on Providers Tab
        await page.getByRole('tab', { name: /Providers/i }).click();
        await expect(page.locator('h3', { hasText: 'SMS & Email Providers' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Add New Provider/i })).toBeVisible();

        // 3. Click on Smart Triggers Tab
        await page.getByRole('tab', { name: /Smart Triggers/i }).click();
        await expect(page.locator('h3', { hasText: 'Automation Triggers' })).toBeVisible();
        await expect(page.locator('text=Automatically dispatch notifications')).toBeVisible();

        // 4. Click on Export / Copy Tab
        await page.getByRole('tab', { name: /Export \/ Copy/i }).click();
        await expect(page.locator('h3', { hasText: 'Export / Copy Center' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Download Export/i }).or(page.getByRole('button', { name: /Copy to Clipboard/i }))).toBeVisible();
    });

    test('should allow interacting with Export Center options', async ({ page }) => {
        await page.goto('/__cw_admin__/campaigns#export_copy');
        
        // Ensure Export Center loaded
        await expect(page.locator('h3', { hasText: 'Export / Copy Center' })).toBeVisible();

        // Select 'Manual Send List'
        await page.locator('button', { hasText: 'Manual Send List' }).click();

        // Ensure 'Channel' select appears
        const channelLabel = page.locator('label', { hasText: 'Channel' });
        await expect(channelLabel).toBeVisible();

        // Change format to clipboard
        await page.locator('select[title="Export Format"]').selectOption('clipboard');

        // Ensure 'Copy to Clipboard' button is visible
        await expect(page.getByRole('button', { name: /Copy to Clipboard/i })).toBeVisible();
    });
});
