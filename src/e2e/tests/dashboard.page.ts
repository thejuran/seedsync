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
        // Wait for the files list to show up (files are inside virtual scroll viewport)
        await this.page.locator('#file-list .file').first().waitFor({ state: 'visible', timeout: 30000 });
    }

    async waitForFileCount(count: number, timeout: number = 10000) {
        // Wait for a specific number of files to be loaded (for incremental loading)
        // With virtual scrolling, we can only count files currently rendered in the viewport
        await this.page.waitForFunction(
            (expectedCount) => {
                const files = document.querySelectorAll('#file-list .file');
                return files.length >= expectedCount;
            },
            count,
            { timeout }
        );
    }

    async getFiles(): Promise<FileInfo[]> {
        const fileElements = await this.page.locator('#file-list .file').all();
        const files: FileInfo[] = [];

        for (const elm of fileElements) {
            // File name is now in .name .text .title (with truncation)
            const name = (await elm.locator('.name .text .title').textContent() || '').trim();
            const statusElm = elm.locator('.content .status span.text');
            const statusCount = await statusElm.count();
            const status = statusCount > 0 ? (await statusElm.innerHTML()).trim() : '';
            const size = (await elm.locator('.size .size_info').textContent() || '').trim();
            files.push({ name, status, size });
        }

        return files;
    }

    async selectFile(index: number) {
        await this.page.locator('#file-list .file').nth(index).click();
    }

    /**
     * Check if the file actions bar is visible for a selected file.
     * Actions are now shown in the external file-actions-bar component instead of inline.
     */
    async isFileActionsVisible(index: number): Promise<boolean> {
        // Get the file name at the given index
        const file = this.page.locator('#file-list .file').nth(index);
        const fileName = await file.locator('.name .text .title').textContent();

        // Check if the file-actions-bar shows this file's name
        const actionsBar = this.page.locator('app-file-actions-bar .file-actions-bar');
        const isVisible = await actionsBar.isVisible();
        if (!isVisible) {
            return false;
        }

        const barFileName = await actionsBar.locator('.name-text').textContent();
        return barFileName?.trim() === fileName?.trim();
    }

    /**
     * Get action button states from the external file-actions-bar.
     * Note: The file must be selected first for actions to appear.
     */
    async getFileActions(index: number): Promise<FileActionButtonState[]> {
        // Make sure the file is selected first
        await this.selectFile(index);

        // Wait for actions bar to be visible
        const actionsBar = this.page.locator('app-file-actions-bar .file-actions-bar');
        await actionsBar.waitFor({ state: 'visible', timeout: 5000 });

        const buttons = await actionsBar.locator('.actions button').all();
        const actions: FileActionButtonState[] = [];

        for (const button of buttons) {
            const title = (await button.textContent() || '').trim();
            const disabled = await button.isDisabled();
            actions.push({
                title,
                isEnabled: !disabled
            });
        }

        return actions;
    }
}