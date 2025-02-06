import { version, window } from 'vscode';
import { ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { LegacyPMFData } from '../ipc/messaging';
import { getAgent, getAxiosInstance } from '../jira/jira-client/providers';
import { PMFData } from '../lib/ipc/models/common';
import { getFeedbackUser } from './feedbackUser';
import * as vscode from 'vscode';

const q1Choices = {
    '0': 'Very disappointed',
    '1': 'Somewhat disappointed',
    '2': 'Not disappointed',
};

export async function submitJSDPMF(pmfData: PMFData) {
    const user = await getFeedbackUser();

    const context = {
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
                value: `Atlascode: PMF Survey from ${user.userName}`,
            },
            {
                id: 'description',
                value: `*Disappointment Level*: ${pmfData.level}
                
                *Improvements*

                ${pmfData.improvements}
                
                *Alternative*

                ${pmfData.alternative}

                *Benefits*

                ${pmfData.benefits}`,
            },
            {
                // Context (text)
                id: 'customfield_10047',
                value: JSON.stringify(context, undefined, 4),
            },
            {
                // Request type (comment)
                id: 'customfield_10042',
                value: {
                    id: '10106',
                },
            },
            {
                // User name (text, optional)
                id: 'customfield_10045',
                value: user.userName,
            },
            {
                // Can be contacted? (no)
                id: 'customfield_10043',
                value: [
                    {
                        id: '10111',
                    },
                ],
            },
            {
                id: 'email',
                value: user.emailAddress,
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
        `https://jsd-widget.atlassian.com/api/embeddable/b1d25f9a-a527-40a4-9671-a98182dd78b1/request?requestTypeId=224`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify(payload),
            ...getAgent(),
        },
    );

    window.showInformationMessage('The Atlassian team thanks you for your feedback!');
}

export async function submitLegacyJSDPMF(feedback: LegacyPMFData) {
    const user = await getFeedbackUser();

    const context = {
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
                value: `Atlascode: PMF Survey from ${user.userName}`,
            },
            {
                id: 'description',
                value: `*Disappointment Level*: ${q1Choices[feedback.q1]}
                
                *Improvements*

                ${feedback.q2}
                
                *Alternative*

                ${feedback.q3}

                *Benefits*

                ${feedback.q4}`,
            },
            {
                // Context (text)
                id: 'customfield_10047',
                value: JSON.stringify(context, undefined, 4),
            },
            {
                // Request type (comment)
                id: 'customfield_10042',
                value: {
                    id: '10106',
                },
            },
            {
                // User name (text, optional)
                id: 'customfield_10045',
                value: user.userName,
            },
            {
                // Can be contacted? (no)
                id: 'customfield_10043',
                value: [
                    {
                        id: '10111',
                    },
                ],
            },
            {
                id: 'email',
                value: user.emailAddress,
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
        `https://jsd-widget.atlassian.com/api/embeddable/b1d25f9a-a527-40a4-9671-a98182dd78b1/request?requestTypeId=224`,
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
