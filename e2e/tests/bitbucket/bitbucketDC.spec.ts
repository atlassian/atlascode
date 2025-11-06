import { test } from '@playwright/test';
import { authenticateWithBitbucketDC, closeOnboardingQuickPick, resetWireMockMappings } from 'e2e/helpers';
import { JiraTypes as BitbucketTypes } from 'e2e/helpers/types';
import { bitbucketScenariosDC } from 'e2e/scenarios/bitbucket';

test.describe('Bitbucket DC', () => {
    test.beforeEach(resetWireMockMappings);

    for (const scenario of bitbucketScenariosDC) {
        test(scenario.name, async ({ page, request }) => {
            await authenticateWithBitbucketDC(page);
            await closeOnboardingQuickPick(page);
            await scenario.run(page, BitbucketTypes.DC, request);
        });
    }
});
