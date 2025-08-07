import { test } from '@playwright/test';
import { authenticateWithJiraDC } from 'e2e/helpers';
import {
    addComment,
    assigningFlow,
    attachFile,
    authFlowJira,
    createIssue,
    renameIssue,
    updateDescription,
    updateIssueStatus,
    updateLabelsFlow,
    viewCommentWithImage,
    // checkImageInDescription,
} from 'e2e/scenarios/jira';

export const jiraScenarios = [
    { name: 'Authenticate with Jira', run: authFlowJira },
    { name: 'Create issue', run: createIssue },
    { name: 'Rename issue', run: renameIssue },
    { name: 'Update issue description', run: updateDescription },
    { name: 'Update issue status', run: updateIssueStatus },
    { name: 'Add comment to issue', run: addComment },
    { name: 'View comment with image in issue', run: viewCommentWithImage },
    { name: 'Attach file to issue', run: attachFile },
    { name: 'Assigning issue to myself', run: assigningFlow },
    { name: 'Add and remove existing labels', run: updateLabelsFlow },
    // Skipped for now, because it's not working in Jira DC (separate issue)
    // { name: 'Check image in description', run: checkImageInDescription },
];

test.describe('Jira DC', () => {
    for (const scenario of jiraScenarios) {
        test(scenario.name, async ({ page, request }) => {
            await authenticateWithJiraDC(page);
            await scenario.run(page, request);
        });
    }
});
