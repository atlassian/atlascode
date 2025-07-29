import { expect, Page } from 'playwright/test';

export class AppNotifications {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    expectNotification(text: string | RegExp) {
        return expect(this.page.getByRole('dialog', { name: text })).toBeVisible();
    }
}
