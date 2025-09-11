import { expect, Page } from '@playwright/test';
import { authenticateWithJiraCloud, authenticateWithJiraDC, getIssueFrame } from 'e2e/helpers';
import { JiraTypes as BitbucketTypes } from 'e2e/helpers/types';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage, StartWorkPage } from 'e2e/page-objects';

const ISSUE_NAME = 'BTS-1 - User Interface Bugs';

export async function startWorkFlow(page: Page, type: BitbucketTypes) {
    if (type === BitbucketTypes.Cloud) {
        await authenticateWithJiraCloud(page);
    } else if (type === BitbucketTypes.DC) {
        await authenticateWithJiraDC(page);
    }
    await new AtlassianSettings(page).closeSettingsPage();

    const atlascodeDrawer = new AtlascodeDrawer(page);
    await atlascodeDrawer.jira.openIssue(ISSUE_NAME);

    const issueFrame = await getIssueFrame(page);
    const jiraIssuePage = new JiraIssuePage(issueFrame);

    await jiraIssuePage.startWork();

    await page.getByRole('tab', { name: 'BTS-1', exact: true }).getByLabel(/close/i).click();
    await page.waitForTimeout(2_000);

    const startWorkFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title*="Start work on"]');

    const startWorkPage = new StartWorkPage(startWorkFrame);

    await startWorkPage.setupCheckbox(startWorkPage.transitionIssueCheckbox, false);
    await startWorkPage.setupCheckbox(startWorkPage.pushBranchCheckbox, false);

    await startWorkPage.expectGitBranchSetup();

    await startWorkPage.startWork();
    await page.waitForTimeout(250);

    await startWorkPage.waitForSuccessToast();

    // check new branch was created
    // it can be mock-repository... for Cloud or dc-repository... for DC
    await expect(
        page.getByRole('button', { name: '-repository (Git) - bugfix/BTS-1-sample-user-interface-bugs' }),
    ).toBeVisible();
}
