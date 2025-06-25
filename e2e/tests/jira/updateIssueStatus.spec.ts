import { expect, request, test } from '@playwright/test';
import { updateIssueField } from 'e2e/helpers/updateIssueStatus';
import fs from 'fs';

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
    const updatedIssue = updateIssueField(issueJSON, newStatus);

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
