import { test } from '@playwright/test';
import { authenticateWithJiraDC } from 'e2e/helpers';
import { jiraScenarios } from 'e2e/scenarios/jira';

test.describe('Jira DC', () => {
    for (const scenario of jiraScenarios) {
        test(scenario.name, async ({ page, request }) => {
            await authenticateWithJiraDC(page);
            await scenario.run(page, request);
        });
    }
});
