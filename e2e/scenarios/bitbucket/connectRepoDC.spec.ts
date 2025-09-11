import { APIRequestContext, Page } from '@playwright/test';
import { setupPullrequests } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings, ExplorerDrawer } from 'e2e/page-objects';

const addRepo = async (page: Page) => {
    await new AtlascodeDrawer(page).pullRequests.addRepository();
    await page.waitForTimeout(250);

    const pathInput = page.getByRole('textbox', { name: 'Type to narrow down results. - Add Folder to Workspace' });
    await pathInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(250);

    await pathInput.fill('/dc-repository/');
    await page.waitForTimeout(250);

    await page.getByRole('option', { name: '.git' }).waitFor({ state: 'visible' });

    await page.keyboard.press('Enter');
};

export async function connectRepositoryDC(page: Page, request: APIRequestContext) {
    const atlascodeDrawer = new AtlascodeDrawer(page);

    const cleanupSetupPullrequests = await setupPullrequests(request, []);

    await new AtlassianSettings(page).closeSettingsPage();

    await addRepo(page);

    const explorerDrawer = new ExplorerDrawer(page);
    await explorerDrawer.openExplorerDrawer();
    await explorerDrawer.waitForExplorerLoad();
    await page.waitForTimeout(500);
    const isRepoAddFailed = await explorerDrawer.isNoRepository();

    await atlascodeDrawer.openAtlascodeDrawer();
    await page.waitForTimeout(250);

    await atlascodeDrawer.pullRequests.waitForNavigationLoad();

    if (isRepoAddFailed) {
        await page.waitForTimeout(500);

        await addRepo(page);

        await atlascodeDrawer.pullRequests.waitForNavigationLoad();
    }

    await atlascodeDrawer.pullRequests.expectRepoConnected();

    await cleanupSetupPullrequests();
}
