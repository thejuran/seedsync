import { Page } from '@playwright/test';

export class App {
    constructor(protected page: Page) {}

    async navigateTo() {
        await this.page.goto('/');
    }

    async getTitle(): Promise<string> {
        return this.page.title();
    }

    async getSidebarItems(): Promise<string[]> {
        const items = await this.page.locator('#sidebar a span.text').all();
        return Promise.all(items.map(item => item.innerHTML()));
    }

    async getTopTitle(): Promise<string> {
        return this.page.locator('#title').innerHTML();
    }
}