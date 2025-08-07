import { test } from '@playwright/test';
import { authenticateWithJira } from 'e2e/helpers';
import {
    addComment,
    assigningFlow,
    attachFile,
    authFlowJira,
    checkImageInDescription,
    createIssue,
    renameIssue,
    updateDescription,
    updateIssueStatus,
    updateLabelsFlow,
    viewCommentWithImage,
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
    { name: 'Check image in description', run: checkImageInDescription },
];

test.describe('Jira Cloud', () => {
    for (const scenario of jiraScenarios) {
        test(scenario.name, async ({ page, request }) => {
            await authenticateWithJira(page);
            await scenario.run(page, request);
        });
    }
});
