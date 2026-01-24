import { Page } from '@playwright/test';
import { Paths } from '../urls';
import { App } from './app';

export class AutoQueuePage extends App {
    constructor(page: Page) {
        super(page);
    }

    async navigateTo() {
        await this.page.goto(Paths.AUTOQUEUE);
    }

    async getPatterns(): Promise<string[]> {
        const elements = await this.page.locator('#autoqueue .pattern span.text').all();
        return Promise.all(elements.map(elm => elm.innerHTML()));
    }

    async addPattern(pattern: string) {
        const currentCount = await this.page.locator('#autoqueue .pattern').count();
        await this.page.locator('#add-pattern input').fill(pattern);
        await this.page.locator('#add-pattern .button').click();
        // Wait for the new pattern to appear in the list
        await this.page.locator('#autoqueue .pattern').nth(currentCount).waitFor({ state: 'visible' });
    }

    async removePattern(index: number) {
        const currentCount = await this.page.locator('#autoqueue .pattern').count();
        await this.page.locator('#autoqueue .pattern').nth(index).locator('.button').click();
        // Wait for the pattern count to decrease
        if (currentCount > 1) {
            await this.page.waitForFunction(
                (expectedCount) => document.querySelectorAll('#autoqueue .pattern').length === expectedCount,
                currentCount - 1
            );
        } else {
            // Wait for all patterns to be removed
            await this.page.locator('#autoqueue .pattern').first().waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
        }
    }

    async clearAllPatterns() {
        let count = await this.page.locator('#autoqueue .pattern').count();
        while (count > 0) {
            await this.removePattern(0);
            count = await this.page.locator('#autoqueue .pattern').count();
        }
    }
}