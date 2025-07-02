import { expect, test } from '@playwright/test';
import {
    authenticateWithJira,
    cleanupWireMockMapping,
    getIssueFrame,
    setupWireMockMapping,
    updateIssueField,
} from 'e2e/helpers';
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
    await authenticateWithJira(page);

    // I can view all issues assigned to me
    await expect(page.getByRole('treeitem', { name: 'BTS-3 - Improve Dropdown Menu Responsiveness' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-4 - Resolve API Timeout Issues' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-5 - Fix Database Connection Errors' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-6 - Fix Button Alignment Issue' })).toBeVisible();

    //await expect(page).toHaveScreenshot();
});

test('When user is not authenticated in Jira, a badge notification prompts for login', async ({ page }) => {
    await page.goto('http://localhost:9988/');

    await page.waitForTimeout(2000);

    // Verify initial unauthenticated state: login prompt is visible in both sidebar and notifications
    await expect(page.getByRole('treeitem', { name: 'Please login to Jira' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: /Log in to Jira/ })).toBeVisible();
});

test('When user logs out, they see a badge notification about being logged out', async ({ page }) => {
    await authenticateWithJira(page);

    // Verify logout functionality: ensure notification dialog and sidebar login prompt appear after logout
    const settingsFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');
    await settingsFrame.getByRole('button', { name: 'delete' }).click();

    await page.waitForTimeout(2000);

    await expect(page.getByRole('treeitem', { name: 'Please login to Jira' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: /You have been logged out of Jira/ })).toBeVisible();
});

test('Update description flow', async ({ page, request }) => {
    const oldDescription = 'Track and resolve bugs related to the user interface.';
    const newDescription = 'Add e2e test for this functionality';

    await authenticateWithJira(page);

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(250);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();
    const issueFrame = await getIssueFrame(page);

    // Check the existing description
    await expect(issueFrame.getByText(oldDescription)).toBeVisible();

    // Click on the description element to enter edit mode
    await issueFrame.getByText(oldDescription).click();
    const textarea = issueFrame.locator('textarea');
    await expect(textarea).toBeVisible();

    // Clear the existing description and enter new one
    await textarea.clear();
    await textarea.fill(newDescription);
    await page.waitForTimeout(500);

    // Add the updated mock
    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));
    const updatedIssue = updateIssueField(issueJSON, {
        description: newDescription,
    });
    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, '/rest/api/2/issue/BTS-1');

    await issueFrame.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(2000);

    await expect(issueFrame.getByText(oldDescription)).not.toBeVisible();
    await expect(issueFrame.getByText(newDescription)).toBeVisible();
    await cleanupWireMockMapping(request, id);
});

test('Add comment flow', async ({ page, request }) => {
    const commentText = 'This is a test comment added via e2e test';

    await authenticateWithJira(page);

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const issueFrame = await getIssueFrame(page);

    await expect(issueFrame.getByPlaceholder('Add a comment...')).toBeVisible();

    const commentTextarea = issueFrame.getByPlaceholder('Add a comment...');
    await commentTextarea.click();

    const textarea = issueFrame.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill(commentText);
    await page.waitForTimeout(1000);

    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));
    const updatedIssue = updateIssueField(issueJSON, {
        comment: commentText,
    });

    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, '/rest/api/2/issue/BTS-1');

    const addCommentButton = issueFrame.getByRole('button', { name: 'Save' });
    await expect(addCommentButton).toBeVisible();
    await addCommentButton.click();

    await page.waitForTimeout(2000);

    await expect(issueFrame.getByText(commentText)).toBeVisible();
    await expect(issueFrame.locator('.jira-comment-author')).toBeVisible();

    await cleanupWireMockMapping(request, id);
});
