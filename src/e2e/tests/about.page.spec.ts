import { test, expect } from '@playwright/test';
import { AboutPage } from './about.page';

test.describe('Testing about page', () => {
    test.beforeEach(async ({ page }) => {
        const aboutPage = new AboutPage(page);
        await aboutPage.navigateTo();
    });

    test('should have right top title', async ({ page }) => {
        const aboutPage = new AboutPage(page);
        const topTitle = await aboutPage.getTopTitle();
        expect(topTitle).toBe('About');
    });

    test('should have the right version', async ({ page }) => {
        const aboutPage = new AboutPage(page);
        const version = await aboutPage.getVersion();
        expect(version).toBe('v1.0.0');
    });
});