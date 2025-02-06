import truncate from 'lodash.truncate';
import { version, window } from 'vscode';
import { ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { getAgent, getAxiosInstance } from '../jira/jira-client/providers';
import { FeedbackData, FeedbackType } from '../lib/ipc/models/common';
import * as vscode from 'vscode';

const feedbackTypeIds = {
    [FeedbackType.Bug]: '10105',
    [FeedbackType.Comment]: '10106',
    [FeedbackType.Suggestion]: '10107',
    [FeedbackType.Question]: '10108',
    [FeedbackType.Empty]: '10107',
};

export async function submitFeedback(feedback: FeedbackData) {
    const context = {
        source: feedback.source,
        extensionVersion: Container.version,
        vscodeVersion: version,
        platform: process.platform,
        jiraCloud: Container.siteManager.getSitesAvailable(ProductJira).find((site) => site.isCloud) !== undefined,
        jiraServer: Container.siteManager.getSitesAvailable(ProductJira).find((site) => !site.isCloud) !== undefined,
        bitbucketCloud:
            Container.siteManager.getSitesAvailable(ProductBitbucket).find((site) => site.isCloud) !== undefined,
        bitbucketServer:
            Container.siteManager.getSitesAvailable(ProductBitbucket).find((site) => !site.isCloud) !== undefined,
    };

    const payload = {
        fields: [
            {
                id: 'summary',
                value: `Atlascode: ${truncate(feedback.description.trim().split('\n', 1)[0], {
                    length: 100,
                    separator: /,?\s+/,
                }).trim()}`,
            },
            {
                id: 'description',
                value: feedback.description,
            },
            {
                // Context (text)
                id: 'customfield_10047',
                value: JSON.stringify(context, undefined, 4),
            },
            {
                // Request type (bug/comment/improvement/question)
                id: 'customfield_10042',
                value: {
                    id: feedbackTypeIds[feedback.type],
                },
            },
            {
                // User name (text, optional)
                id: 'customfield_10045',
                value: feedback.userName,
            },
            {
                // Can be contacted?
                id: 'customfield_10043',
                value: [
                    {
                        id: feedback.canBeContacted ? '10109' : '10111',
                    },
                ],
            },
            {
                id: 'email',
                value: feedback.emailAddress,
            },
            {
                id: 'components',
                value: [
                    {
                        id: '10097',
                    },
                ],
            },
        ],
    };

    const transport = getAxiosInstance();

    transport(
        `https://jsd-widget.atlassian.com/api/embeddable/b1d25f9a-a527-40a4-9671-a98182dd78b1/request?requestTypeId=202`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify(payload),
            ...getAgent(),
        },
    );

    window.showInformationMessage(vscode.l10n.t('The Atlassian team thanks you for your feedback!'));
}
