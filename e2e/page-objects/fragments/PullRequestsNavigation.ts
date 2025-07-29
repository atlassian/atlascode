import { expect, Locator, Page } from 'playwright/test';

const EXPECTED_TREE_ITEMS = [
    'Add a repository to this workspace',
    'Clone a repository from Bitbucket',
    'No Bitbucket repositories found in this workspace',
    'Switch workspace',
];

export class PullRequestsNavigation {
    readonly page: Page;

    readonly bbPrTree: Locator;

    constructor(page: Page) {
        this.page = page;

        this.bbPrTree = page.getByRole('tree', { name: 'Bitbucket pull requests' });
    }

    async expectMenuItems(items = EXPECTED_TREE_ITEMS) {
        for (const item of items) {
            await expect(this.bbPrTree.getByRole('treeitem', { name: item })).toBeVisible();
        }
    }
}
