import { test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { attachment } from 'e2e/mock-data/attachment';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const FILE_NAME = 'test.jpg';
const FILE_PATH = `e2e/wiremock-mappings/mockedteams/test-files/${FILE_NAME}`;

test('Test upload image to attachments', async ({ page, request }) => {
    await authenticateWithJira(page);

    await new AtlassianSettings(page).closeSettingsPage();
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);

    const cleanupIssueMock = await setupIssueMock(request, { attachment });

    await issuePage.content.addAttachment(FILE_PATH);
    await page.waitForTimeout(1_000);

    await issuePage.content.hasAttachment(FILE_NAME);

    await cleanupIssueMock();
});
