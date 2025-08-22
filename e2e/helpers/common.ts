import type { Page } from '@playwright/test';

/**
 * Helper function to open atlassian settings with provided credentials
 */
export const openAtlassianSettings = async (page: Page, itemName: string) => {
    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.waitForTimeout(250);

    await page.getByRole('treeitem', { name: itemName }).click();
    await page.waitForTimeout(250);

    return page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');
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
 * Helper function to close all notification toasts
 */
export const closeAllNotifications = async (page: Page) => {
    const clearNotificationButton = page.getByRole('button', { name: /Clear Notification/i });

    while ((await clearNotificationButton.count()) > 0) {
        const closeButton = clearNotificationButton.first();
        await closeButton.click().catch(() => {}); // Ignore errors if toast is already closed
        await page.waitForTimeout(100);
    }
};

export const closeOnboardingQuickPick = async (page: Page) => {
    const onboardingDismissButton = page.getByRole('button', { name: 'Dismiss' });
    if (await onboardingDismissButton.isVisible()) {
        await onboardingDismissButton.click();
        await page.mouse.move(0, 0); // Move mouse to avoid hover effects
    }
    await page.waitForTimeout(500);
};
