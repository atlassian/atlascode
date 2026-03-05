import { APIRequestContext, Page } from '@playwright/test';
import { getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const OLD_TITLE = 'User Interface Bugs';
const NEW_TITLE = 'Check if renaming works';

export async function renameIssue(page: Page, request: APIRequestContext, type: JiraTypes) {
    await new AtlassianSettings(page).closeSettingsPage();
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);
    await page.waitForTimeout(1_000);
    await issuePage.title.expectEqual(OLD_TITLE);

    // Add the updated mock
    const cleanupIssueMock = await setupIssueMock(request, { summary: NEW_TITLE }, 'GET', type);

    await issuePage.title.changeTo(NEW_TITLE);
    await page.waitForTimeout(2_000);
    await issuePage.title.expectEqual(NEW_TITLE);

    await cleanupIssueMock();
}
