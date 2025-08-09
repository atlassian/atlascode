import { test } from '@playwright/test';
import { authenticateWithJira } from 'e2e/helpers';
import { jiraScenarios } from 'e2e/scenarios/jira';

test.describe('Jira Cloud', () => {
    for (const scenario of jiraScenarios) {
        test(scenario.name, async ({ page, request }) => {
            await authenticateWithJira(page);
            await scenario.run(page, request);
        });
    }
});
