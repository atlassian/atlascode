import { APIRequestContext, Page } from '@playwright/test';
import { getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const OLD_TITLE = '(Sample) User Interface Bugs';
const NEW_TITLE = 'Check if renaming works';

export async function renameIssue(page: Page, request: APIRequestContext) {
    await new AtlassianSettings(page).closeSettingsPage();
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);

    await issuePage.title.expectEqual(OLD_TITLE);

    // Add the updated mock
    const cleanupIssueMock = await setupIssueMock(request, { summary: NEW_TITLE });

    await issuePage.title.changeTo(NEW_TITLE);
    await page.waitForTimeout(2_000);
    await issuePage.title.expectEqual(NEW_TITLE);

    await cleanupIssueMock();
}
