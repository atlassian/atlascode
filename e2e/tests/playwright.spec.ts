import { expect, test } from '@playwright/test';
import { updateIssueField } from 'e2e/helpers/updateIssueFields';
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

    // I can view all issues assigned to me
    await expect(page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-3 - Improve Dropdown Menu Responsiveness' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-4 - Resolve API Timeout Issues' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-5 - Fix Database Connection Errors' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-6 - Fix Button Alignment Issue' })).toBeVisible();

    //await expect(page).toHaveScreenshot();
});

test('Update description flow', async ({ page, request }) => {
    const oldDescription = 'Track and resolve bugs related to the user interface.';
    const newDescription = 'Add e2e test for this functionality';

    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();

    await page.getByRole('tab', { name: 'Getting Started' }).getByLabel(/close/i).click();

    await page.getByRole('treeitem', { name: 'Please login to Jira' }).click();

    await page.getByRole('tab', { name: 'Atlassian Settings' }).click();

    const settingsFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');

    settingsFrame.getByRole('button', { name: 'Login to Jira' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).fill('https://mockedteams.atlassian.net');
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).fill('mock@atlassian.code');
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password (API token)' }).fill('12345');
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(2000);

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(250);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const frameHandle = await page.frameLocator('iframe.webview').locator('iframe[title="Jira Issue"]').elementHandle();

    if (!frameHandle) {
        throw new Error('iframe element not found');
    }
    const issueFrame = await frameHandle.contentFrame();

    if (!issueFrame) {
        throw new Error('iframe element not found');
    }
    await issueFrame.waitForLoadState('domcontentloaded');

    await expect(issueFrame.locator('body')).toBeVisible({ timeout: 15000 });

    // Check the existing description
    await expect(issueFrame.getByText(oldDescription)).toBeVisible({ timeout: 50000 });

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
    const response = await request.post('http://wiremock-mockedteams:8080/__admin/mappings', {
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

    await issueFrame.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(2000);

    await expect(issueFrame.getByText(oldDescription)).not.toBeVisible();
    await expect(issueFrame.getByText(newDescription)).toBeVisible();
    await request.delete(`http://wiremock-mockedteams:8080/__admin/mappings/${id}`);
});

test('Add comment flow', async ({ page }) => {
    const commentText = 'This is a test comment added via e2e test';

    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();

    await page.getByRole('tab', { name: 'Getting Started' }).getByLabel(/close/i).click();

    await page.getByRole('treeitem', { name: 'Please login to Jira' }).click();

    await page.getByRole('tab', { name: 'Atlassian Settings' }).click();

    const settingsFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');

    settingsFrame.getByRole('button', { name: 'Login to Jira' }).click();

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).fill('https://mockedteams.atlassian.net');

    await settingsFrame.getByRole('textbox', { name: 'Username' }).fill('mock@atlassian.code');

    await settingsFrame.getByRole('textbox', { name: 'Password (API token)' }).fill('12345');

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(3000);

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const issueFrame = page.frameLocator('iframe.webview.ready').frameLocator('iframe[title="Jira Issue"]');

    // Wait for the iframe to be ready and the comment textarea to be visible
    await expect(issueFrame.getByPlaceholder('Add a comment...')).toBeVisible({ timeout: 10000 });

    // Find and click the "Add comment" button
    const commentTextarea = issueFrame.getByPlaceholder('Add a comment...');
    await commentTextarea.click();

    const textarea = issueFrame.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill(commentText);
    await page.waitForTimeout(1000);

    // Set up WireMock API for comment creation
    const api = await request.newContext({
        baseURL: 'http://wiremock-mockedteams:8080',
        ignoreHTTPSErrors: true,
    });

    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));
    const updatedIssue = updateIssueField(issueJSON, {
        comment: commentText,
    });

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

    const addCommentButton = issueFrame.getByRole('button', { name: 'Save' });
    await expect(addCommentButton).toBeVisible();
    await addCommentButton.click();

    await page.waitForTimeout(3000);

    await expect(issueFrame.getByText(commentText)).toBeVisible();

    await expect(issueFrame.locator('.jira-comment-author')).toBeVisible();

    await api.delete(`/__admin/mappings/${id}`);
});
