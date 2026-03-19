import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsAdmin } from './helpers';

test.describe('News admin routes', () => {
    test('canonical /__cw_admin__/news routes resolve without runtime failures', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await loginAsAdmin(page);

        const routes: Array<{ path: string; marker: RegExp }> = [
            { path: '/__cw_admin__/news', marker: /News Dashboard/i },
            { path: '/__cw_admin__/news/pending', marker: /Pending/i },
            { path: '/__cw_admin__/news/drafts', marker: /Drafts/i },
            { path: '/__cw_admin__/news/published', marker: /Published/i },
            { path: '/__cw_admin__/news/scheduled', marker: /Scheduled/i },
            { path: '/__cw_admin__/news/rejected', marker: /Rejected/i },
            { path: '/__cw_admin__/news/ai-selected', marker: /AI Selected/i },
            { path: '/__cw_admin__/news/sources', marker: /RSS Sources|Sources/i },
            { path: '/__cw_admin__/news/editor/000000000000000000000000', marker: /News Editor|Edit News|Create News/i },
            { path: '/__cw_admin__/news/settings', marker: /News Settings|Settings/i },
        ];

        for (const route of routes) {
            await page.goto(route.path);
            await expect(page).toHaveURL(/\/__cw_admin__\/news(\/.*)?$/i);
            await expect(page.locator('body')).toBeVisible();
            await expect(page.getByRole('heading', { name: route.marker }).first()).toBeVisible();
        }

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });

    test('legacy /admin/news redirects to secret admin base', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/news/sources');
        await expect(page).toHaveURL(/\/__cw_admin__\/news\/sources$/);
    });
});
