import { test as base } from '@playwright/test';

export const test = base.extend<{ forEachTest: void }>({
    forEachTest: [
        async ({ page }, use) => {
            await use();

            // after test script
            await page.getByRole('button', { name: 'Manage' }).click();
            await page.waitForTimeout(250);
            await page.getByRole('menuitem', { name: 'Command Palette' }).click();
            await page.waitForTimeout(500);
            await page.keyboard.type('Workspaces: Close Workspace');
            await page.waitForTimeout(250);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1500);
        },
        { auto: true },
    ],
});
