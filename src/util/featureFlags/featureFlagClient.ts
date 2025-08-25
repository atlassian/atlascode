import { ClientOptions, FeatureGateEnvironment, Identifiers } from '@atlaskit/feature-gate-js-client';
import { FetcherOptions } from '@atlaskit/feature-gate-js-client/dist/types/client/fetcher';
import { NewFeatureGateOptions } from '@atlaskit/feature-gate-js-client/dist/types/client/types';

import { ClientInitializedErrorType } from '../../analytics';
import { Logger } from '../../logger';
import { ExperimentGates, ExperimentGateValues, Experiments, FeatureGateValues, Features } from './features';
import { FeatureGateClient } from './utils';

type NewFetcherOptions = FetcherOptions &
    Pick<NewFeatureGateOptions, 'loggingEnabled'> &
    Pick<ClientOptions, 'ignoreWindowUndefined'>;

export class FeatureFlagClientInitError extends Error {
    constructor(
        public errorType: ClientInitializedErrorType,
        message: string,
    ) {
        super(message);
    }
}

export enum PerimeterType {
    COMMERCIAL = 'commercial',
}

const INIT_RETRY_COUNT = 5;

export class FeatureFlagClient {
    private static singleton: FeatureFlagClient | undefined;
    public static getInstance() {
        if (!this.singleton) {
            this.singleton = new FeatureFlagClient();
        }
        return this.singleton;
    }

    private readonly featureGateOverrides: FeatureGateValues;
    private readonly experimentValueOverride: ExperimentGateValues;
    private readonly isExperimentationDisabled: boolean;

    /* We keep two clients:
     * - a static base client that only tracks the user's anonoymous id
     * - a variable tenant client that tracks the user's association with their tenant
     * The former is used as a fallback for every time the latter is not available
     */
    private clientBasic?: FeatureGateClient;
    private clientWithTenant?: FeatureGateClient;

    private clientOptions: NewFetcherOptions = {} as any;
    private identifiers: Identifiers = {};
    private tenantId?: string;

    // for debugging purposes, to ensure initialized is called only once
    private initializedCalled = false;

    /** Gets the currently active feature flag client */
    private get client() {
        return this.clientWithTenant ?? this.clientBasic;
    }

    private constructor() {
        this.isExperimentationDisabled = !!process.env.ATLASCODE_NO_EXP;

        this.featureGateOverrides = {} as FeatureGateValues;
        this.experimentValueOverride = {} as ExperimentGateValues;
        this.initializeOverrides();
    }

    /**
     * Workaround to account for a TLS-related ECONNRESET that sometimes occurs in undici
     * when node attempts a naked `fetch`. The regular static client implementation of
     * FeatureGates doesn't let us reset the state fully - hence the odd logic here
     * where we re-initialize the client from scratch
     */
    private async initializeWithRetry(
        clientOptions: FetcherOptions,
        identifiers: Identifiers,
        retriesLeft: number = INIT_RETRY_COUNT,
    ): Promise<FeatureGateClient> {
        // at least it should try one time
        if (retriesLeft < 1) {
            retriesLeft = 1;
        }

        while (--retriesLeft >= 0) {
            try {
                const client = new FeatureGateClient();
                await client.initialize(clientOptions, identifiers);
                return client;
            } catch (err) {
                if (retriesLeft) {
                    Logger.info(
                        `FeatureFlagClient: Retrying reinitialization (${retriesLeft} retries left). Reason: ${err}`,
                    );
                } else {
                    const errorMessage = typeof err === 'string' ? err : err.message;
                    throw new FeatureFlagClientInitError(ClientInitializedErrorType.Failed, errorMessage);
                }
            }
        }

        throw new Error('This line is supposed to be unreachable.');
    }

    public async initialize(identifiers: Omit<Identifiers, 'tenantId'>): Promise<void> {
        if (this.initializedCalled) {
            throw new FeatureFlagClientInitError(
                ClientInitializedErrorType.Failed,
                'FeatureFlagClient already initialized',
            );
        }

        if (!identifiers.analyticsAnonymousId) {
            throw new FeatureFlagClientInitError(ClientInitializedErrorType.IdMissing, 'analyticsAnonymousId not set');
        }

        const targetApp = process.env.ATLASCODE_FX3_TARGET_APP;
        const environment = process.env.ATLASCODE_FX3_ENVIRONMENT as FeatureGateEnvironment;
        const apiKey = process.env.ATLASCODE_FX3_API_KEY;
        const timeout = process.env.ATLASCODE_FX3_TIMEOUT;

        if (!targetApp || !environment || !apiKey || !timeout) {
            throw new FeatureFlagClientInitError(ClientInitializedErrorType.Skipped, 'env data not set');
        }

        if (this.isExperimentationDisabled) {
            return;
        }

        this.clientOptions = {
            apiKey,
            environment,
            targetApp,
            fetchTimeoutMs: Number.parseInt(timeout),
            loggingEnabled: 'always',
            perimeter: PerimeterType.COMMERCIAL,
            ignoreWindowUndefined: true,
        };

        this.initializedCalled = true;
        this.identifiers = { ...identifiers };

        Logger.debug(
            `FeatureGates: initializing, target: ${this.clientOptions.targetApp}, environment: ${this.clientOptions.environment}`,
        );

        this.clientBasic = await this.initializeWithRetry(this.clientOptions, this.identifiers);
    }

    public async updateUser({ tenantId }: { tenantId?: string }): Promise<void> {
        if (!this.isInitialized()) {
            return;
        }

        if (!tenantId) {
            this.clientWithTenant?.shutdownStatsig();
            this.clientWithTenant = undefined;
            this.tenantId = undefined;
            return;
        }

        if (tenantId === this.tenantId) {
            // no change needed, avoid unnecessary updates
            return;
        }

        Logger.debug(
            `FeatureGates: initializing for tenant ${tenantId}, target: ${this.clientOptions.targetApp}, environment: ${this.clientOptions.environment}`,
        );

        // FeatureGates stores the identifiers object and uses it in comparison down the line
        // hence we use a copy instead of modifying the original here
        this.tenantId = tenantId;
        const identifiers = {
            ...this.identifiers,
            tenantId,
        };

        this.clientWithTenant?.shutdownStatsig();
        this.clientWithTenant = undefined;
        this.clientWithTenant = await this.initializeWithRetry(this.clientOptions, identifiers);
    }

    private initializeOverrides(): void {
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

    private parseBoolOverride<T>(setting: string): { key: T; value: boolean } | undefined {
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

    private parseStringOverride(setting: string): { key: Experiments; value: string } | undefined {
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

    private isInitialized(): boolean {
        return !!this.client?.initializeCompleted();
    }

    public checkGate(gate: Features): boolean {
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

    public checkExperimentValue(experiment: Experiments): any {
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

    public dispose() {
        this.clientWithTenant?.shutdownStatsig();
        this.clientWithTenant = undefined;
        this.clientBasic?.shutdownStatsig();
        this.clientBasic = undefined;
    }
}
