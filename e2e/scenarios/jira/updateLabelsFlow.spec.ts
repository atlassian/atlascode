import { APIRequestContext, expect, Page } from '@playwright/test';
import { getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { AtlascodeDrawer, AtlassianSettings } from 'e2e/page-objects';

const LABELS_FIELD_PLACEHOLDER = 'Type to search';
const LABEL = 'testing';

export async function updateLabelsFlow(page: Page, request: APIRequestContext, type: JiraTypes) {
    await new AtlassianSettings(page).closeSettingsPage();

    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const issueFrame = await getIssueFrame(page);

    await expect(issueFrame.getByText(LABELS_FIELD_PLACEHOLDER)).toBeVisible();

    const labelsInput = issueFrame.locator('#labels input[type="text"]');
    await issueFrame.locator('#labels .ac-select__control').click();
    await page.waitForTimeout(250);
    await expect(labelsInput).toBeVisible();

    labelsInput.fill('test');
    await page.waitForTimeout(1000);
    const menu = issueFrame.locator('.ac-select__menu');
    await expect(menu).toBeVisible();

    const labelOption = menu.getByText(LABEL, { exact: true });

    // Check the label option is visible and contains the label
    await expect(labelOption).toBeVisible();

    const cleanupIssueMock = await setupIssueMock(request, { labels: [LABEL] }, 'GET', type);

    await labelOption.click();
    await page.waitForTimeout(1000);

    // Check the updated label field
    await expect(issueFrame.getByText(LABEL, { exact: true })).toBeVisible();

    const cleanupIssueMock2 = await setupIssueMock(request, { labels: [LABEL] }, 'PUT', type);

    // Label remove button
    await issueFrame.locator('.ac-select__multi-value__remove').click();
    await page.waitForTimeout(1000);

    // Check that the label was removed
    await expect(issueFrame.getByText(LABEL, { exact: true })).not.toBeVisible();

    await cleanupIssueMock();
    await cleanupIssueMock2();
}
