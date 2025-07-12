import type { APIRequestContext, Page } from '@playwright/test';

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
