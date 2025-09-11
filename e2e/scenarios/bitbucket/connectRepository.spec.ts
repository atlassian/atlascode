import { APIRequestContext, Page } from '@playwright/test';
import { setupPullrequests } from 'e2e/helpers';
import { JiraTypes as BitbucketTypes } from 'e2e/helpers/types';
import { AtlascodeDrawer, AtlassianSettings, ExplorerDrawer } from 'e2e/page-objects';

const addRepo = async (page: Page, type: BitbucketTypes) => {
    await new AtlascodeDrawer(page).pullRequests.addRepository();
    await page.waitForTimeout(250);

    const pathInput = page.getByRole('textbox', { name: 'Type to narrow down results. - Add Folder to Workspace' });
    await pathInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(250);

    if (type === BitbucketTypes.Cloud) {
        await pathInput.fill('/mock-repository/');
    } else if (type === BitbucketTypes.DC) {
        await pathInput.fill('/dc-repository/');
    }

    await page.waitForTimeout(250);

    await page.getByRole('option', { name: '.git' }).waitFor({ state: 'visible' });

    await page.keyboard.press('Enter');
};

export async function connectRepository(page: Page, type: BitbucketTypes, request: APIRequestContext) {
    const atlascodeDrawer = new AtlascodeDrawer(page, type);

    const cleanupSetupPullrequests = await setupPullrequests(request, []);

    await new AtlassianSettings(page).closeSettingsPage();

    await addRepo(page, type);

    const explorerDrawer = new ExplorerDrawer(page);

    if (type === BitbucketTypes.DC) {
        await explorerDrawer.openExplorerDrawer();
    }

    await explorerDrawer.waitForExplorerLoad();
    await page.waitForTimeout(500);
    const isRepoAddFailed = await explorerDrawer.isNoRepository();

    await atlascodeDrawer.openAtlascodeDrawer();
    await page.waitForTimeout(250);

    await atlascodeDrawer.pullRequests.waitForNavigationLoad();

    if (isRepoAddFailed) {
        await page.waitForTimeout(500);

        await addRepo(page, type);

        await atlascodeDrawer.pullRequests.waitForNavigationLoad();

        if (type === BitbucketTypes.DC) {
            await atlascodeDrawer.pullRequests.waitForConnectedState();
        }
    }

    await atlascodeDrawer.pullRequests.expectRepoConnected();

    await cleanupSetupPullrequests();
}
