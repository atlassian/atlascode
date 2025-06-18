import { expect, test } from '@playwright/test';

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
    await page.waitForTimeout(250);

    const issueInTree = page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' });
    await expect(issueInTree).toBeVisible();

    await issueInTree.click();
    await page.waitForTimeout(2000);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const issueFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Jira Issue"]');
    const button = issueFrame.getByRole('button', { name: 'In Progress' });
    await expect(button).toBeVisible();
    await button.click();
    await page.waitForTimeout(250);
    const doneOption = issueFrame.getByText('Done');

    await expect(doneOption).toBeVisible();
    await doneOption.click();
});