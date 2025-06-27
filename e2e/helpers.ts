import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Helper function to update a Jira issue JSON with new field values
 */
export function updateIssueField(issueJson: any, updates: Record<string, any>) {
    const parsedBody = JSON.parse(issueJson.response.body);

    const updated = structuredClone(parsedBody);

    for (const [key, value] of Object.entries(updates)) {
        if (key === 'description') {
            updated.renderedFields.description = `<p>${value}</p>`;
            updated.fields.description = value;
        } else if (key === 'comment') {
            const comment = {
                id: '10001',
                self: 'https://mockedteams.atlassian.net/rest/api/2/issue/10001/comment/10001',
                author: {
                    self: 'https://mockedteams.atlassian.net/rest/api/2/user?accountId=712020%3A13354d79-beaa-49d6-a55f-b9510892e3f4',
                    accountId: '712020:13354d79-beaa-49d6-a55f-b9510892e3f4',
                    emailAddress: 'mock@atlassian.code',
                    avatarUrls: {
                        '48x48':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '24x24':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '16x16':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '32x32':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                    },
                    displayName: 'Mocked McMock',
                    active: true,
                    timeZone: 'America/Los_Angeles',
                    accountType: 'atlassian',
                },
                body: value,
                updateAuthor: {
                    self: 'https://mockedteams.atlassian.net/rest/api/2/user?accountId=712020%3A13354d79-beaa-49d6-a55f-b9510892e3f4',
                    accountId: '712020:13354d79-beaa-49d6-a55f-b9510892e3f4',
                    emailAddress: 'mock@atlassian.code',
                    avatarUrls: {
                        '48x48':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '24x24':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '16x16':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '32x32':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                    },
                    displayName: 'Mocked McMock',
                    active: true,
                    timeZone: 'America/Los_Angeles',
                    accountType: 'atlassian',
                },
                created: '2025-01-10T12:00:00.000-0800',
                updated: '2025-01-10T12:00:00.000-0800',
                visibility: {
                    type: 'role',
                    value: 'Administrators',
                },
            };

            updated.renderedFields.comment.comments.push(comment);
            updated.renderedFields.comment.total = 1;
            updated.renderedFields.comment.maxResults = 1;
            updated.renderedFields.comment.startAt = 0;
        }
    }

    return updated;
}

/**
 * Helper function to authenticate with Jira using the provided credentials
 */
export const authenticateWithJira = async (
    page: Page,
    baseUrl: string = 'https://mockedteams.atlassian.net',
    username: string = 'mock@atlassian.code',
    password: string = '12345',
) => {
    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.waitForTimeout(250);

    // Close the onboarding view
    await page.getByRole('tab', { name: 'Getting Started' }).getByLabel(/close/i).click();

    await page.getByRole('treeitem', { name: 'Please login to Jira' }).click();
    await page.waitForTimeout(250);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).click();
    await page.waitForTimeout(250);

    const settingsFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');

    await expect(settingsFrame.getByRole('button', { name: 'Authentication authenticate' })).toBeVisible();
    await expect(settingsFrame.getByRole('button', { name: 'Login to Jira' })).toBeVisible();

    settingsFrame.getByRole('button', { name: 'Login to Jira' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).fill(baseUrl);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password (API token)' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password (API token)' }).fill(password);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(3000);

    // Wait for authentication to complete and tree items to be visible
    await expect(page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' })).toBeVisible();
};

/**
 * Helper function to get the Jira issue iframe
 */
export const getIssueFrame = async (page: Page) => {
    const frameHandle = await page.frameLocator('iframe.webview').locator('iframe[title="Jira Issue"]').elementHandle();

    if (!frameHandle) {
        throw new Error('iframe element not found');
    }
    const issueFrame = await frameHandle.contentFrame();

    if (!issueFrame) {
        throw new Error('iframe element not found');
    }

    return issueFrame;
};

/**
 * Helper function to set up WireMock mapping
 */
export const setupWireMockMapping = async (request: APIRequestContext, method: string, body: any, urlPath: string) => {
    const response = await request.post('http://wiremock-mockedteams:8080/__admin/mappings', {
        data: {
            request: {
                method,
                urlPath,
            },
            response: {
                status: 200,
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        },
    });
    return await response.json();
};

/**
 * Helper function to clean up WireMock mapping
 */
export const cleanupWireMockMapping = async (request: APIRequestContext, mappingId: string) => {
    await request.delete(`http://wiremock-mockedteams:8080/__admin/mappings/${mappingId}`);
};
