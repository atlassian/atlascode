import { expect, Frame, Locator } from 'playwright/test';

export class JiraIssuePage {
    readonly frame: Frame;
    readonly statusMenu: Locator;
    readonly statusOptions: Locator;

    readonly description: Locator;

    readonly commentContainer: Locator;

    constructor(frame: Frame) {
        this.frame = frame;
        this.statusMenu = this.frame.getByTestId('issue.status-transition-menu');
        this.statusOptions = this.frame.getByTestId('issue.status-transition-menu-dropdown');
        this.description = this.frame.getByTestId('issue.description');
        this.commentContainer = this.frame.getByTestId('issue.comment-container');
    }

    async getStatus() {
        return await this.statusMenu.textContent();
    }

    async updateStatus(nextStatus: string) {
        await this.statusMenu.click();
        const nextOption = this.statusOptions.getByText(new RegExp(nextStatus, 'i'));
        await expect(nextOption).toBeVisible();
        await nextOption.click();
    }

    async expectStatus(expectedStatus: string) {
        const currentStatus = await this.statusMenu.textContent();
        expect(currentStatus).toMatch(new RegExp(expectedStatus, 'i'));
    }

    async getDescription() {
        return await this.description.textContent();
    }

    async updateDescription(newDescription: string) {
        await this.description.click();
        const textarea = this.frame.locator('textarea');
        await expect(textarea).toBeVisible();
        await textarea.clear();
        await textarea.fill(newDescription);
    }

    async expectDescription(description: string) {
        const currentDescription = await this.getDescription();
        expect(currentDescription).toEqual(description);
    }

    async addComment(commentText: string) {
        const input = this.commentContainer.getByPlaceholder('Add a comment...');
        await input.click();

        const textarea = this.commentContainer.locator('textarea').first();
        await expect(textarea).toBeVisible();
        await textarea.fill(commentText);

        const saveButton = this.commentContainer.getByRole('button', { name: 'Save' });
        await expect(saveButton).toBeVisible();
        await saveButton.click();
    }

    async saveChanges() {
        await this.frame.getByRole('button', { name: 'Save' }).click();
    }
}
