import { expect, test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { AtlascodeDrawer } from 'e2e/page-objects';

test('View image in Jira comment', async ({ page, request }) => {
    const imageSrc = 'https://mockedteams.atlassian.net/secure/attachment/10001/test-image.jpg';

    await authenticateWithJira(page);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const cleanupIssueMock = await setupIssueMock(request, {
        comment: `<p><span class="image-wrap" style=""><img src="${imageSrc}" alt="test-image.jpg" height="360" width="540" style="border: 0px solid black" /></span></p>`,
    });

    const drawer = new AtlascodeDrawer(page);
    await drawer.openJiraIssue('BTS-1 - User Interface Bugs');

    const issueFrame = await getIssueFrame(page);

    await expect(issueFrame.locator('.image-wrap img')).toBeVisible();

    await expect(issueFrame.locator('.image-wrap img')).toHaveAttribute('atlascode-original-src', imageSrc);

    await cleanupIssueMock();
});
