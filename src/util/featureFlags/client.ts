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
        const targetApp = process.env.ATLASCODE_FX3_TARGET_APP;
        const environment = process.env.ATLASCODE_FX3_ENVIRONMENT as FeatureGateEnvironment;
        const apiKey = process.env.ATLASCODE_FX3_API_KEY;
        const timeout = process.env.ATLASCODE_FX3_TIMEOUT;

        if (!targetApp || !environment || !apiKey || !timeout) {
            this._featureGates = this.evaluateFeatures();
            this._experimentValues = this.evaluateExperiments();
            return;
        }

        console.log(`FeatureGates: initializing, target: ${targetApp}, environment: ${environment}`);
        this.analyticsClient = new AnalyticsClientMapper(options.analyticsClient, options.identifiers);
        this.eventBuilder = options.eventBuilder;

        await FeatureGates.initialize(
            {
                apiKey,
                environment,
                targetApp,
                fetchTimeoutMs: Number.parseInt(timeout),
                analyticsWebClient: Promise.resolve(this.analyticsClient),
            },
            options.identifiers,
        )
            .then(() => {
                console.log(`FeatureGates: client initialized!`);
                this.eventBuilder.featureFlagClientInitializedEvent().then((e) => {
                    options.analyticsClient.sendTrackEvent(e);
                });

                // console log all feature gates and values
                for (const feat of Object.values(Features)) {
                    console.log(`FeatureGates: ${feat} -> ${FeatureGates.checkGate(feat)}`);
                }
            })
            .catch((err) => {
                console.warn(`FeatureGates: Failed to initialize client. ${err}`);
                this.eventBuilder
                    .featureFlagClientInitializationFailedEvent()
                    .then((e) => options.analyticsClient.sendTrackEvent(e));
            })
            .finally(() => {
                this._featureGates = this.evaluateFeatures();
                this._experimentValues = this.evaluateExperiments();
            });
    }

    private static checkGate(gate: Features): boolean {
        let gateValue = false;
        if (!FeatureGates) {
            console.warn('FeatureGates: FeatureGates is not initialized. Defaulting to False');
        } else {
            // FeatureGates.checkGate returns false if any errors
            gateValue = FeatureGates.checkGate(gate);
        }
        console.log(`FeatureGates: ${gate} -> ${gateValue}`);
        return gateValue;
    }

    private static checkExperimentValue(experiment: Experiments): any {
        const experimentGate = ExperimentGates[experiment];
        if (!experimentGate) {
            return undefined;
        }

        let gateValue = experimentGate.defaultValue;
        if (!FeatureGates) {
            console.warn(`FeatureGates: FeatureGates is not initialized. Returning default value: ${gateValue}`);
        } else {
            gateValue = FeatureGates.getExperimentValue(
                experiment,
                experimentGate.parameter,
                experimentGate.defaultValue,
            );
        }
        console.log(`ExperimentGateValue: ${experiment} -> ${gateValue}`);
        return gateValue;
    }

    private static evaluateFeatures(): FeatureGateValues {
        const featureFlags = Object.values(Features).map(async (feature) => {
            return {
                [feature]: this.checkGate(feature),
            };
        });

        return featureFlags.reduce((acc, val) => ({ ...acc, ...val }), {}) as FeatureGateValues;
    }

    private static evaluateExperiments(): ExperimentGateValues {
        const experimentGates = Object.values(Experiments).map(async (experiment) => {
            return {
                [experiment]: this.checkExperimentValue(experiment),
            };
        });

        return experimentGates.reduce((acc, val) => ({ ...acc, ...val }), {}) as ExperimentGateValues;
    }

    static dispose() {
        FeatureGates.shutdownStatsig();
    }
}
