import { expect, Page } from '@playwright/test';
import { ExplorerDrawer } from 'e2e/page-objects';

export const cleanupWorkspace = async (page: Page) => {
    await page.goto('http://localhost:9988/');

    const explorerDrawer = new ExplorerDrawer(page);
    if (!(await explorerDrawer.isTabOpened())) {
        await explorerDrawer.openExplorerDrawer();
    }
    await explorerDrawer.waitForExplorerLoad();
    await page.waitForTimeout(1000);
    const isRepo = !(await explorerDrawer.isNoRepository());

    if (isRepo) {
        await page.keyboard.press('F1');
        await page.getByPlaceholder('Type the name of a command to run.').waitFor({ state: 'visible' });
        await page.keyboard.type('Workspaces: Remove Folder from Workspace');
        await page.waitForTimeout(250);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(250);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);
    }

    const isWorkspaceClear = await explorerDrawer.isNoRepository();
    expect(isWorkspaceClear).toBeTruthy();
};
