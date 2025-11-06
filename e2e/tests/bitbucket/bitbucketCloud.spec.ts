import { test } from '@playwright/test';
import { authenticateWithBitbucketCloud, closeOnboardingQuickPick } from 'e2e/helpers';
import { JiraTypes as BitbucketTypes } from 'e2e/helpers/types';
import { bitbucketScenarios } from 'e2e/scenarios/bitbucket';

test.describe('Bitbucket Cloud', () => {
    for (const scenario of bitbucketScenarios) {
        test(scenario.name, async ({ page, context, request }) => {
            await authenticateWithBitbucketCloud(page, context);
            await closeOnboardingQuickPick(page);
            await scenario.run(page, BitbucketTypes.Cloud, request);
        });
    }
});
