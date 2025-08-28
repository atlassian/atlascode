import { test } from '@playwright/test';
import { authenticateWithBitbucketDC } from 'e2e/helpers';
import { bitbucketScenarios } from 'e2e/scenarios/bitbucket';

test.describe('Bitbucket DC', () => {
    for (const scenario of bitbucketScenarios) {
        test(scenario.name, async ({ page, request }) => {
            await authenticateWithBitbucketDC(page);
            await scenario.run(page, request);
        });
    }
});
