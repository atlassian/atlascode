import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { APIRequestContext } from '@playwright/test';
import fs from 'fs';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { updateIssueField } from './update-jira-issue';

/**
 * Helper function to set up WireMock mapping
 */
export const setupWireMockMapping = async (request: APIRequestContext, method: string, body: any, urlPath: string) => {
    const response = await request.post('http://wiremock-mockedteams:8080/__admin/mappings', {
        data: {
            request: {
                method,
                urlPath,
            },
            response: {
                status: 200,
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        },
    });
    return await response.json();
};

/**
 * Helper function to set up WireMock mapping for Bitbucket
 */
export const setupWireMockMappingBitbucket = async (
    request: APIRequestContext,
    method: string,
    body: any,
    urlPath: string,
    queryParameters?: any,
) => {
    const response = await request.post('http://wiremock-bitbucket:8080/__admin/mappings', {
        data: {
            request: {
                method,
                urlPathPattern: urlPath,
                queryParameters,
            },
            response: {
                status: 200,
                jsonBody: body,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        },
    });
    return await response.json();
};

/**
 * Helper function to clean up WireMock mapping
 */
export const cleanupWireMockMapping = async (request: APIRequestContext, mappingId: string) => {
    await request.delete(`http://wiremock-mockedteams:8080/__admin/mappings/${mappingId}`);
};

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

export async function setupIssueMock(
    request: APIRequestContext,
    updates: Record<string, any>,
    method: 'GET' | 'PUT' = 'GET',
) {
    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));

    const { id } = await setupWireMockMapping(
        request,
        method,
        updateIssueField(issueJSON, updates),
        '/rest/api/2/issue/BTS-1',
    );
    return () => cleanupWireMockMapping(request, id);
}

export async function setupPullrequests(request: APIRequestContext, values: Array<any>) {
    const { id } = await setupWireMockMappingBitbucket(
        request,
        'GET',
        { values, pagelen: 25, size: 0, page: 1 },
        '/2.0/repositories/mockuser/test-repository/pullrequests',
        {
            pagelen: {
                equalTo: '25',
            },
        },
    );

    return id;
}
