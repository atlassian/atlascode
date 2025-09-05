import { test } from '@playwright/test';
import { authenticateWithJiraDC, closeOnboardingQuickPick } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { jiraDCScenarios } from 'e2e/scenarios/jira';

test.describe('Jira DC', () => {
    for (const scenario of jiraDCScenarios) {
        test(scenario.name, async ({ page, request }) => {
            await authenticateWithJiraDC(page);
            await closeOnboardingQuickPick(page);
            await scenario.run(page, request, JiraTypes.DC);
        });
    }
});
