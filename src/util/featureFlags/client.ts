import { AnalyticsClient } from '../../analytics-node-client/src/client.min';

import FeatureGates, { FeatureGateEnvironment, Identifiers } from '@atlaskit/feature-gate-js-client';
import { AnalyticsClientMapper, EventBuilderInterface } from './analytics';
import { Features } from './features';

export type FeatureFlagClientOptions = {
    analyticsClient: AnalyticsClient;
    eventBuilder: EventBuilderInterface;
    identifiers: Identifiers;
};

export class FeatureFlagClient {
    private static analyticsClient: AnalyticsClientMapper;
    private static eventBuilder: EventBuilderInterface;

    public static async initialize(options: FeatureFlagClientOptions): Promise<void> {
        const targetApp = process.env.ATLASCODE_FX3_TARGET_APP || '';
        const environment =
            (process.env.ATLASCODE_FX3_ENVIRONMENT as FeatureGateEnvironment) || FeatureGateEnvironment.Production;

        console.log(`FeatureGates: initializing, target: ${targetApp}, environment: ${environment}`);
        this.analyticsClient = new AnalyticsClientMapper(options.analyticsClient, options.identifiers);
        this.eventBuilder = options.eventBuilder;

        return FeatureGates.initialize(
            {
                apiKey: process.env.ATLASCODE_FX3_API_KEY || '',
                environment,
                targetApp,
                fetchTimeoutMs: Number.parseInt(process.env.ATLASCODE_FX3_TIMEOUT || '2000'),
                analyticsWebClient: Promise.resolve(this.analyticsClient),
            },
            options.identifiers,
        )
            .then(() => {
                console.log(`FeatureGates: client initialized!`);
                this.eventBuilder.featureFlagClientInitializedEvent().then((e) => {
                    options.analyticsClient.sendTrackEvent(e);
                });
            })
            .then(() => {
                // console log all feature gates and values 
                for (const feat of Object.values(Features)) {
                    console.log(`FeatureGates: ${feat} -> ${FeatureGates.checkGate(feat)}`);
                }
            })
            .catch((err) => {
                console.warn(`FeatureGates: Failed to initialize client. ${err}`);
                console.warn('FeatureGates: Disabling feature flags');
                this.eventBuilder
                    .featureFlagClientInitializationFailedEvent()
                    .then((e) => options.analyticsClient.sendTrackEvent(e));
            });
    }

    public static checkGate(gate: string) {
        var gateValue = false
        if( FeatureGates == null) {
            console.warn('FeatureGates: FeatureGates is not initialized. Defaulting to False');
        } else {
            // FeatureGates.checkGate returns false if any errors
            gateValue = FeatureGates.checkGate(gate); 
        }
        console.log(`FeatureGates: ${gate} -> ${gateValue}`);
        return gateValue;
    }

    public static async evaluateFeatures() {
        const featureFlags = await Promise.all(
            Object.values(Features).map(async (feature) => {
                return {
                    [feature]: await this.checkGate(feature),
                };
            }),
        );

        return featureFlags.reduce((acc, val) => ({ ...acc, ...val }), {});
    }
}
