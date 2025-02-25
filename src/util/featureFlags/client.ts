import { AnalyticsClient } from '../../analytics-node-client/src/client.min';

import FeatureGates, { FeatureGateEnvironment, Identifiers } from '@atlaskit/feature-gate-js-client';
import { AnalyticsClientMapper, EventBuilderInterface } from './analytics';
import { ExperimentGates, ExperimentGateValues, Experiments, FeatureGateValues, Features } from './features';

export type FeatureFlagClientOptions = {
    analyticsClient: AnalyticsClient;
    eventBuilder: EventBuilderInterface;
    identifiers: Identifiers;
};

export class FeatureFlagClient {
    private static analyticsClient: AnalyticsClientMapper;
    private static eventBuilder: EventBuilderInterface;
    private static _featureGates: FeatureGateValues;
    static get featureGates(): FeatureGateValues {
        return this._featureGates;
    }

    private static _experimentValues: ExperimentGateValues;
    static get experimentValues(): ExperimentGateValues {
        return this._experimentValues;
    }

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
            .then(async () => {
                this._featureGates = await this.evaluateFeatures();
                this._experimentValues = await this.evaluateExperiments();
            })
            .catch((err) => {
                console.warn(`FeatureGates: Failed to initialize client. ${err}`);
                console.warn('FeatureGates: Disabling feature flags');
                this.eventBuilder
                    .featureFlagClientInitializationFailedEvent()
                    .then((e) => options.analyticsClient.sendTrackEvent(e));
            });
    }

    public static checkGate(gate: string): boolean {
        let gateValue = false;
        if (FeatureGates === null) {
            console.warn('FeatureGates: FeatureGates is not initialized. Defaulting to False');
        } else {
            // FeatureGates.checkGate returns false if any errors
            gateValue = FeatureGates.checkGate(gate);
        }
        console.log(`FeatureGates: ${gate} -> ${gateValue}`);
        return gateValue;
    }

    public static checkExperimentValue(experiment: string): any {
        let gateValue: any;
        const experimentGate = ExperimentGates[experiment];
        if (!experimentGate) {
            return undefined;
        }
        if (FeatureGates === null) {
            console.warn(
                `FeatureGates: FeatureGates is not initialized. Returning default value: ${experimentGate.defaultValue}`,
            );
            gateValue = experimentGate.defaultValue;
        } else {
            gateValue = FeatureGates.getExperimentValue(
                experimentGate.gate,
                experimentGate.parameter,
                experimentGate.defaultValue,
            );
        }
        console.log(`ExperimentGateValue: ${experiment} -> ${gateValue}`);
        return gateValue;
    }

    public static async evaluateFeatures() {
        const featureFlags = await Promise.all(
            Object.values(Features).map(async (feature) => {
                return {
                    // eslint-disable-next-line @typescript-eslint/await-thenable
                    [feature]: await this.checkGate(feature),
                };
            }),
        );

        return featureFlags.reduce((acc, val) => ({ ...acc, ...val }), {});
    }

    public static async evaluateExperiments() {
        const experimentGates = await Promise.all(
            Object.values(Experiments).map(async (experiment) => {
                return {
                    [experiment]: await this.checkExperimentValue(experiment),
                };
            }),
        );

        return experimentGates.reduce((acc, val) => ({ ...acc, ...val }), {});
    }

    static dispose() {
        FeatureGates.shutdownStatsig();
    }
}
