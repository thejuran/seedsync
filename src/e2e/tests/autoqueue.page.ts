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
        await this.page.locator('#add-pattern input').fill(pattern);
        await this.page.locator('#add-pattern .button').click();
    }

    async removePattern(index: number) {
        await this.page.locator('#autoqueue .pattern').nth(index).locator('.button').click();
    }
}