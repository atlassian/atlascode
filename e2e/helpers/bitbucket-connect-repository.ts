import type { Page } from '@playwright/test';

const goToExtensionTab = async (page: Page) => {
    // sometimes page is redirected to Explorer tab and this is workaround so we sure extension tab will be opened
    await page.getByRole('tab', { name: 'Explorer' }).click();
    await page.waitForTimeout(250);
    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.waitForTimeout(250);
};

const addRepo = async (page: Page) => {
    await page.getByRole('treeitem', { name: 'Add a repository to this workspace' }).click();

    const pathInput = page.getByRole('textbox', { name: '' });
    await pathInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(250);

    await page.waitForTimeout(250);

    await pathInput.fill('/mock-repository/');
    await page.waitForTimeout(250);

    await page.getByRole('option', { name: '.git' }).waitFor({ state: 'visible' });
    await page.waitForTimeout(250);

    await page.getByRole('button', { name: 'Add' }).click();
};

/**
 * Helper function to connect Bitbucket repository
 */
export const connectRepository = async (page: Page) => {
    await addRepo(page);
    await page.waitForTimeout(1000);

    await goToExtensionTab(page);
    await page.waitForTimeout(1000);

    const addRepoButtonCount = await page.getByRole('treeitem', { name: 'Add a repository to this workspace' }).count();
    if (addRepoButtonCount !== 0) {
        await addRepo(page);
        await page.waitForTimeout(1000);
    }
};
