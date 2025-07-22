import type { Page } from '@playwright/test';

/**
 * Helper function to connect Bitbucket repository
 */
export const connectRepository = async (page: Page) => {
    await page.getByRole('treeitem', { name: 'Add a repository to this workspace' }).click();

    const pathInput = page.getByRole('textbox', { name: '' });
    await pathInput.waitFor({ state: 'visible' });
    await pathInput.clear();
    await page.waitForTimeout(250);

    await pathInput.fill('~/mock-repository/');
    await page.getByRole('option', { name: '.git' }).waitFor({ state: 'visible' });

    await page.waitForTimeout(250);

    await page.getByRole('button', { name: 'Add' }).click();

    await page.waitForTimeout(1000);

    const agreeTrustButton = page.getByRole('button', { name: 'Yes' });
    await agreeTrustButton.waitFor({ state: 'visible' });
    await agreeTrustButton.click();

    await page.waitForTimeout(1000);

    //
    const testFileCount = await page.getByRole('treeitem', { name: 'test.json' }).count();

    if (testFileCount === 0) {
        await page.getByRole('tab', { name: 'Explorer' }).click();
        await page.getByRole('tab', { name: 'Atlassian' }).click();
        await page.getByRole('treeitem', { name: 'Add a repository to this workspace' }).click();

        const pathInput = page.getByRole('textbox', { name: '' });
        await pathInput.waitFor({ state: 'visible' });
        await pathInput.clear();
        await page.waitForTimeout(250);

        await pathInput.fill('~/mock-repository/');
        await page.getByRole('option', { name: '.git' }).waitFor({ state: 'visible' });

        await page.waitForTimeout(250);

        await page.getByRole('button', { name: 'Add' }).click();

        await page.waitForTimeout(1000);

        const agreeTrustButton = page.getByRole('button', { name: 'Yes' });
        await agreeTrustButton.waitFor({ state: 'visible' });
        await agreeTrustButton.click();
    }

    await page.waitForTimeout(1000);

    const agreeTrustButton2 = page.getByRole('button', { name: 'Yes' });
    const agreeTrustButtonCount = await agreeTrustButton2.count();
    if (agreeTrustButtonCount !== 0) {
        await agreeTrustButton2.waitFor({ state: 'visible' }).catch(() => {});
        await agreeTrustButton2.click().catch(() => {});
    }

    // sometimes page is redirected to Explorer tab and this is workaround so we sure extension tab will be opened
    await page.getByRole('tab', { name: 'Explorer' }).click();

    await page.getByRole('tab', { name: 'Atlassian' }).click();

    await page.waitForTimeout(1000);
};
