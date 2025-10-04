import truncate from 'lodash.truncate';
import { version } from 'vscode';

import { ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { getAgent, getAxiosInstance } from '../jira/jira-client/providers';

type FeatureFeedbackData = {
    description: string;
    feature: string;
    email: string;
};

type FeedbackPayload = {
    summary?: string;
    context?: string;
};

class JSDSubmitter<FeedbackData extends FeatureFeedbackData, FullPayload = FeedbackData & FeedbackPayload> {
    private readonly widgetId: string;
    private readonly requestTypeId: number;
    private readonly fieldMapper: Record<keyof FullPayload, string>;
    private readonly valueMapper?: Partial<Record<keyof FullPayload, (value: FullPayload[keyof FullPayload]) => any>>;

    constructor({
        widgetId,
        requestTypeId,
        fieldMapper: fieldMappings,
        valueMapper,
    }: {
        widgetId: string;
        requestTypeId: number;
        fieldMapper: Record<keyof FullPayload, string>;
        valueMapper: Partial<Record<keyof FullPayload, (value: any) => any>>;
    }) {
        this.widgetId = widgetId;
        this.requestTypeId = requestTypeId;
        this.fieldMapper = fieldMappings as Record<keyof FullPayload, string>;
        this.valueMapper = valueMapper;
    }

    public get url(): string {
        return `https://jsd-widget.atlassian.com/api/embeddable/${this.widgetId}/request?requestTypeId=${this.requestTypeId}`;
    }

    async send(feedback: FeedbackData) {
        const fullFeedback = {
            summary: `[${feedback.feature}] ${truncate(feedback.description.trim().split('\n', 1)[0])}`,
            context: JSON.stringify(this.buildContext(), undefined, 4),
            ...feedback,
        };

        const payload = {
            fields: Object.entries(fullFeedback).map(([key, value]) => {
                const mapper = (this.valueMapper && this.valueMapper[key as keyof FullPayload]) ?? ((v) => v);
                return {
                    id: this.fieldMapper[key as keyof FullPayload],
                    value: mapper(value as any),
                };
            }),
        };

        const transport = getAxiosInstance();

        await transport(this.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify(payload),
            ...getAgent(),
        });
    }

    buildContext() {
        return {
            extensionVersion: Container.version,
            vscodeVersion: version,
            platform: process.platform,
            jiraCloud: Container.siteManager.getSitesAvailable(ProductJira).find((site) => site.isCloud) !== undefined,
            jiraServer:
                Container.siteManager.getSitesAvailable(ProductJira).find((site) => !site.isCloud) !== undefined,
            bitbucketCloud:
                Container.siteManager.getSitesAvailable(ProductBitbucket).find((site) => site.isCloud) !== undefined,
            bitbucketServer:
                Container.siteManager.getSitesAvailable(ProductBitbucket).find((site) => !site.isCloud) !== undefined,
        };
    }
}

export const AxonFeedbackSubmitter = new JSDSubmitter<{
    description: string;
    feature: string;
    email: string;
    canContact: boolean;
}>({
    widgetId: '559f0b64-c9d1-4480-a9fd-b2d44d47f6f2',
    requestTypeId: 11890,
    fieldMapper: {
        description: 'description',
        summary: 'summary',
        email: 'email',
        context: 'customfield_11561',
        feature: 'customfield_11562',
        canContact: 'customfield_11563',
    },
    valueMapper: {
        canContact: (value: boolean) => (value ? { id: '11711' } : { id: '11712' }),
    },
});
