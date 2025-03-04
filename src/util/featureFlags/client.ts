import FeatureGates, { FeatureGateEnvironment, Identifiers } from '@atlaskit/feature-gate-js-client';
import { AnalyticsClient } from '../../analytics-node-client/src/client.min';
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
            this.finalizeInit();
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
            })
            .catch((err) => {
                console.warn(`FeatureGates: Failed to initialize client. ${err}`);
                this.eventBuilder
                    .featureFlagClientInitializationFailedEvent()
                    .then((e) => options.analyticsClient.sendTrackEvent(e));
            })
            .finally(() => {
                this.finalizeInit();

                // console log all feature gates and values
                for (const feat of Object.values(Features)) {
                    console.log(`FeatureGates: ${feat} -> ${FeatureGates.checkGate(feat)}`);
                }
            });
    }

    private static finalizeInit(): void {
        this._featureGates = this.evaluateFeatures();
        this._experimentValues = this.evaluateExperiments();

        const ffSplit = (process.env.ATLASCODE_FF_OVERRIDES || '')
            .split(',')
            .map(this.parseBoolOverride<Features>)
            .filter((x) => !!x);
        for (const { key, value } of ffSplit) {
            this._featureGates[key] = value;
        }

        const boolExpSplit = (process.env.ATLASCODE_EXP_OVERRIDES_BOOL || '')
            .split(',')
            .map(this.parseBoolOverride<Experiments>)
            .filter((x) => !!x);
        for (const { key, value } of boolExpSplit) {
            this._experimentValues[key] = value;
        }

        const strExpSplit = (process.env.ATLASCODE_EXP_OVERRIDES_STRING || '')
            .split(',')
            .map(this.parseStringOverride)
            .filter((x) => !!x);
        for (const { key, value } of strExpSplit) {
            this._experimentValues[key] = value;
        }
    }

    private static parseBoolOverride<T>(setting: string): { key: T; value: boolean } | undefined {
        const [key, valueRaw] = setting
            .trim()
            .split('=', 2)
            .map((x) => x.trim());
        if (key) {
            const value = valueRaw.toLowerCase() === 'true';
            return { key: key as T, value };
        } else {
            return undefined;
        }
    }

    private static parseStringOverride(setting: string): { key: Experiments; value: string } | undefined {
        const [key, value] = setting
            .trim()
            .split('=', 2)
            .map((x) => x.trim());
        if (key) {
            return { key: key as Experiments, value };
        } else {
            return undefined;
        }
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
        const featureFlags = {} as FeatureGateValues;
        Object.values(Features).forEach((feature) => (featureFlags[feature] = this.checkGate(feature)));
        return featureFlags;
    }

    private static evaluateExperiments(): ExperimentGateValues {
        const experimentGates = {} as ExperimentGateValues;
        Object.values(Experiments).forEach((exp) => (experimentGates[exp] = this.checkExperimentValue(exp)));
        return experimentGates;
    }

    static dispose() {
        FeatureGates.shutdownStatsig();
    }
}
