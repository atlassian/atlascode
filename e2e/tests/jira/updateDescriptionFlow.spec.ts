import { test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

test('Update description flow', async ({ page, request }) => {
    const oldDescription = 'Track and resolve bugs related to the user interface.';
    const newDescription = 'Add e2e test for this functionality';

    await authenticateWithJira(page);
    await new AtlassianSettings(page).closeSettingsPage();

    await new AtlascodeDrawer(page).openJiraIssue('BTS-1 - User Interface Bugs');

    const frame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(frame);

    await issuePage.expectDescription(oldDescription);
    await issuePage.updateDescription(newDescription);
    await page.waitForTimeout(500);

    const cleanupIssueMock = await setupIssueMock(request, { description: newDescription });

    await issuePage.saveChanges();
    await page.waitForTimeout(1_000);

    await issuePage.expectDescription(newDescription);

    await cleanupIssueMock();
});
