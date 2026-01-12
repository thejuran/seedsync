import { test, expect } from '@playwright/test';
import { App } from './app';

test.describe('Testing top-level app', () => {
    test.beforeEach(async ({ page }) => {
        const app = new App(page);
        await app.navigateTo();
    });

    test('should have right title', async ({ page }) => {
        const app = new App(page);
        const title = await app.getTitle();
        expect(title).toBe('SeedSync');
    });

    test('should have all the sidebar items', async ({ page }) => {
        const app = new App(page);
        const items = await app.getSidebarItems();
        expect(items).toEqual([
            'Dashboard',
            'Settings',
            'AutoQueue',
            'Logs',
            'About',
            'Restart'
        ]);
    });

    test('should default to the dashboard page', async ({ page }) => {
        const app = new App(page);
        const topTitle = await app.getTopTitle();
        expect(topTitle).toBe('Dashboard');
    });
});