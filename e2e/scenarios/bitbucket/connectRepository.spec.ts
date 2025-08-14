import { APIRequestContext, expect, Page } from '@playwright/test';
import { closeOnboardingQuickPick, setupPullrequests } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings, ExplorerDrawer } from 'e2e/page-objects';

const addRepo = async (page: Page) => {
    await new AtlascodeDrawer(page).pullRequests.addRepository();
    await page.waitForTimeout(250);

    // if (await new ExplorerDrawer(page).)
    const pathInput = page.getByRole('textbox', { name: 'Type to narrow down results. - Add Folder to Workspace' });
    await pathInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(250);

    await pathInput.fill('/mock-repository/');
    await page.waitForTimeout(250);

    await page.getByRole('option', { name: '.git' }).waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'Add' }).click();
};

export async function connectRepository(page: Page, request: APIRequestContext) {
    await closeOnboardingQuickPick(page);

    const atlascodeDrawer = new AtlascodeDrawer(page);

    const cleanupSetupPullrequests = await setupPullrequests(request, []);

    await new AtlassianSettings(page).closeSettingsPage();

    await addRepo(page);

    const explorerDrawer = new ExplorerDrawer(page);
    await explorerDrawer.waitForExplorerLoad();
    const isRepoAddFailed = await explorerDrawer.isNoRepository();

    await atlascodeDrawer.openAtlascodeDrawer();
    await page.waitForTimeout(250);

    await atlascodeDrawer.pullRequests.waitForNavigationLoad();

    if (isRepoAddFailed) {
        await page.waitForTimeout(500);

        await addRepo(page);

        await atlascodeDrawer.pullRequests.waitForNavigationLoad();
    }

    await expect(atlascodeDrawer.pullRequests.mockRepo).toBeVisible();

    await cleanupSetupPullrequests();
}
