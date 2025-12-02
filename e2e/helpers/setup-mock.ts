import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { APIRequestContext } from '@playwright/test';
import fs from 'fs';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { JiraTypes, PullRequestComment } from './types';
import { updateIssueField } from './update-jira-issue';

/**
 * Helper function to reset all WireMock mappings
 * This should be called before each test to prevent state pollution from previous tests
 */
export const resetWireMockMappings = async ({ request }: { request: APIRequestContext }) => {
    await request.post('http://wiremock-mockedteams:8080/__admin/mappings/reset');
    await request.post('http://wiremock-bitbucket:8080/__admin/mappings/reset');
};

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

export async function setupSearchMock(request: APIRequestContext, status: string, type: JiraTypes) {
    const file = type === JiraTypes.DC ? 'search-dc.json' : 'search.json';
    const searchJSON = JSON.parse(fs.readFileSync(`e2e/wiremock-mappings/mockedteams/${file}`, 'utf-8'));

    const parsedBody = JSON.parse(searchJSON.response.body);
    const updatedIssue = structuredClone(parsedBody);

    const issueIndex = updatedIssue.issues.findIndex(({ key }: MinimalIssue<DetailedSiteInfo>) => key === 'BTS-1');
    updatedIssue.issues[issueIndex].fields.status.name = status;
    updatedIssue.issues[issueIndex].fields.status.statusCategory.name = status;
    const urlPath = type === JiraTypes.DC ? '/rest/api/2/search' : '/rest/api/3/search/jql';
    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, urlPath);
    return () => cleanupWireMockMapping(request, id);
}

export async function setupIssueMock(
    request: APIRequestContext,
    updates: Record<string, any>,
    method: 'GET' | 'PUT' = 'GET',
    type: JiraTypes = JiraTypes.Cloud,
) {
    const file = type === JiraTypes.DC ? 'BTS-1/bts1-dc.json' : 'BTS-1/bts1.json';
    const issueJSON = JSON.parse(fs.readFileSync(`e2e/wiremock-mappings/mockedteams/${file}`, 'utf-8'));

    const urlPath = type === JiraTypes.DC ? '/rest/api/2/issue/BTS-1' : '/rest/api/3/issue/BTS-1';
    const { id } = await setupWireMockMapping(request, method, updateIssueField(issueJSON, updates), urlPath);
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

    return () => cleanupWireMockMapping(request, id);
}

export async function setupPullrequestsDC(request: APIRequestContext, values: Array<any>) {
    const { id } = await setupWireMockMappingBitbucket(
        request,
        'GET',
        { values, limit: 25, size: 0, start: 0, isLastPage: true, nextPageStart: null },
        '/rest/api/1.0/projects/mocked-project/repos/dc-mocked-repo/pull-requests',
    );

    return () => cleanupWireMockMapping(request, id);
}

export async function setupPRComments(request: APIRequestContext, comments: Array<PullRequestComment>) {
    const { id } = await setupWireMockMappingBitbucket(
        request,
        'GET',
        { values: comments, pagelen: 100, size: comments.length, page: 1 },
        '/2.0/repositories/mockuser/test-repository/pullrequests/123/comments',
        {
            pagelen: {
                matches: '.*',
            },
        },
    );

    return () => cleanupWireMockMapping(request, id);
}

export async function setupPRCommentPost(
    request: APIRequestContext,
    comment: PullRequestComment | PullRequestComment[],
) {
    const body = Array.isArray(comment) ? comment[0] : comment;
    const { id } = await setupWireMockMappingBitbucket(
        request,
        'POST',
        body,
        '/2.0/repositories/mockuser/test-repository/pullrequests/123/comments',
    );

    return () => cleanupWireMockMapping(request, id);
}
