import { expect, test } from '@playwright/test';
import { authenticateWithJira, cleanupWireMockMapping, getIssueFrame, updateSearch } from 'e2e/helpers';

test('Assigning Jira issue to myself works', async ({ page, request }) => {
    // Authenticate and open BTS-1 issue
    await authenticateWithJira(page);
    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(1000);

    // Close settings tab to focus on the issue
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();
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
    const { id: searchMappingId } = await updateSearch(request, false);
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
    const { id: searchWithBts1MappingId } = await updateSearch(request, true);
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
    const newFrame = await getIssueFrame(page);
    await expect(newFrame.locator('#assignee', { hasText: 'Mocked McMock' })).toBeVisible();

    await cleanupWireMockMapping(request, searchMappingId);
    await cleanupWireMockMapping(request, searchWithBts1MappingId);
});
