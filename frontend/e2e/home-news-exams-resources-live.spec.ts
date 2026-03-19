import { expect, test, type Page } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsAdmin } from './helpers';

const ADMIN_PATH = process.env.E2E_ADMIN_PATH || 'campusway-secure-admin';

type VisibilityKey = 'newsPreview' | 'resourcesPreview' | 'examsWidget';

async function readAccessToken(page: Page): Promise<string> {
    const token = await page.evaluate(() => (
        window.sessionStorage.getItem('campusway-token')
        || window.localStorage.getItem('campusway-token')
        || ''
    ));
    return token || '';
}

async function adminGetHomeSettings(page: Page, token: string): Promise<{ ok: boolean; status: number; body: any }> {
    return page.evaluate(async ({ authToken, preferred }) => {
        const bases = [`/api/${preferred}`, '/api/admin'];
        for (const base of bases) {
            const response = await fetch(`${base}/settings/home`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
                credentials: 'include',
            });
            if (response.status !== 404) {
                let body: any = null;
                try {
                    body = await response.json();
                } catch {
                    body = null;
                }
                return { ok: response.ok, status: response.status, body };
            }
        }
        return { ok: false, status: 404, body: null };
    }, { authToken: token, preferred: ADMIN_PATH });
}

async function adminSetSectionVisibility(
    page: Page,
    token: string,
    key: VisibilityKey,
    value: boolean,
): Promise<{ ok: boolean; status: number; body: any }> {
    return page.evaluate(async ({ authToken, preferred, sectionKey, sectionValue }) => {
        const bases = [`/api/${preferred}`, '/api/admin'];
        for (const base of bases) {
            const response = await fetch(`${base}/settings/home`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                credentials: 'include',
                body: JSON.stringify({
                    sectionVisibility: {
                        [sectionKey]: sectionValue,
                    },
                }),
            });
            if (response.status !== 404) {
                let body: any = null;
                try {
                    body = await response.json();
                } catch {
                    body = null;
                }
                return { ok: response.ok, status: response.status, body };
            }
        }
        return { ok: false, status: 404, body: null };
    }, {
        authToken: token,
        preferred: ADMIN_PATH,
        sectionKey: key,
        sectionValue: value,
    });
}

async function readHomeShape(page: Page): Promise<{
    ok: boolean;
    status: number;
    newsCount: number;
    resourcesCount: number;
    upcomingExamCount: number;
    onlineExamCount: number;
}> {
    return page.evaluate(async () => {
        const response = await fetch('/api/home', { credentials: 'include' });
        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                newsCount: 0,
                resourcesCount: 0,
                upcomingExamCount: 0,
                onlineExamCount: 0,
            };
        }
        const body = await response.json();
        const upcomingExamUniversities = Array.isArray(body?.upcomingExamUniversities) ? body.upcomingExamUniversities.length : 0;
        const upcomingExamClusters = Array.isArray(body?.upcomingExamClusters) ? body.upcomingExamClusters.length : 0;
        const onlineExamItems = Array.isArray(body?.onlineExamsPreview?.items) ? body.onlineExamsPreview.items.length : 0;
        return {
            ok: true,
            status: response.status,
            newsCount: Array.isArray(body?.newsPreviewItems) ? body.newsPreviewItems.length : 0,
            resourcesCount: Array.isArray(body?.resourcePreviewItems) ? body.resourcePreviewItems.length : 0,
            upcomingExamCount: upcomingExamUniversities + upcomingExamClusters,
            onlineExamCount: onlineExamItems,
        };
    });
}

test.describe('Home News/Exams/Resources Smoke', () => {
    test('home sections render and click-through stays connected', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await page.goto('/');

        const homeShape = await readHomeShape(page);
        expect(homeShape.ok, JSON.stringify(homeShape)).toBeTruthy();

        if (homeShape.upcomingExamCount > 0) {
            await expect(page.getByRole('heading', { name: /Upcoming Exams/i }).first()).toBeVisible();
            await page.locator('a[href="/universities"]').filter({ hasText: /See all|View all/i }).first().click();
            await expect(page).toHaveURL(/\/universities$/);
            await page.goBack();
            await expect(page).toHaveURL(/\/$/);
        }

        if (homeShape.onlineExamCount > 0) {
            await expect(page.getByRole('heading', { name: /Online Exams/i }).first()).toBeVisible();
            await page.locator('a[href="/exams"]').filter({ hasText: /View all/i }).first().click();
            await expect(page).toHaveURL(/\/exams$/);
            await page.goBack();
            await expect(page).toHaveURL(/\/$/);
        }

        if (homeShape.newsCount > 0) {
            await expect(page.getByRole('heading', { name: /Latest News/i }).first()).toBeVisible();
            await page.locator('a[href="/news"]').filter({ hasText: /View all/i }).first().click();
            await expect(page).toHaveURL(/\/news$/);
            await page.goBack();
            await expect(page).toHaveURL(/\/$/);
        }

        if (homeShape.resourcesCount > 0) {
            await expect(page.getByRole('heading', { name: /Resources/i }).first()).toBeVisible();
            await page.locator('a[href="/resources"]').filter({ hasText: /View all/i }).first().click();
            await expect(page).toHaveURL(/\/resources$/);
            await page.goBack();
            await expect(page).toHaveURL(/\/$/);
        }

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });

    test('home reflects admin live visibility updates for news/resources/exams', async ({ page }) => {
        const tracker = attachHealthTracker(page);

        await loginAsAdmin(page);
        const token = await readAccessToken(page);
        expect(token.length).toBeGreaterThan(0);

        await page.goto('/');
        const homeShape = await readHomeShape(page);
        expect(homeShape.ok, JSON.stringify(homeShape)).toBeTruthy();

        const settingsBefore = await adminGetHomeSettings(page, token);
        expect(settingsBefore.ok, JSON.stringify(settingsBefore)).toBeTruthy();

        const candidates: Array<{ key: VisibilityKey; heading: RegExp; hasItems: boolean }> = [
            { key: 'newsPreview', heading: /Latest News/i, hasItems: homeShape.newsCount > 0 },
            { key: 'resourcesPreview', heading: /Resources/i, hasItems: homeShape.resourcesCount > 0 },
            { key: 'examsWidget', heading: /Upcoming Exams/i, hasItems: (homeShape.upcomingExamCount + homeShape.onlineExamCount) > 0 },
        ];

        const chosen = candidates.find((item) => item.hasItems) || candidates[0];
        const previousValue = Boolean(settingsBefore.body?.homeSettings?.sectionVisibility?.[chosen.key]);
        const heading = page.getByRole('heading', { name: chosen.heading }).first();

        try {
            const enableResult = await adminSetSectionVisibility(page, token, chosen.key, true);
            expect(enableResult.ok, JSON.stringify(enableResult)).toBeTruthy();

            if (chosen.hasItems) {
                await expect(heading).toBeVisible({ timeout: 45000 });
            }

            const disableResult = await adminSetSectionVisibility(page, token, chosen.key, false);
            expect(disableResult.ok, JSON.stringify(disableResult)).toBeTruthy();

            if (chosen.hasItems) {
                await expect(heading).toHaveCount(0, { timeout: 45000 });
            }
        } finally {
            const restoreResult = await adminSetSectionVisibility(page, token, chosen.key, previousValue);
            expect(restoreResult.ok, JSON.stringify(restoreResult)).toBeTruthy();
        }

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });
});
