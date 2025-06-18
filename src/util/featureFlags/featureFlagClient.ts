import FeatureGates, { ClientOptions, FeatureGateEnvironment, Identifiers } from '@atlaskit/feature-gate-js-client';
import { NewFeatureGateOptions } from '@atlaskit/feature-gate-js-client/dist/types/client/types';

import { ClientInitializedErrorType } from '../../analytics';
import { AnalyticsClient } from '../../analytics-node-client/src/client.min';
import { Logger } from '../../logger';
import { ExperimentGates, ExperimentGateValues, Experiments, FeatureGateValues, Features } from './features';

export type FeatureFlagClientOptions = {
    analyticsClient: AnalyticsClient;
    identifiers: Identifiers;
};

type Options = ClientOptions & Omit<NewFeatureGateOptions, keyof ClientOptions>;
export class FeatureFlagClientInitError {
    constructor(
        public errorType: ClientInitializedErrorType,
        public reason: string,
    ) {}
}

export abstract class FeatureFlagClient {
    private static featureGateOverrides: FeatureGateValues;
    private static experimentValueOverride: ExperimentGateValues;

    public static async initialize(options: FeatureFlagClientOptions): Promise<void> {
        this.initializeOverrides();

        const targetApp = process.env.ATLASCODE_FX3_TARGET_APP;
        const environment = process.env.ATLASCODE_FX3_ENVIRONMENT as FeatureGateEnvironment;
        const apiKey = process.env.ATLASCODE_FX3_API_KEY;
        const timeout = process.env.ATLASCODE_FX3_TIMEOUT;

        if (!targetApp || !environment || !apiKey || !timeout) {
            return Promise.reject(
                new FeatureFlagClientInitError(ClientInitializedErrorType.Skipped, 'env data not set'),
            );
        }

        if (!options.identifiers.analyticsAnonymousId) {
            return Promise.reject(
                new FeatureFlagClientInitError(ClientInitializedErrorType.IdMissing, 'analyticsAnonymousId not set'),
            );
        }

        Logger.debug(`FeatureGates: initializing, target: ${targetApp}, environment: ${environment}`);

        // disable StatSig logging exposure when running in GitHub
        const loggingEnabled = !!process.env.ATLASCODE_NO_EXP ? 'disabled' : 'always';

        const clientOptions: Options = {
            apiKey,
            environment,
            targetApp,
            fetchTimeoutMs: Number.parseInt(timeout),
            loggingEnabled,
            ignoreWindowUndefined: true,
        };

        try {
            await FeatureGates.initialize(clientOptions, options.identifiers);
        } catch (err) {
            return Promise.reject(new FeatureFlagClientInitError(ClientInitializedErrorType.Failed, err));
        }
    }

    private static initializeOverrides(): void {
        this.featureGateOverrides = {} as FeatureGateValues;
        this.experimentValueOverride = {} as ExperimentGateValues;

        const ffSplit = (process.env.ATLASCODE_FF_OVERRIDES || '')
            .split(',')
            .map(this.parseBoolOverride<Features>)
            .filter((x) => !!x);

        for (const { key, value } of ffSplit) {
            this.featureGateOverrides[key] = value;
        }

        const boolExpSplit = (process.env.ATLASCODE_EXP_OVERRIDES_BOOL || '')
            .split(',')
            .map(this.parseBoolOverride<Experiments>)
            .filter((x) => !!x);

        for (const { key, value } of boolExpSplit) {
            this.experimentValueOverride[key] = value;
        }

        const strExpSplit = (process.env.ATLASCODE_EXP_OVERRIDES_STRING || '')
            .split(',')
            .map(this.parseStringOverride)
            .filter((x) => !!x);

        for (const { key, value } of strExpSplit) {
            this.experimentValueOverride[key] = value;
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

    public static isInitialized(): boolean {
        return FeatureGates.initializeCompleted();
    }

    public static checkGate(gate: Features): boolean {
        if (this.featureGateOverrides.hasOwnProperty(gate)) {
            return this.featureGateOverrides[gate];
        }

        let gateValue = false;
        if (this.isInitialized()) {
            // FeatureGates.checkGate returns false if any errors
            gateValue = FeatureGates.checkGate(gate);
        }

        // in GitHub pipeline, we always fail the gate check
        if (process.env.ATLASCODE_NO_EXP) {
            return false;
        }

        Logger.debug(`FeatureGates ${gate} -> ${gateValue}`);
        return gateValue;
    }

    public static checkExperimentValue(experiment: Experiments): any {
        // unknown experiment name
        if (!ExperimentGates.hasOwnProperty(experiment)) {
            return undefined;
        }

        if (this.experimentValueOverride.hasOwnProperty(experiment)) {
            return this.experimentValueOverride[experiment];
        }

        const experimentGate = ExperimentGates[experiment];
        let gateValue = experimentGate.defaultValue;
        if (this.isInitialized()) {
            gateValue = FeatureGates.getExperimentValue(
                experiment,
                experimentGate.parameter,
                experimentGate.defaultValue,
            );
        }

        // in GitHub pipeline, we always pretend we are not part of the experiment
        if (process.env.ATLASCODE_NO_EXP) {
            return experimentGate.defaultValue;
        }

        Logger.debug(`Experiment ${experiment} -> ${gateValue}`);
        return gateValue;
    }

    public static dispose() {
        FeatureGates.shutdownStatsig();
    }
}
