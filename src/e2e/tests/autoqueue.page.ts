import { Page } from '@playwright/test';
import { Paths } from '../urls';
import { App } from './app';

export class AutoQueuePage extends App {
    constructor(page: Page) {
        super(page);
    }

    async navigateTo() {
        await this.page.goto(Paths.AUTOQUEUE);
        // Wait for the page to fully load and SSE stream to connect
        // The autoqueue container should be present once the app is initialized
        await this.page.locator('#autoqueue').waitFor({ state: 'visible' });
    }

    async waitForPatternsToLoad(expectedCount: number) {
        // Wait for the expected number of patterns to appear (with a timeout)
        if (expectedCount > 0) {
            await this.page.waitForFunction(
                (expected) => document.querySelectorAll('#autoqueue .pattern').length >= expected,
                expectedCount,
                { timeout: 5000 }
            );
        }
    }

    async getPatterns(): Promise<string[]> {
        const elements = await this.page.locator('#autoqueue .pattern span.text').all();
        return Promise.all(elements.map(elm => elm.innerHTML()));
    }

    async addPattern(pattern: string) {
        await this.page.locator('#add-pattern input').fill(pattern);
        await this.page.locator('#add-pattern button.btn-success').click();
        // Wait for the pattern to appear in the list
        await this.page.locator(`#autoqueue .pattern span.text:has-text("${pattern}")`).waitFor({ state: 'visible' });
    }

    async removePattern(index: number) {
        // Get current count before removal
        const countBefore = await this.page.locator('#autoqueue .pattern').count();
        await this.page.locator('#autoqueue .pattern').nth(index).locator('button.btn-danger').click();
        // Wait for pattern count to decrease
        await this.page.waitForFunction(
            (expected) => document.querySelectorAll('#autoqueue .pattern').length === expected,
            countBefore - 1
        );
    }

    async removeAllPatterns() {
        // Remove all patterns by repeatedly clicking the first one
        while ((await this.page.locator('#autoqueue .pattern').count()) > 0) {
            await this.removePattern(0);
        }
    }
}