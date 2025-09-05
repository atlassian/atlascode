import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { cleanupWireMockMapping, getIssueFrame, setupWireMockMapping } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { createSearchResponse } from 'e2e/mock-data/search';
import { AtlascodeDrawer, AtlassianSettings } from 'e2e/page-objects';

export async function assigningFlow(page: Page, request: APIRequestContext, type: JiraTypes) {
    // This test is large and may run longer on slower machines,
    // so we extend the timeout to 50 seconds (default is 30s).
    // See: https://playwright.dev/docs/test-timeouts#set-timeout-for-a-single-test
    test.setTimeout(50_000);

    await new AtlassianSettings(page).closeSettingsPage();
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const issueFrame = await getIssueFrame(page);

    // Step 1: Verify and clear current assignee (Mocked McMock)
    const initialAssignee = issueFrame.locator('#assignee', { hasText: 'Mocked McMock' });
    await expect(initialAssignee).toBeVisible();

    const clearButton = issueFrame.locator('[aria-label="clear"]');
    await expect(clearButton).toBeVisible();

    await clearButton.click();
    await expect(initialAssignee).toHaveCount(0);
    await expect(issueFrame.locator('#assignee')).toBeVisible();

    // Step 2: Assign to another user
    const assigneeInput = issueFrame.locator('#assignee input[type="text"]');
    await expect(assigneeInput).toBeVisible();

    await assigneeInput.fill('Another');
    await page.waitForTimeout(1000);
    const urlPath = type === JiraTypes.DC ? '/rest/api/2/search' : '/rest/api/3/search/jql';
    const { id: searchMappingId } = await setupWireMockMapping(request, 'GET', createSearchResponse(false), urlPath);
    const menu = issueFrame.locator('.ac-select__menu');
    await expect(menu).toBeVisible();

    const userOption = menu.locator('.ac-flex', { hasText: 'Another User' });
    await expect(userOption).toBeVisible();

    await userOption.click();
    await page.waitForTimeout(1000);
    const assigneeWithOtherName = issueFrame.locator('#assignee', { hasText: 'Another User' });
    await expect(assigneeWithOtherName).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' })).not.toBeVisible();

    // Step 3: Reassign back to original user
    await assigneeInput.click();
    await assigneeInput.fill('Mocked');
    await page.waitForTimeout(1000);
    const { id: searchWithBts1MappingId } = await setupWireMockMapping(
        request,
        'GET',
        createSearchResponse(true),
        urlPath,
    );
    await expect(menu).toBeVisible();

    const initialUserOption = menu.locator('.ac-flex', { hasText: 'Mocked McMock' });
    await expect(initialUserOption).toBeVisible();

    await initialUserOption.click();
    await page.waitForTimeout(1000);
    await expect(initialAssignee).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' })).toBeVisible();

    // Step 4: Close and reopen the issue to verify persistence
    await page.getByRole('tab', { name: 'BTS-1' }).getByLabel(/close/i).click();
    await expect(page.getByRole('tab', { name: 'BTS-1' })).toHaveCount(0);

    const treeItem = page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' });
    await expect(treeItem).toBeVisible();

    await treeItem.click();
    await page.waitForTimeout(2000);
    const newFrame = await getIssueFrame(page);
    await expect(newFrame.locator('#assignee', { hasText: 'Mocked McMock' })).toBeVisible();

    await cleanupWireMockMapping(request, searchMappingId);
    await cleanupWireMockMapping(request, searchWithBts1MappingId);
}
