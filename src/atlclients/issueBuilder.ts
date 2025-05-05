import { AxiosInstance } from 'axios';
import { Container } from 'src/container';

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

export const findCloudSiteWithApiKey = async (): Promise<DetailedSiteInfo | null> => {
    const sites = await Promise.all(
        Container.siteManager.getSitesAvailable(ProductJira).map(async (site) => {
            if (!site.host.endsWith('.atlassian.net')) {
                return null;
            }

            const authInfo = await Container.credentialManager.getAuthInfo(site);
            if (!authInfo || !isBasicAuthInfo(authInfo)) {
                return null;
            }

            return site;
        }),
    ).then((results) => results.filter(Boolean));

    // Any site is fine, just need an API key
    const site = sites[0];
    return site;
};

export const fetchIssueSuggestions = async (prompt: string): Promise<SuggestedIssuesResponse> => {
    const axiosInstance: AxiosInstance = getAxiosInstance();

    try {
        const site = await findCloudSiteWithApiKey();

        if (!site) {
            throw new Error('No site found with API key');
        }

        const authInfo = (await Container.credentialManager.getAuthInfo(site)) as BasicAuthInfo;
        if (!authInfo || !isBasicAuthInfo(authInfo)) {
            throw new Error('No valid auth info found for site');
        }

        const response = await axiosInstance.post(
            `https://${site.host}/gateway/api/assist/chat/v1/invoke_agent`,
            {
                recipient_agent_named_id: 'ai_issue_create_agent',
                agent_input_context: {
                    application: 'Slack',
                    context: {
                        primary_message: { text: prompt },
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
            },
            {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    Accept: 'application/json;charset=UTF-8',
                    'X-Experience-Id': 'ai-issue-create-slack',
                    'X-Product': 'jira',
                    Authorization:
                        'Basic ' + Buffer.from(`${authInfo.username}:${authInfo.password}`).toString('base64'),
                },
            },
        );
        const content = JSON.parse(response.data.message.content);

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
        console.error('Error fetching issue suggestions:', error);
        throw error;
    }
};
