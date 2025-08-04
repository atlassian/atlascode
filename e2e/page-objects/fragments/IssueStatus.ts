import { expect, Frame, Locator } from 'playwright/test';

const STATUS_MENU_TEST_ID = 'issue.status-transition-menu';
const STATUS_OPTIONS_TEST_ID = 'issue.status-transition-menu-dropdown';

export class IssueStatus {
    readonly frame: Frame;

    readonly statusMenu: Locator;
    readonly statusOptions: Locator;

    constructor(frame: Frame) {
        this.frame = frame;

        this.statusMenu = this.frame.getByTestId(STATUS_MENU_TEST_ID);
        this.statusOptions = this.frame.getByTestId(STATUS_OPTIONS_TEST_ID);
    }

    getStatus() {
        return this.statusMenu.textContent();
    }

    async changeTo(nextStatus: string) {
        await this.statusMenu.click();
        const nextOption = this.statusOptions.getByText(new RegExp(nextStatus, 'i'));
        await expect(nextOption).toBeVisible();
        return nextOption.click();
    }

    async expectEqual(expectedStatus: string) {
        const currentStatus = await this.statusMenu.textContent();
        expect(currentStatus).toMatch(new RegExp(expectedStatus, 'i'));
    }
}
