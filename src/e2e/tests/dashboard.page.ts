import { Page } from '@playwright/test';
import { Paths } from '../urls';
import { App } from './app';

export interface FileInfo {
    name: string;
    status: string;
    size: string;
}

export interface FileActionButtonState {
    title: string;
    isEnabled: boolean;
}

export class DashboardPage extends App {
    constructor(page: Page) {
        super(page);
    }

    async navigateTo() {
        await this.page.goto(Paths.DASHBOARD);
        // Wait for the files list to show up
        await this.page.locator('#file-list .file').first().waitFor({ state: 'visible' });
    }

    async getFiles(): Promise<FileInfo[]> {
        const fileElements = await this.page.locator('#file-list .file').all();
        const files: FileInfo[] = [];

        for (const elm of fileElements) {
            const name = await elm.locator('.name .text').textContent() || '';
            const statusElm = elm.locator('.content .status span.text');
            const statusCount = await statusElm.count();
            const status = statusCount > 0 ? await statusElm.innerHTML() : '';
            const size = await elm.locator('.size .size_info').textContent() || '';
            files.push({ name, status, size });
        }

        return files;
    }

    async selectFile(index: number) {
        await this.page.locator('#file-list .file').nth(index).click();
    }

    async isFileActionsVisible(index: number): Promise<boolean> {
        return this.page.locator('#file-list .file').nth(index).locator('.actions').isVisible();
    }

    async getFileActions(index: number): Promise<FileActionButtonState[]> {
        const fileElement = this.page.locator('#file-list .file').nth(index);
        const buttons = await fileElement.locator('.actions .button').all();
        const actions: FileActionButtonState[] = [];

        for (const button of buttons) {
            const title = await button.locator('div.text span').innerHTML();
            const disabled = await button.getAttribute('disabled');
            actions.push({
                title,
                isEnabled: disabled === null
            });
        }

        return actions;
    }
}