import { defineConfig } from '@playwright/test';

export default defineConfig({
    retries: 3,
    use: {
        viewport: {
            width: 1600,
            height: 800,
        },
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'jira-cloud',
            testDir: 'e2e/tests/jira',
            testMatch: /jiraCloud\.spec\.ts/,
        },
        {
            name: 'jira-dc',
            testDir: 'e2e/tests/jira',
            testMatch: /jiraDC\.spec\.ts/,
        },
        {
            name: 'bitbucket-cloud',
            testDir: 'e2e/tests/bitbucket',
            testMatch: /bitbucketCloud\.spec\.ts/,
        },
        {
            name: 'bitbucket-dc',
            testDir: 'e2e/tests/bitbucket',
            testMatch: /bitbucketDC\.spec\.ts/,
        },
    ]
});