import { AnalyticsWebClient, Identifiers } from '@atlaskit/feature-gate-js-client';

import { AnalyticsClient } from '../../analytics-node-client/src/client.min';

// We'll be using the JS client package for the feature flags,
// however, it relies on the frontend analytics client (@atlassiansox/analytics-web-client)
// This project uses @atlassiansox/analytics-node-client instead
// To remedy this, we'll create a mapper between the two:

// Not exported in the original package for some reason
type OperationalEventPayload = {
    action: string;
    actionSubject: string;
    actionSubjectId?: string;
    attributes?: Record<string, unknown>;
    tags?: string[];
    source: string;
};

export class AnalyticsClientMapper implements AnalyticsWebClient {
    public identifiers: Identifiers;

    constructor(
        private readonly analyticsClient: AnalyticsClient,
        identifiers: Identifiers,
    ) {
        this.identifiers = structuredClone(identifiers);
    }

    public sendOperationalEvent(event: OperationalEventPayload, callback?: any): void {
        const ids = this.identifiers.atlassianAccountId
            ? { userId: this.identifiers.atlassianAccountId, userIdType: 'atlassianAccount' }
            : {};

        const constructedEvent = {
            operationalEvent: {
                ...event,
            },
            ...ids,
            anonymousId: this.identifiers.analyticsAnonymousId,
        };

        this.analyticsClient.sendOperationalEvent(constructedEvent as any);
    }
}
