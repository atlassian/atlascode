import { AxiosInstance } from 'axios';
import { Logger } from 'src/logger';

import { Container } from '../container';
import { getAxiosInstance } from '../jira/jira-client/providers';
import { BasicAuthInfo, DetailedSiteInfo, isBasicAuthInfo, ProductJira } from './authInfo';

export type SuggestedIssue = {
    issueType: string;
    fieldValues: {
        summary: string;
        description: string;
    };
};

export type SuggestedIssuesResponse = {
    suggestedIssues: SuggestedIssue[];
};

const ASSIST_API = '/gateway/api/assist/api/ai/v2/ai-feature/jira/issue/source-type/code/suggestions';

export const fetchIssueSuggestions = async (
    site: DetailedSiteInfo,
    prompt: string,
    context?: string,
): Promise<SuggestedIssuesResponse> => {
    const axiosInstance: AxiosInstance = getAxiosInstance();

    try {
        const authInfo = await Container.credentialManager.findApiTokenForSite(site);
        if (!authInfo || !isBasicAuthInfo(authInfo)) {
            throw new Error('No valid auth info found for site');
        }

        const response = await axiosInstance.post(
            `https://${site.host}` + ASSIST_API,
            buildRequestBody(prompt, context),
            {
                headers: buildRequestHeaders(authInfo),
            },
        );
        const content = response.data.ai_feature_output;

        const responseData: SuggestedIssuesResponse = {
            suggestedIssues: content.suggested_issues.map((issue: any) => ({
                issueType: issue.issue_type,
                fieldValues: {
                    summary: issue.field_values.Summary,
                    description: issue.field_values.Description,
                },
            })),
        };

        if (!responseData.suggestedIssues || responseData.suggestedIssues.length === 0) {
            throw new Error('No suggested issues found');
        }

        return responseData;
    } catch (error) {
        Logger.error(error, 'Error fetching issue suggestions');
        throw error;
    }
};

const buildRequestBody = (prompt: string, context?: string): any => ({
    ai_feature_input: {
        source: 'IDE',
        locale: 'en-US',
        context: {
            primary_context: [
                {
                    value: prompt,
                },
            ],
            supporting_context: [
                {
                    value: context || '',
                },
            ],
        },
        suggested_issues_config: {
            max_issues: 1,
            suggested_issue_field_types: [
                {
                    issue_type: 'Task',
                    fields: [
                        {
                            field_name: 'Summary',
                            field_type: 'Short-Text',
                        },
                        {
                            field_name: 'Description',
                            field_type: 'Paragraph',
                        },
                    ],
                },
            ],
        },
    },
});

const buildRequestHeaders = (authInfo: BasicAuthInfo): Record<string, string> => ({
    'Content-Type': 'application/json',
    'X-Product': ProductJira.key,
    Authorization: 'Basic ' + Buffer.from(`${authInfo.username}:${authInfo.password}`).toString('base64'),
});
