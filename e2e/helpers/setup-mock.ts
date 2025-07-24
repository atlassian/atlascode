import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { APIRequestContext } from '@playwright/test';
import fs from 'fs';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { cleanupWireMockMapping, setupWireMockMapping } from './common';
import { updateIssueField } from './update-jira-issue';

export async function setupSearchMock(request: APIRequestContext, status: string) {
    const searchJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/search.json', 'utf-8'));

    const parsedBody = JSON.parse(searchJSON.response.body);
    const updatedIssue = structuredClone(parsedBody);

    const issueIndex = updatedIssue.issues.findIndex(({ key }: MinimalIssue<DetailedSiteInfo>) => key === 'BTS-1');
    updatedIssue.issues[issueIndex].fields.status.name = status;
    updatedIssue.issues[issueIndex].fields.status.statusCategory.name = status;

    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, '/rest/api/2/search');
    return () => cleanupWireMockMapping(request, id);
}

export async function setupIssueMock(request: APIRequestContext, updates: Record<string, any>) {
    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));

    const { id } = await setupWireMockMapping(
        request,
        'GET',
        updateIssueField(issueJSON, updates),
        '/rest/api/2/issue/BTS-1',
    );
    return () => cleanupWireMockMapping(request, id);
}
