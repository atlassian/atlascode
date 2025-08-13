import { Page } from '@playwright/test';
import { AtlascodeDrawer } from 'e2e/page-objects';

export async function authFlow(page: Page) {
    await new AtlascodeDrawer(page).pullRequests.expectMenuItems();
}
