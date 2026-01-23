import { APIRequestContext, expect, Page, test } from '@playwright/test';
import {
    authenticateWithJiraCloud,
    authenticateWithJiraDC,
    getIssueFrame,
    resetWireMockMappings,
    setupIssueMock,
    setupSearchMock,
} from 'e2e/helpers';
import { JiraTypes as BitbucketTypes } from 'e2e/helpers/types';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage, StartWorkPage } from 'e2e/page-objects';

const ISSUE_NAME = 'BTS-1 - User Interface Bugs';
const CURRENT_STATUS = 'To Do';
const NEXT_STATUS = 'In Progress';

export async function startWorkFlow(page: Page, type: BitbucketTypes, request: APIRequestContext) {
    // This test is large and may run longer on slower machines
    test.setTimeout(60_000);
    await resetWireMockMappings({ request });

    // Login to Jira
    if (type === BitbucketTypes.Cloud) {
        await authenticateWithJiraCloud(page);
    } else if (type === BitbucketTypes.DC) {
        await authenticateWithJiraDC(page);
    }
    // Close Atlassian Settings page
    await new AtlassianSettings(page).closeSettingsPage();

    // Open Jira issue
    const atlascodeDrawer = new AtlascodeDrawer(page);
    await atlascodeDrawer.jira.openIssue(ISSUE_NAME);

    const issueFrame = await getIssueFrame(page);
    const jiraIssuePage = new JiraIssuePage(issueFrame);
    await jiraIssuePage.status.expectEqual(CURRENT_STATUS);

    // Open Start work page
    await jiraIssuePage.startWork();

    await page.getByRole('tab', { name: 'BTS-1', exact: true }).getByLabel(/close/i).click();
    await page.waitForTimeout(2_000);

    const startWorkFrame = await getIssueFrame(page);
    const startWorkPage = new StartWorkPage(startWorkFrame);
    await startWorkPage.setupCheckbox(startWorkPage.pushBranchCheckbox, false);

    await startWorkPage.expectGitBranchSetup();

    await startWorkPage.startWork();
    await page.waitForTimeout(2_000);

    await expect(startWorkFrame.getByText(new RegExp('Assigned the issue to you', 'i'))).toBeVisible();
    const transitionMessage = startWorkFrame.getByText(new RegExp(`Transitioned status to ${NEXT_STATUS}`, 'i'));
    const transitionCount = await transitionMessage.count();
    if (transitionCount > 0) {
        await expect(transitionMessage).toBeVisible();
    }

    await startWorkPage.waitForSuccessToast();

    // check new branch was created
    // it can be mock-repository... for Cloud or dc-repository... for DC
    await expect(
        page.getByRole('button', { name: '-repository (Git) - bugfix/BTS-1-user-interface-bugs' }),
    ).toBeVisible();

    // setup mocks for next status
    const cleanupIssueMock = await setupIssueMock(request, { status: NEXT_STATUS }, 'GET', type);
    const cleanupSearchMock = await setupSearchMock(request, NEXT_STATUS, type);

    await page.getByRole('tab', { name: 'Start work on BTS-1', exact: true }).getByLabel(/close/i).click();

    await atlascodeDrawer.jira.openIssue(ISSUE_NAME);
    const updatedIssueFrame = await getIssueFrame(page);
    const updatedIssuePage = new JiraIssuePage(updatedIssueFrame);

    await updatedIssuePage.status.expectEqual(NEXT_STATUS);
    await atlascodeDrawer.jira.openIssue(ISSUE_NAME);

    await cleanupIssueMock();
    await cleanupSearchMock();
}
