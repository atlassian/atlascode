import { expect, test } from '@playwright/test';
import {
    authenticateWithJira,
    cleanupWireMockMapping,
    getIssueFrame,
    setupWireMockMapping,
    updateIssueField,
} from 'e2e/helpers';
import fs from 'fs';

test('User can add and remove existing labels', async ({ page, request }) => {
    const labelsFieldPlaceholder = 'Type to search';
    const label = 'testing';
    await authenticateWithJira(page);

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();
    const issueFrame = await getIssueFrame(page);

    await expect(issueFrame.getByText(labelsFieldPlaceholder)).toBeVisible();

    const labelsInput = issueFrame.locator('#labels input[type="text"]');
    await issueFrame.getByText(labelsFieldPlaceholder).click();
    await page.waitForTimeout(250);
    await expect(labelsInput).toBeVisible();

    labelsInput.fill('test');
    await page.waitForTimeout(1000);
    const menu = issueFrame.locator('.ac-select__menu');
    await expect(menu).toBeVisible();

    const labelOption = menu.getByText(label, { exact: true });

    // Check the label option is visible and contains the label
    await expect(labelOption).toBeVisible();

    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));
    const updatedIssue = updateIssueField(issueJSON, {
        labels: [label],
    });
    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, '/rest/api/2/issue/BTS-1');

    await labelOption.click();
    await page.waitForTimeout(1000);

    // Check the updated label field
    await expect(issueFrame.getByText(label, { exact: true })).toBeVisible();

    const updatedIssueWithoutLabel = updateIssueField(issueJSON, {
        labels: [],
    });

    const { id: removeId } = await setupWireMockMapping(
        request,
        'PUT',
        updatedIssueWithoutLabel,
        '/rest/api/2/issue/BTS-1',
    );

    // Label remove button
    await issueFrame.locator('.ac-select__multi-value__remove').click();
    await page.waitForTimeout(1000);

    // Check that the label was removed
    await expect(issueFrame.getByText(label, { exact: true })).not.toBeVisible();

    await cleanupWireMockMapping(request, id);
    await cleanupWireMockMapping(request, removeId);
});
