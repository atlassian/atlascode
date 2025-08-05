import type { Page } from '@playwright/test';

export const createPullrequest = async (page: Page) => {
    const createPRFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Create pull request"]');
    await createPRFrame.getByRole('combobox').filter({ hasText: 'Source branch' }).locator('input').click();
    await page.waitForTimeout(250);

    await createPRFrame.getByRole('option', { name: 'test-branch' }).click();
    await page.waitForTimeout(250);

    await createPRFrame
        .locator('div:has-text("Push latest changes from local to remote branch")')
        .locator('input[type="checkbox"]')
        .first()
        .click();

    await createPRFrame.getByRole('button', { name: 'Create pull request' }).click();
    await page.waitForTimeout(250);
};
