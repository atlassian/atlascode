import { expect, test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings } from 'e2e/page-objects';

test('User can add and remove existing labels', async ({ page, request }) => {
    const labelsFieldPlaceholder = 'Type to search';
    const label = 'testing';

    await authenticateWithJira(page);
    await new AtlassianSettings(page).closeSettingsPage();

    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const issueFrame = await getIssueFrame(page);

    await expect(issueFrame.getByText(labelsFieldPlaceholder)).toBeVisible();

    const labelsInput = issueFrame.locator('#labels input[type="text"]');
    await issueFrame.locator('#labels .ac-select__control').click();
    await page.waitForTimeout(250);
    await expect(labelsInput).toBeVisible();

    labelsInput.fill('test');
    await page.waitForTimeout(1000);
    const menu = issueFrame.locator('.ac-select__menu');
    await expect(menu).toBeVisible();

    const labelOption = menu.getByText(label, { exact: true });

    // Check the label option is visible and contains the label
    await expect(labelOption).toBeVisible();

    const cleanupIssueMock = await setupIssueMock(request, { labels: [label] });

    await labelOption.click();
    await page.waitForTimeout(1000);

    // Check the updated label field
    await expect(issueFrame.getByText(label, { exact: true })).toBeVisible();

    const cleanupIssueMock2 = await setupIssueMock(request, { labels: [label] }, 'PUT');

    // Label remove button
    await issueFrame.locator('.ac-select__multi-value__remove').click();
    await page.waitForTimeout(1000);

    // Check that the label was removed
    await expect(issueFrame.getByText(label, { exact: true })).not.toBeVisible();

    await cleanupIssueMock();
    await cleanupIssueMock2();
});
