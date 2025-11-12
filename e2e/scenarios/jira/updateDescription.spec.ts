import { APIRequestContext, Page } from '@playwright/test';
import { getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { updatedDescription } from 'e2e/mock-data/description';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const OLD_DESCRIPTION = 'Track and resolve bugs related to the user interface.';
const NEW_DESCRIPTION = 'Add e2e test for this functionality';

export async function updateDescription(page: Page, request: APIRequestContext, type: JiraTypes) {
    await new AtlassianSettings(page).closeSettingsPage();
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const frame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(frame);

    await issuePage.description.expectEqual(OLD_DESCRIPTION);
    await issuePage.description.changeTo(NEW_DESCRIPTION);
    await page.waitForTimeout(500);

    const cleanupIssueMock = await setupIssueMock(
        request,
        { description: updatedDescription(NEW_DESCRIPTION) },
        'GET',
        type,
    );

    await issuePage.saveChanges();
    await page.waitForTimeout(1_000);

    await issuePage.description.expectEqual(NEW_DESCRIPTION);

    await cleanupIssueMock();
}
