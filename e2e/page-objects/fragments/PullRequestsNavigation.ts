import { expect, Locator, Page } from '@playwright/test';

const EXPECTED_TREE_ITEMS = [
    'No Bitbucket repositories found in this workspace',
    'Add a repository to this workspace',
    'Clone a repository from Bitbucket',
    'Switch workspace',
];

export class PullRequestsNavigation {
    readonly page: Page;

    readonly bbPrTree: Locator;
    readonly addRepoButton: Locator;
    readonly createPRButton: Locator;
    readonly mockRepo: Locator;
    readonly prTreeitem: Locator;
    readonly prDetails: Locator;

    constructor(page: Page) {
        this.page = page;

        this.bbPrTree = page.getByRole('tree', { name: 'Bitbucket pull requests' });
        this.addRepoButton = this.bbPrTree.getByRole('treeitem', { name: 'Add a repository to this workspace' });
        this.createPRButton = this.bbPrTree.getByRole('treeitem', { name: 'Create pull request' });
        this.mockRepo = this.bbPrTree.getByRole('treeitem', { name: 'mock-repository' }).first();
        this.prTreeitem = this.bbPrTree.getByRole('treeitem', { name: '#123 New Feature Implementation' });
        this.prDetails = this.bbPrTree.getByRole('treeitem', { name: 'Open pull request details' });
    }

    async addRepository() {
        await this.addRepoButton.click();
    }

    async startPullRequestCreation() {
        await this.createPRButton.click();
    }

    async waitForNavigationLoad() {
        await this.addRepoButton.or(this.createPRButton).waitFor({ state: 'visible' });
    }

    async expectMenuItems(items = EXPECTED_TREE_ITEMS) {
        for (const item of items) {
            await expect(this.bbPrTree.getByRole('treeitem', { name: item })).toBeVisible();
        }
    }

    async expectPRTreeitem() {
        await expect(this.prTreeitem).toBeVisible();
    }
}
