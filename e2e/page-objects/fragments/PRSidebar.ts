import { expect, FrameLocator, Locator } from '@playwright/test';

const SIDEBAR_TEST_ID = 'pullrequest.sidebar';

export class PRSidebar {
    readonly frame: FrameLocator;

    readonly sidebar: Locator;
    readonly sidebarAuthor: Locator;
    readonly sidebarReviewersButton: Locator;
    readonly sidebarApprovedIcon: Locator;
    readonly sidebarAddReviewerInput: Locator;
    readonly sidebarCreatedDate: Locator;
    readonly sidebarUpdatedDate: Locator;
    readonly sidebarTaskButton: Locator;
    readonly sidebarCreateTaskInput: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.sidebar = this.frame.getByTestId(SIDEBAR_TEST_ID);
        this.sidebarAuthor = this.sidebar.locator('.MuiGrid-item', { hasText: 'Author' });
        this.sidebarReviewersButton = this.sidebar.getByRole('button', { name: 'Reviewers' });
        this.sidebarApprovedIcon = this.sidebar.getByLabel('Approved');
        this.sidebarAddReviewerInput = this.sidebar.getByPlaceholder('Add reviewer');
        this.sidebarCreatedDate = this.sidebar.locator(
            'div:has(strong:text("Created")):has(p[aria-label*="2025-07-03"])',
        );
        this.sidebarUpdatedDate = this.sidebar.locator(
            'div:has(strong:text("Updated")):has(p[aria-label*="2025-07-03"])',
        );
        this.sidebarTaskButton = this.sidebar.getByRole('button', { name: 'Tasks' });
        this.sidebarCreateTaskInput = this.sidebar.locator('div[data-placeholder="Create task"]');
    }

    async expectSidebarSectionLoaded() {
        await expect(this.sidebar).toBeVisible();
        await expect(this.sidebarAuthor).toBeVisible();

        await expect(this.sidebarReviewersButton).toBeVisible();
        await expect(this.sidebarAddReviewerInput).toBeVisible();

        await expect(this.sidebarCreatedDate).toBeVisible();
        await expect(this.sidebarUpdatedDate).toBeVisible();

        await expect(this.sidebarTaskButton).toBeVisible();
        await expect(this.sidebarCreateTaskInput).toBeVisible();
    }
}
