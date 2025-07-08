import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';
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
        } else if (key === 'attachment') {
            // Add the new attachment to both fields.attachment and renderedFields.attachment arrays
            updated.fields.attachment.push(value);
            updated.renderedFields.attachment.push(value);
        } else if (key === 'summary') {
            updated.renderedFields.summary = value;
            updated.fields.summary = value;
        }
    }

    return updated;
}

/**
 * Helper function to open atlassian settings with provided credentials
 */
export const openAtlassianSettings = async (page: Page, itemName: string) => {
    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.waitForTimeout(250);

    await page.getByRole('tab', { name: 'Getting Started' }).getByLabel(/close/i).click();

    await page.getByRole('treeitem', { name: itemName }).click();
    await page.waitForTimeout(250);

    return page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');
};

/**
 * Helper function to authenticate with Jira using the provided credentials
 */
export const authenticateWithJira = async (
    page: Page,
    baseUrl: string = 'https://mockedteams.atlassian.net',
    username: string = 'mock@atlassian.code',
    password: string = '12345',
) => {
    const settingsFrame = await openAtlassianSettings(page, 'Please login to Jira');

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
 * Helper function to authenticate with Bitbucket DC using the provided credentials
 */
export const authenticateWithBitbucketDC = async (
    page: Page,
    baseUrl: string = 'https://bitbucket.mockeddomain.com',
    username: string = 'mockedUser',
    password: string = '12345',
) => {
    const settingsFrame = await openAtlassianSettings(page, 'Connect Bitbucket to view pull requests');

    await expect(settingsFrame.getByRole('button', { name: 'Authentication authenticate' })).toBeVisible();
    await expect(settingsFrame.getByRole('button', { name: 'Login to Bitbucket' })).toBeVisible();

    await settingsFrame.getByRole('button', { name: 'Login to Bitbucket' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).fill(baseUrl);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(1000);

    await expect(settingsFrame.getByText('bitbucket.mockeddomain.com')).toBeVisible();
    await expect(settingsFrame.getByText('No sites found')).not.toBeVisible();
};

/**
 * Helper function to authenticate with Bitbucket Cloud using OAuth
 */
export const authenticateWithBitbucketCloud = async (
    page: Page,
    context: BrowserContext,
    baseUrl: string = 'https://bitbucket.org',
) => {
    await context.route('https://bitbucket.org/site/oauth2/authorize*', async (route) => {
        const reqUrl = new URL(route.request().url());
        const state = reqUrl.searchParams.get('state');
        const callbackUrl = `http://localhost:31415/bbcloud?code=mocked-code&state=${state}`;

        await context.request.get(callbackUrl);

        route.abort();
    });

    const settingsFrame = await openAtlassianSettings(page, 'Connect Bitbucket to view pull requests');

    await expect(settingsFrame.getByRole('button', { name: 'Authentication authenticate' })).toBeVisible();
    await expect(settingsFrame.getByRole('button', { name: 'Login to Bitbucket' })).toBeVisible();

    await settingsFrame.getByRole('button', { name: 'Login to Bitbucket' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).fill(baseUrl);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(250);

    const externalPrompt = page
        .getByRole('dialog')
        .filter({ hasText: 'Do you want code-server to open the external website' });

    if (await externalPrompt.isVisible()) {
        await externalPrompt.getByRole('button', { name: 'Open' }).click();
        await page.waitForTimeout(1000);
    }

    await expect(settingsFrame.getByText('Bitbucket Cloud')).toBeVisible();
};

/**
 * Helper function to get the Jira issue iframe
 */
export const getIssueFrame = async (page: Page) => {
    // First, let's try to find the iframe by waiting for it to be visible
    const webviewFrame = page.frameLocator('iframe.webview');
    // Try multiple possible iframe titles/selectors
    const possibleSelectors = [
        'iframe[title="Jira Issue"]',
        'iframe[title="BTS-1"]',
        'iframe[title*="BTS-"]',
        'iframe[src*="issue"]',
        'iframe:last-child', // fallback to last iframe
    ];
    for (const selector of possibleSelectors) {
        try {
            const frameHandle = await webviewFrame.locator(selector).elementHandle({ timeout: 2000 });
            if (frameHandle) {
                const issueFrame = await frameHandle.contentFrame();
                if (issueFrame) {
                    return issueFrame;
                }
            }
        } catch {
            // Continue to next selector
            continue;
        }
    }
    // If we get here, let's get some debugging info
    const iframes = await webviewFrame.locator('iframe').all();
    const iframeTitles = await Promise.all(
        iframes.map(async (iframe) => {
            try {
                return await iframe.getAttribute('title');
            } catch {
                return 'unknown';
            }
        }),
    );
    throw new Error(`No suitable iframe found. Available iframe titles: ${iframeTitles.join(', ')}`);
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

/**
 * Helper function to update search results when assignee changes
 */
export const updateSearch = async (request: APIRequestContext, includeBts1: boolean = false) => {
    const searchResponse = {
        expand: 'names,schema',
        startAt: 0,
        maxResults: 50,
        total: includeBts1 ? 5 : 4,
        issues: [
            {
                key: 'BTS-5',
                fields: {
                    summary: 'Fix Database Connection Errors',
                },
            },
            {
                key: 'BTS-4',
                fields: {
                    summary: 'Resolve API Timeout Issues',
                },
            },
            ...(includeBts1
                ? [
                      {
                          key: 'BTS-1',
                          fields: {
                              summary: 'User Interface Bugs',
                          },
                      },
                  ]
                : []),
            {
                key: 'BTS-3',
                fields: {
                    summary: 'Improve Dropdown Menu Responsiveness',
                },
            },
            {
                key: 'BTS-6',
                fields: {
                    summary: 'Fix Button Alignment Issue',
                },
            },
        ],
    };

    return await setupWireMockMapping(request, 'GET', searchResponse, '/rest/api/2/search');
};
