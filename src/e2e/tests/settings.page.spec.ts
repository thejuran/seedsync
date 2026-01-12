import { test, expect } from '@playwright/test';
import { SettingsPage } from './settings.page';

test.describe('Testing settings page', () => {
    test.beforeEach(async ({ page }) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.navigateTo();
    });

    test('should have right top title', async ({ page }) => {
        const settingsPage = new SettingsPage(page);
        const topTitle = await settingsPage.getTopTitle();
        expect(topTitle).toBe('Settings');
    });
});