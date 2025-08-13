import { Page } from '@playwright/test';
import { AtlascodeDrawer } from 'e2e/page-objects';

const EXPECTED_ISSUES = [
    'BTS-3 - Improve Dropdown Menu Responsiveness',
    'BTS-4 - Resolve API Timeout Issues',
    'BTS-5 - Fix Database Connection Errors',
    'BTS-6 - Fix Button Alignment Issue',
];

export async function authFlowJira(page: Page) {
    const atlascodeDrawer = new AtlascodeDrawer(page);

    for (const issueName of EXPECTED_ISSUES) {
        await atlascodeDrawer.jira.expectIssueExists(issueName);
    }
}
