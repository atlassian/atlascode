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

type SiteId = string;

const ASSIST_API = '/gateway/api/assist/api/ai/v2/ai-feature/jira/issue/source-type/code/suggestions';

export const isSiteCloudWithApiKey = async (site?: DetailedSiteInfo | SiteId): Promise<boolean> => {
    const siteToCheck = typeof site === 'string' ? Container.siteManager.getSiteForId(ProductJira, site) : site;

    if (!siteToCheck || !siteToCheck.host) {
        return false;
    }

    if (!siteToCheck.host.endsWith('.atlassian.net')) {
        return false;
    }

    const authInfo = await Container.credentialManager.getAuthInfo(siteToCheck);
    if (!authInfo || !isBasicAuthInfo(authInfo)) {
        return false;
    }

    return true;
};

export const findCloudSiteWithApiKey = async (): Promise<DetailedSiteInfo | undefined> => {
    const sites = (
        await Promise.all(
            Container.siteManager
                .getSitesAvailable(ProductJira)
                .map(async (x) => ((await isSiteCloudWithApiKey(x)) ? x : undefined)),
        )
    ).filter((x) => x !== undefined) as DetailedSiteInfo[];

    // Any site is fine, just need an API key
    return sites.length > 0 ? sites[0] : undefined;
};

export const fetchIssueSuggestions = async (prompt: string, context?: string): Promise<SuggestedIssuesResponse> => {
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
