import { test } from '@playwright/test';
import { authenticateWithBitbucketCloud } from 'e2e/helpers';
import { bitbucketScenarios } from 'e2e/scenarios/bitbucket';

test.describe('Bitbucket Cloud', () => {
    for (const scenario of bitbucketScenarios) {
        test(scenario.name, async ({ page, context, request }) => {
            await authenticateWithBitbucketCloud(page, context);
            await scenario.run(page, request);
        });
    }
});
