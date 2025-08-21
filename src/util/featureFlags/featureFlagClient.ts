import { ClientOptions, FeatureGateEnvironment, Identifiers } from '@atlaskit/feature-gate-js-client';
import { FetcherOptions } from '@atlaskit/feature-gate-js-client/dist/types/client/fetcher';
import { NewFeatureGateOptions } from '@atlaskit/feature-gate-js-client/dist/types/client/types';

import { ClientInitializedErrorType } from '../../analytics';
import { AnalyticsClient } from '../../analytics-node-client/src/client.min';
import { Logger } from '../../logger';
import { ExperimentGates, ExperimentGateValues, Experiments, FeatureGateValues, Features } from './features';
import { FeatureGateClient } from './utils';

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

const INIT_RETRY_COUNT = 5;

export abstract class FeatureFlagClient {
    private static featureGateOverrides: FeatureGateValues;
    private static experimentValueOverride: ExperimentGateValues;
    private static options?: FeatureFlagClientOptions;

    private static isExperimentationDisabled = false;

    // TODO: rework this implementation to not be static
    // - now that we're no longer using a static FG client
    private static client?: FeatureGateClient = undefined;

    private static async buildClientOptions(): Promise<FetcherOptions> {
        if (!this.options) {
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

    /**
     * Workaround to account for a TLS-related ECONNRESET that sometimes occurs in undici
     * when node attempts a naked `fetch`. The regular static client implementation of
     * FeatureGates doesn't let us reset the state fully - hence the odd logic here
     * where we re-initialize the client from scratch
     */
    private static async initializeWithRetry(
        clientOptions: FetcherOptions,
        identifiers: Identifiers,
        maxRetries: number = INIT_RETRY_COUNT,
    ): Promise<FeatureGateClient> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const client = new FeatureGateClient();
                await client.initialize(clientOptions, identifiers);
                return client;
            } catch (err) {
                if (i < maxRetries - 1) {
                    Logger.info(
                        `FeatureFlagClient: Retrying reinitialization (${maxRetries - i - 1} retries left). Reason: ${err}`,
                    );
                }
            }
        }
        return Promise.reject(
            new FeatureFlagClientInitError(ClientInitializedErrorType.Failed, 'FeatureFlagClient: Max retries reached'),
        );
    }

    public static async initialize(options: FeatureFlagClientOptions): Promise<void> {
        if (!options.identifiers.analyticsAnonymousId) {
            return Promise.reject(
                new FeatureFlagClientInitError(ClientInitializedErrorType.IdMissing, 'analyticsAnonymousId not set'),
            );
        }

        this.options = options;
        this.initializeOverrides();

        const clientOptions = await this.buildClientOptions();

        Logger.debug(
            `FeatureGates: initializing, target: ${clientOptions.targetApp}, environment: ${clientOptions.environment}`,
        );
        try {
            this.client = await this.initializeWithRetry(clientOptions, options.identifiers);
        } catch (err) {
            return Promise.reject(new FeatureFlagClientInitError(ClientInitializedErrorType.Failed, err));
        }
    }

    public static async updateUser({ tenantId }: { tenantId?: string }): Promise<void> {
        if (!this.client || !this.options) {
            Logger.error(new Error('FeatureFlagClient not initialized'));
            return;
        }

        if (tenantId === this.options.identifiers.tenantId) {
            // no change needed, avoid unnecessary updates
            return;
        }

        // FeatureGates stores the identifiers object and uses it in comparison down the line
        // hence we use a copy instead of modifying the original here
        this.options.identifiers = {
            ...this.options.identifiers,
            tenantId,
        };

        const clientOptions = await this.buildClientOptions();

        try {
            await this.client.updateUser(clientOptions, this.options.identifiers);
            return;
        } catch (e) {
            Logger.error(new Error(`FeatureFlagClient: Failed to update user: ${e}`));
        }

        // Attempt to re-initialize with the new identifiers
        try {
            this.client = await this.initializeWithRetry(clientOptions, this.options.identifiers);
        } catch (err) {
            Logger.error(err, 'FeatureFlagClient: Failed to re-initialize');
        }

        // TODO: maybe we need some fallback to asynchronously re-initialize the client with back-off here?
        // Leaving this for the next iteration
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
        return this.client !== undefined && !this.isExperimentationDisabled && this.client.initializeCompleted();
    }

    public static checkGate(gate: Features): boolean {
        if (this.featureGateOverrides.hasOwnProperty(gate)) {
            return this.featureGateOverrides[gate];
        }

        let gateValue = false;
        if (this.client && this.isInitialized()) {
            // FeatureGates.checkGate returns false if any errors
            gateValue = this.client.checkGate(gate);
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
        if (this.client && this.isInitialized()) {
            gateValue = this.client.getExperimentValue(
                experiment,
                experimentGate.parameter,
                experimentGate.defaultValue,
            );
        }

        Logger.debug(`Experiment ${experiment} -> ${gateValue}`);
        return gateValue;
    }

    public static dispose() {
        this.client?.shutdownStatsig();
    }
}
