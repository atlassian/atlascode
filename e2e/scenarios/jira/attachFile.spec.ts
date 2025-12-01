import { APIRequestContext, Page } from '@playwright/test';
import { getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { attachment } from 'e2e/mock-data/attachment';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const FILE_NAME = 'test.jpg';
const FILE_PATH = `e2e/wiremock-mappings/mockedteams/test-files/${FILE_NAME}`;

export async function attachFile(page: Page, request: APIRequestContext, type: JiraTypes) {
    await new AtlassianSettings(page).closeSettingsPage();
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);

    const cleanupIssueMock = await setupIssueMock(request, { attachment }, 'GET', type);

    await issuePage.content.addAttachment(FILE_PATH);
    await page.waitForTimeout(1_000);

    await issuePage.content.hasAttachment(FILE_NAME);

    await cleanupIssueMock();
}
