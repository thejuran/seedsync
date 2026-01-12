import { test, expect } from '@playwright/test';
import { AutoQueuePage } from './autoqueue.page';

test.describe('Testing autoqueue page', () => {
    test.beforeEach(async ({ page }) => {
        const autoQueuePage = new AutoQueuePage(page);
        await autoQueuePage.navigateTo();
    });

    test('should have right top title', async ({ page }) => {
        const autoQueuePage = new AutoQueuePage(page);
        const topTitle = await autoQueuePage.getTopTitle();
        expect(topTitle).toBe('AutoQueue');
    });

    test('should add and remove patterns', async ({ page }) => {
        const autoQueuePage = new AutoQueuePage(page);

        // start with an empty list
        expect(await autoQueuePage.getPatterns()).toEqual([]);

        // add some patterns, and expect them in added order
        await autoQueuePage.addPattern('APattern');
        await autoQueuePage.addPattern('CPattern');
        await autoQueuePage.addPattern('DPattern');
        await autoQueuePage.addPattern('BPattern');
        expect(await autoQueuePage.getPatterns()).toEqual([
            'APattern', 'CPattern', 'DPattern', 'BPattern'
        ]);

        // remove patterns one by one
        await autoQueuePage.removePattern(2);
        expect(await autoQueuePage.getPatterns()).toEqual([
            'APattern', 'CPattern', 'BPattern'
        ]);
        await autoQueuePage.removePattern(0);
        expect(await autoQueuePage.getPatterns()).toEqual([
            'CPattern', 'BPattern'
        ]);
        await autoQueuePage.removePattern(1);
        expect(await autoQueuePage.getPatterns()).toEqual([
            'CPattern'
        ]);
        await autoQueuePage.removePattern(0);
        expect(await autoQueuePage.getPatterns()).toEqual([]);
    });

    test('should list existing patterns in alphabetical order', async ({ page }) => {
        const autoQueuePage = new AutoQueuePage(page);

        // start with an empty list
        expect(await autoQueuePage.getPatterns()).toEqual([]);

        // add some patterns, and expect them in added order
        await autoQueuePage.addPattern('APattern');
        await autoQueuePage.addPattern('CPattern');
        await autoQueuePage.addPattern('DPattern');
        await autoQueuePage.addPattern('BPattern');

        // reload the page
        await autoQueuePage.navigateTo();

        // patterns should be in alphabetical order
        expect(await autoQueuePage.getPatterns()).toEqual([
            'APattern', 'BPattern', 'CPattern', 'DPattern'
        ]);

        // remove all patterns
        await autoQueuePage.removePattern(0);
        await autoQueuePage.removePattern(0);
        await autoQueuePage.removePattern(0);
        await autoQueuePage.removePattern(0);
        expect(await autoQueuePage.getPatterns()).toEqual([]);
    });
});