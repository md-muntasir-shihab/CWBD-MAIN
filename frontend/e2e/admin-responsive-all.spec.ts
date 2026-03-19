import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsAdmin } from './helpers';

const baseAdminRoutes = [
    '/__cw_admin__/dashboard',
    '/__cw_admin__/universities',
    '/__cw_admin__/exams',
    '/__cw_admin__/question-bank',
    '/__cw_admin__/students',
    '/__cw_admin__/student-groups',
    '/__cw_admin__/resources',
    '/__cw_admin__/payments',
    '/__cw_admin__/support-center',
    '/__cw_admin__/subscription-plans',
    '/__cw_admin__/settings',
    '/__cw_admin__/settings/home-control',
    '/__cw_admin__/settings/site-settings',
    '/__cw_admin__/settings/banner-manager',
    '/__cw_admin__/settings/security-center',
    '/__cw_admin__/settings/system-logs',
    '/__cw_admin__/settings/reports',
    '/__cw_admin__/settings/admin-profile',
    '/__cw_admin__/news',
    '/__cw_admin__/news/pending',
    '/__cw_admin__/news/sources',
];

const viewports = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
];

test.describe('Admin Responsive Matrix', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        test.skip(testInfo.project.name.includes('mobile'), 'Viewport matrix runs on desktop project only.');
        await loginAsAdmin(page);
    });

    for (const viewport of viewports) {
        test(`routes are responsive at ${viewport.width}x${viewport.height}`, async ({ page }) => {
            await page.setViewportSize(viewport);
            const context = page.context();

            let editorId = '';
            try {
                editorId = await page.evaluate(async () => {
                    const response = await fetch('/api/campusway-secure-admin/news?limit=1', { credentials: 'include' });
                    if (!response.ok) return '';
                    const body = await response.json();
                    const first = Array.isArray(body?.items) ? body.items[0] : null;
                    return String(first?._id || '');
                });
            } catch {
                editorId = '';
            }

            const routes = [
                ...baseAdminRoutes,
                `/__cw_admin__/news/editor/${editorId || '000000000000000000000000'}`,
                '/__cw_admin__/news/editor/000000000000000000000000',
            ];

            let currentPage = page;

            for (let index = 0; index < routes.length; index += 1) {
                const route = routes[index];
                if (index > 0) {
                    await currentPage.close();
                    currentPage = await context.newPage();
                    await currentPage.setViewportSize(viewport);
                }

                const tracker = attachHealthTracker(currentPage);
                await currentPage.goto(route);
                await expect(currentPage.locator('main').first(), `main shell missing on ${route}`).toBeVisible();

                const overflow = await currentPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
                expect.soft(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);

                if (viewport.width <= 420) {
                    const menuVisible = await currentPage
                        .locator('button[aria-label*="menu" i], button:has-text("Menu"), button:has-text("Open admin menu")')
                        .first()
                        .isVisible()
                        .catch(() => false);
                    expect.soft(menuVisible, `mobile menu trigger missing on ${route}`).toBeTruthy();
                }

                await expectPageHealthy(currentPage, tracker);
                tracker.detach();
            }
        });
    }
});
