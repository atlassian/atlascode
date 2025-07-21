import { expect, Frame, Locator } from 'playwright/test';

export class JiraIssuePage {
    readonly issueFrame: Frame;
    readonly statusTransitionMenu: Locator;
    readonly statusMenuDropdown: Locator;
    readonly startWorkButton: Locator;

    constructor(frame: Frame) {
        this.issueFrame = frame;
        this.statusTransitionMenu = this.issueFrame.getByTestId('issue.status-transition-menu');
        this.statusMenuDropdown = this.issueFrame.getByTestId('issue.status-transition-menu-dropdown');
        this.startWorkButton = this.issueFrame.getByTestId('issue.start-work-button');
    }

    async expectStatus(expectedStatus: string) {
        const currentStatus = await this.statusTransitionMenu.textContent();
        expect(currentStatus).toMatch(new RegExp(expectedStatus, 'i'));
    }

    async updateStatus(nextStatus: string) {
        await this.statusTransitionMenu.click();
        const nextOption = this.statusMenuDropdown.getByText(new RegExp(nextStatus, 'i'));
        await expect(nextOption).toBeVisible();
        await nextOption.click();
    }

    async startWork() {
        await this.startWorkButton.click();
    }
}
