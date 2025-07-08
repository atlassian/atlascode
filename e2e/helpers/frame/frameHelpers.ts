import type { Page } from '@playwright/test';

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
