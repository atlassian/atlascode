import FeatureGates, { ClientOptions, FeatureGateEnvironment, Identifiers } from '@atlaskit/feature-gate-js-client';
import { FetcherOptions } from '@atlaskit/feature-gate-js-client/dist/types/client/fetcher';
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

export enum PerimeterType {
    COMMERCIAL = 'commercial',
}

export abstract class FeatureFlagClient {
    private static featureGateOverrides: FeatureGateValues;
    private static experimentValueOverride: ExperimentGateValues;
    private static identifiers?: Identifiers;

    private static isExperimentationDisabled = false;

    private static async buildClientOptions(): Promise<FetcherOptions> {
        if (!this.identifiers) {
            throw new Error('FeatureFlagClient not initialized');
        }
        this.isExperimentationDisabled = !!process.env.ATLASCODE_NO_EXP;

        const targetApp = process.env.ATLASCODE_FX3_TARGET_APP;
        const environment = process.env.ATLASCODE_FX3_ENVIRONMENT as FeatureGateEnvironment;
        const apiKey = process.env.ATLASCODE_FX3_API_KEY;
        const timeout = process.env.ATLASCODE_FX3_TIMEOUT;

        if (!targetApp || !environment || !apiKey || !timeout) {
            return Promise.reject(
                new FeatureFlagClientInitError(ClientInitializedErrorType.Skipped, 'env data not set'),
            );
        }

        const loggingEnabled = this.isExperimentationDisabled ? 'disabled' : 'always';
        const clientOptions: Options = {
            apiKey,
            environment,
            targetApp,
            fetchTimeoutMs: Number.parseInt(timeout),
            loggingEnabled,
            perimeter: PerimeterType.COMMERCIAL,
            ignoreWindowUndefined: true,
        };

        return clientOptions as any;
    }

    public static async initialize(options: FeatureFlagClientOptions): Promise<void> {
        if (!options.identifiers.analyticsAnonymousId) {
            return Promise.reject(
                new FeatureFlagClientInitError(ClientInitializedErrorType.IdMissing, 'analyticsAnonymousId not set'),
            );
        }

        this.identifiers = options.identifiers;
        this.initializeOverrides();

        const clientOptions = await this.buildClientOptions();

        Logger.debug(
            `FeatureGates: initializing, target: ${clientOptions.targetApp}, environment: ${clientOptions.environment}`,
        );

        try {
            await FeatureGates.initialize(clientOptions, options.identifiers);
        } catch (err) {
            return Promise.reject(new FeatureFlagClientInitError(ClientInitializedErrorType.Failed, err));
        }
    }

    public static async updateUser({ tenantId }: { tenantId?: string }): Promise<void> {
        if (!this.identifiers) {
            Logger.error(new Error('FeatureFlagClient not initialized'));
            return;
        }

        if (tenantId === this.identifiers.tenantId) {
            // no change needed, avoid unnecessary updates
            return;
        }

        // FeatureGates stores the identifiers object and uses it in comparison down the line
        // hence we use a copy instead of modifying the original here
        this.identifiers = {
            ...this.identifiers,
            tenantId,
        };

        const clientOptions = await this.buildClientOptions();

        try {
            await FeatureGates.updateUser(clientOptions, this.identifiers);
        } catch (e) {
            Logger.error(new Error(`FeatureFlagClient: Failed to update user: ${e}`));
        }
    }

    private static initializeOverrides(): void {
        this.featureGateOverrides = {} as FeatureGateValues;
        this.experimentValueOverride = {} as ExperimentGateValues;

        if (process.env.ATLASCODE_FF_OVERRIDES) {
            const ffSplit = (process.env.ATLASCODE_FF_OVERRIDES || '')
                .split(',')
                .map(this.parseBoolOverride<Features>)
                .filter((x) => !!x);

            for (const { key, value } of ffSplit) {
                this.featureGateOverrides[key] = value;
            }
        }

        if (process.env.ATLASCODE_EXP_OVERRIDES_BOOL) {
            const boolExpSplit = (process.env.ATLASCODE_EXP_OVERRIDES_BOOL || '')
                .split(',')
                .map(this.parseBoolOverride<Experiments>)
                .filter((x) => !!x);

            for (const { key, value } of boolExpSplit) {
                this.experimentValueOverride[key] = value;
            }
        }

        if (process.env.ATLASCODE_EXP_OVERRIDES_STRING) {
            const strExpSplit = (process.env.ATLASCODE_EXP_OVERRIDES_STRING || '')
                .split(',')
                .map(this.parseStringOverride)
                .filter((x) => !!x);

            for (const { key, value } of strExpSplit) {
                this.experimentValueOverride[key] = value;
            }
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
        return !this.isExperimentationDisabled && FeatureGates.initializeCompleted();
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

        Logger.debug(`Experiment ${experiment} -> ${gateValue}`);
        return gateValue;
    }

    public static dispose() {
        FeatureGates.shutdownStatsig();
    }
}
