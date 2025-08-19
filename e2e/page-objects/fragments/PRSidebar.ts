import { expect, FrameLocator, Locator } from '@playwright/test';

const SIDEBAR_TEST_ID = 'pullrequest.sidebar';

export class PRSidebar {
    readonly frame: FrameLocator;

    readonly sidebar: Locator;
    readonly author: Locator;
    readonly reviewersSectionButton: Locator;
    readonly addReviewerInput: Locator;
    readonly createdDate: Locator;
    readonly updatedDate: Locator;
    readonly tasksSectionButton: Locator;
    readonly createTaskInput: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.sidebar = this.frame.getByTestId(SIDEBAR_TEST_ID);
        this.author = this.sidebar.locator('.MuiGrid-item', { hasText: 'Author' });
        this.reviewersSectionButton = this.sidebar.getByRole('button', { name: 'Reviewers' });
        this.addReviewerInput = this.sidebar.getByPlaceholder('Add reviewer');
        this.createdDate = this.sidebar.locator('div:has(strong:text("Created")):has(p[aria-label*="2025-07-03"])');
        this.updatedDate = this.sidebar.locator('div:has(strong:text("Updated")):has(p[aria-label*="2025-07-03"])');
        this.tasksSectionButton = this.sidebar.getByRole('button', { name: 'Tasks' });
        this.createTaskInput = this.sidebar.locator('div[data-placeholder="Create task"]');
    }

    async expectSidebarSectionLoaded() {
        await expect(this.sidebar).toBeVisible();
        await expect(this.author).toBeVisible();

        await expect(this.reviewersSectionButton).toBeVisible();
        await expect(this.addReviewerInput).toBeVisible();

        await expect(this.createdDate).toBeVisible();
        await expect(this.updatedDate).toBeVisible();

        await expect(this.tasksSectionButton).toBeVisible();
        await expect(this.createTaskInput).toBeVisible();
    }
}
