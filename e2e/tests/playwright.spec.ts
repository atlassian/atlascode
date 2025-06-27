import { expect, request, test } from '@playwright/test';
import { updateIssueStatus } from 'e2e/helpers/updateIssueStatus';
import fs from 'fs';

test("Onboarding flow's navigation among pages works", async ({ page }) => {
    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.waitForTimeout(250);

    await expect(page.getByRole('tab', { name: 'Getting Started' })).toBeVisible();

    await page.getByRole('tab', { name: 'Getting Started' }).click();
    await page.waitForTimeout(250);

    const getStartedFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Getting Started"]');

    // Jira page

    await expect(getStartedFrame.getByRole('heading', { name: 'Sign in to Jira' })).toBeVisible();
    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Jira Cloud' })).toBeEnabled();
    await expect(getStartedFrame.getByRole('button', { name: 'Back' })).toBeDisabled();

    await getStartedFrame.getByRole('button', { name: /radio server/i }).click();
    await page.waitForTimeout(250);

    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Jira Server' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio i don\'t/i }).click();
    await page.waitForTimeout(250);

    await expect(getStartedFrame.getByRole('button', { name: 'Next' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(250);

    // Bitbucket page

    await expect(getStartedFrame.getByRole('heading', { name: 'Sign in to Bitbucket' })).toBeVisible();
    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Bitbucket Cloud' })).toBeEnabled();
    await expect(getStartedFrame.getByRole('button', { name: 'Back' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio server/i }).click();
    await page.waitForTimeout(250);

    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Bitbucket Server' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio i don\'t/i }).click();
    await page.waitForTimeout(250);

    await expect(getStartedFrame.getByRole('button', { name: 'Next' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(250);

    // Landing page

    await expect(getStartedFrame.getByRole('heading', { name: "You're ready to get started!" })).toBeVisible();
});

test('Authenticating with Jira works, and assigned items are displayed', async ({ page }) => {
    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.waitForTimeout(250);

    // Close the onboarding view
    await page.getByRole('tab', { name: 'Getting Started' }).getByLabel(/close/i).click();

    await page.getByRole('treeitem', { name: 'Please login to Jira' }).click();
    await page.waitForTimeout(250);

    await expect(page.getByRole('tab', { name: 'Atlassian Settings' })).toBeVisible();

    await page.getByRole('tab', { name: 'Atlassian Settings' }).click();
    await page.waitForTimeout(250);

    const settingsFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');

    await expect(settingsFrame.getByRole('button', { name: 'Authentication authenticate' })).toBeVisible();
    await expect(settingsFrame.getByRole('button', { name: 'Login to Jira' })).toBeVisible();

    settingsFrame.getByRole('button', { name: 'Login to Jira' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).fill('https://mockedteams.atlassian.net');
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).fill('mock@atlassian.code');
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password (API token)' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password (API token)' }).fill('12345');
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(250);

    // wait a longer amount of time for site and treeview to initialize and render
    await page.waitForTimeout(2000);
    await expect(
        settingsFrame
            .getByRole('region', { name: 'Authentication authenticate' })
            .getByText('mockedteams.atlassian.net'),
    ).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' })).toBeVisible();

    //await expect(page).toHaveScreenshot();
});

test('I can transition a Jira', async ({ page }) => {
    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();

    // Close the onboarding view
    await page.getByRole('tab', { name: 'Getting Started' }).getByLabel(/close/i).click();

    await page.getByRole('treeitem', { name: 'Please login to Jira' }).click();
    await page.getByRole('tab', { name: 'Atlassian Settings' }).click();

    await page.getByRole('tab', { name: 'Atlassian Settings' }).click();

    const settingsFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');

    // Login to Atlassian
    await expect(settingsFrame.getByRole('button', { name: 'Login to Jira' })).toBeVisible();
    await settingsFrame.getByRole('button', { name: 'Login to Jira' }).click();
    await settingsFrame.getByLabel('Base URL').fill('https://mockedteams.atlassian.net');
    await settingsFrame.getByLabel('Username').fill('mock@atlassian.code');
    await settingsFrame.getByLabel('Password (API token)').fill('12345');
    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(2000);

    const issueInTree = page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' });
    await expect(issueInTree).toBeVisible();

    await issueInTree.click();
    await page.waitForTimeout(2000);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const issueFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Jira Issue"]');
    const button = issueFrame.getByRole('button', { name: 'In Progress' });
    await expect(button).toBeVisible();
    await button.click();
    await page.waitForTimeout(2000);
    const inreview = issueFrame.getByText('In Review');

    await expect(inreview).toBeVisible();
    await page.waitForTimeout(1000);
    await inreview.click();

    // Update the mock
    const api = await request.newContext({
        baseURL: 'http://wiremock-mockedteams:8080',
        ignoreHTTPSErrors: true,
    });
    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));

    const newStatus = 'In Review';
    const updatedIssue = updateIssueStatus(issueJSON, newStatus);

    console.log('Updating WireMock with new status:', newStatus);
    const response = await api.post('/__admin/mappings', {
        data: {
            request: {
                method: 'GET',
                urlPath: '/rest/api/2/issue/BTS-1',
            },
            response: {
                status: 200,
                body: JSON.stringify(updatedIssue),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        },
    });
    const { id } = await response.json();
    console.log('WireMock mapping created with ID:', id);

    await page.getByRole('tab', { name: 'BTS-1' }).getByLabel(/close/i).click();
    await page.waitForTimeout(2000);
    await issueInTree.click();
    const frameHandle = await page.frameLocator('iframe.webview').locator('iframe[title="Jira Issue"]').elementHandle();

    if (!frameHandle) {
        throw new Error('iframe element not found');
    }
    const issueFramePost = await frameHandle.contentFrame();

    if (!issueFramePost) {
        throw new Error('iframe element not found');
    }
    await issueFramePost.waitForLoadState('domcontentloaded');
    await expect(issueFramePost.locator('body')).toBeVisible({ timeout: 1500 });
    const buttonInReview = issueFramePost.getByRole('button', { name: newStatus });
    await expect(buttonInReview).toBeVisible();

    await api.delete(`/__admin/mappings/${id}`);
});
