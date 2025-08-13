import type { APIRequestContext, Page } from '@playwright/test';
import { setupPullrequests } from 'e2e/helpers/setup-mock';

const goToExtensionTab = async (page: Page) => {
    // sometimes page is redirected to Explorer tab and this is workaround so we sure extension tab will be opened
    await page.getByRole('tab', { name: 'Explorer' }).click();
    await page.waitForTimeout(250);
    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.waitForTimeout(250);
};

const addRepo = async (page: Page) => {
    const addRepoButton = page.getByRole('treeitem', { name: 'Add a repository to this workspace' });
    await addRepoButton.click();
    await page.waitForTimeout(250);

    // sometimes vs code can go to Explorer tab if we click 'Add a repo...' for the second time, so we make sure to return to extension
    const noFolderButton = page.getByRole('button', { name: 'No Folder Opened Section' });
    if (await noFolderButton.isVisible()) {
        await goToExtensionTab(page);
        await addRepoButton.click();
        await page.waitForTimeout(250);
    }

    const pathInput = page.getByRole('textbox', { name: 'Type to narrow down results. - Add Folder to Workspace' });
    await pathInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(250);

    await pathInput.fill('/mock-repository/');
    await page.waitForTimeout(250);

    await page.getByRole('option', { name: '.git' }).waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'Add' }).click();
};

const waitForExplorerLoading = async (page: Page) => {
    await page
        .locator('.pane:has([aria-label="Bitbucket pull requests Section"])')
        .getByRole('progressbar')
        .waitFor({ state: 'hidden' });
};

/**
 * Helper function to connect Bitbucket repository
 */
export const connectRepository = async (page: Page, request: APIRequestContext) => {
    // waiting for loading
    await waitForExplorerLoading(page);

    // setting request for pullrequests which is used in Bitbucket explorer
    const id = await setupPullrequests(request, []);

    // trying to add mock-repository
    await addRepo(page);

    // after first adding repo vs code automatically opens Explorer tab
    const mockRepo = page.getByRole('treeitem', { name: 'mock-repository' });
    const noFolderButton = page.getByRole('button', { name: 'No Folder Opened Section' });
    await mockRepo.or(noFolderButton).waitFor({ state: 'visible' });

    // if first try was unsuccessfull we can see 'No folder opened' section name
    const isRepoAddFailed = await noFolderButton.isVisible();

    // return to extension
    await goToExtensionTab(page);

    const addRepoButton = page.getByRole('treeitem', { name: 'Add a repository to this workspace' });
    const createPRButton = page.getByRole('treeitem', { name: 'Create pull request' });

    // waiting for extension load
    await addRepoButton.or(createPRButton).waitFor({ state: 'visible' });

    // if repo wasn't added trying again
    if (isRepoAddFailed) {
        await page.waitForTimeout(500); // timeout to get bitbucket explorer time to refresh state
        await waitForExplorerLoading(page);

        await addRepo(page); // attempt #2

        // after attemp #2 vs code doesn't open Explorer tab, so we just wait for bitbucket explorer refresh
        await createPRButton.waitFor({ state: 'visible' });
    }

    return id;
};
