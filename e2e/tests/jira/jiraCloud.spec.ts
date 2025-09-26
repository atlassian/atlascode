import { test } from '@playwright/test';
import { authenticateWithJiraCloud, closeOnboardingQuickPick } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { jiraCloudScenarios, unAuthenticatedJiraScenarios } from 'e2e/scenarios/jira';

test.describe('Jira Cloud', () => {
    // Unauthenticated scenarios
    for (const scenario of unAuthenticatedJiraScenarios) {
        test(scenario.name, async ({ page }) => {
            await scenario.run(page);
        });
    }

    // Authenticated scenarios
    for (const scenario of jiraCloudScenarios) {
        test(scenario.name, async ({ page, request }) => {
            await authenticateWithJiraCloud(page);
            await closeOnboardingQuickPick(page);
            await scenario.run(page, request, JiraTypes.Cloud);
        });
    }
});
