import { expect, test } from '@playwright/test';

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

test('Test image check on attachments', async ({ page, context }) => {
    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();

    await page.getByRole('tab', { name: 'Getting Started' }).getByLabel(/close/i).click();

    await context.clearCookies();
    await page.goto('http://localhost:9988/');
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    await page.getByRole('treeitem', { name: 'Please login to Jira' }).click();

    await page.getByRole('tab', { name: 'Atlassian Settings' }).click();
    await page.waitForTimeout(2000);
    let webviewIframes = await page.$$('iframe.webview');

    let settingsFrameLocator;
    for (const iframe of webviewIframes) {
        const frame = await iframe.contentFrame();
        if (frame && (await frame.$('iframe[title="Atlassian Settings"]'))) {
            settingsFrameLocator = page
                .frameLocator(`iframe.webview[name="${await iframe.getAttribute('name')}"]`)
                .frameLocator('iframe[title="Atlassian Settings"]');
            break;
        }
    }

    if (!settingsFrameLocator) {
        throw new Error('Atlassian Settings iframe not found');
    }

    // Now use settingsFrameLocator as before
    await settingsFrameLocator.getByRole('button', { name: 'Login to Jira' }).click();
    await page.waitForTimeout(250);

    await settingsFrameLocator.getByRole('textbox', { name: 'Base URL' }).fill('https://mockedteams.atlassian.net');
    await page.waitForTimeout(250);

    await settingsFrameLocator.getByRole('textbox', { name: 'Username' }).fill('mock@atlassian.code');
    await page.waitForTimeout(250);

    await settingsFrameLocator.getByRole('textbox', { name: 'Password (API token)' }).fill('12345');
    await page.waitForTimeout(250);

    await settingsFrameLocator.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(2000);

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(5000);

    webviewIframes = await page.$$('iframe.webview');
    let issueFrameLocator;
    for (const iframe of webviewIframes) {
        const frame = await iframe.contentFrame();
        if (frame && (await frame.$('iframe[title="BTS-1"]'))) {
            issueFrameLocator = page
                .frameLocator(`iframe.webview[name="${await iframe.getAttribute('name')}"]`)
                .frameLocator('iframe[title="BTS-1"]');
            break;
        }
    }
    if (!issueFrameLocator) {
        throw new Error('BTS-1 iframe not found');
    }

    // Check attachment inside the correct frame
    await expect(issueFrameLocator.getByText('image.png')).toBeVisible();
    await page.waitForTimeout(2000);
});
