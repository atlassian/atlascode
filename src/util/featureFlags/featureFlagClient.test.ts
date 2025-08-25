const MockedFeatureGates_Features: Record<any, boolean> = {
    'some-very-real-feature': true,
    'another-very-real-feature': true,
};

const MockExperimentGates: Record<string, any> = {
    'some-very-real-experiment': {
        parameter: 'isEnabled',
        defaultValue: 'a default value',
    },
    'another-exp-name': {
        parameter: 'isEnabled',
        defaultValue: 'another default value',
    },
};

jest.mock('./features', () => {
    return {
        ExperimentGates: MockExperimentGates,
    };
});

let mockClient = {
    initialize: () => Promise.resolve(),
    initializeCompleted: () => false,
    checkGate: (key: any) => false,
    getExperimentValue: (key: any, _arg: any, _arg2: any) => MockExperimentGates[key]?.defaultValue,
    updateUser: () => Promise.resolve(),
    shutdownStatsig: () => {},
};
jest.mock('./utils', () => {
    return {
        FeatureGateClient: jest.fn(() => mockClient),
    };
});

import { Identifiers } from '@atlaskit/feature-gate-js-client';
import { it } from '@jest/globals';
import { forceCastTo } from 'testsutil';

import { ClientInitializedErrorType } from '../../analytics';
import { FeatureFlagClient, FeatureFlagClientInitError } from './featureFlagClient';
import { Experiments, Features } from './features';

describe('FeatureFlagClient', () => {
    let options: Identifiers;
    const originalEnv = process.env;

    let featureFlagClient: FeatureFlagClient;

    beforeEach(() => {
        options = {
            analyticsAnonymousId: 'some-id',
        };
        process.env = {
            ...originalEnv,
            ATLASCODE_FX3_TARGET_APP: 'some-app',
            ATLASCODE_FX3_API_KEY: 'some-key',
            ATLASCODE_FX3_ENVIRONMENT: 'Production',
            ATLASCODE_FX3_TIMEOUT: '2000',
            ATLASCODE_FF_OVERRIDES: undefined,
            ATLASCODE_EXP_OVERRIDES_BOOL: undefined,
            ATLASCODE_EXP_OVERRIDES_STRING: undefined,
        };

        FeatureFlagClient['singleton'] = undefined;
        featureFlagClient = FeatureFlagClient.getInstance();
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    describe('initialize', () => {
        it('should initialize the feature flag client', async () => {
            jest.spyOn(mockClient, 'initialize');

            await featureFlagClient.initialize(options);
            expect(mockClient.initialize).toHaveBeenCalled();
        });

        it('should catch an error when the feature flag client fails to initialize', async () => {
            jest.spyOn(mockClient, 'initialize').mockRejectedValue('error');

            let error: FeatureFlagClientInitError = undefined!;

            try {
                await featureFlagClient.initialize(options);
            } catch (err) {
                error = err;
            }

            expect(mockClient.initialize).toHaveBeenCalled();
            expect(error).toBeDefined();
            expect(error.errorType).toBe(ClientInitializedErrorType.Failed);
        });

        it("should catch an error when the feature flag client doesn't have the FX3 data", async () => {
            jest.spyOn(mockClient, 'initialize');
            process.env.ATLASCODE_FX3_API_KEY = '';

            let error: FeatureFlagClientInitError = undefined!;

            try {
                await featureFlagClient.initialize(options);
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errorType).toBe(ClientInitializedErrorType.Skipped);
            expect(mockClient.initialize).not.toHaveBeenCalled();
        });

        it("should catch an error when the analyticsAnonymousId isn't set", async () => {
            jest.spyOn(mockClient, 'initialize');
            options.analyticsAnonymousId = '';

            let error: FeatureFlagClientInitError = undefined!;

            try {
                await featureFlagClient.initialize(options);
            } catch (err) {
                error = err;
            }

            expect(mockClient.initialize).not.toHaveBeenCalled();
            expect(error).toBeDefined();
            expect(error.errorType).toBe(ClientInitializedErrorType.IdMissing);
        });

        it('checkGate returns what FeatureGates returns', async () => {
            await featureFlagClient.initialize(options);

            const mockedCheckGate = (name: string) => MockedFeatureGates_Features[name] ?? false;

            jest.spyOn(mockClient, 'initializeCompleted').mockReturnValue(true);
            jest.spyOn(mockClient, 'checkGate').mockImplementation(mockedCheckGate);

            expect(featureFlagClient.checkGate(forceCastTo<Features>('some-very-real-feature'))).toBeTruthy();
            expect(featureFlagClient.checkGate(forceCastTo<Features>('another-very-real-feature'))).toBeTruthy();
            expect(featureFlagClient.checkGate(forceCastTo<Features>('some-fake-feature'))).toBeFalsy();
        });

        it('if FeatureGates is not initialized, checkGate always returns false', async () => {
            await featureFlagClient.initialize(options);

            jest.spyOn(mockClient, 'initializeCompleted').mockReturnValue(false);
            jest.spyOn(mockClient, 'checkGate');

            expect(featureFlagClient.checkGate(forceCastTo<Features>('some-very-real-feature'))).toBeFalsy();
            expect(featureFlagClient.checkGate(forceCastTo<Features>('another-very-real-feature'))).toBeFalsy();
            expect(featureFlagClient.checkGate(forceCastTo<Features>('some-fake-feature'))).toBeFalsy();

            expect(mockClient.checkGate).not.toHaveBeenCalled();
        });

        it('checkExperimentValue returns what FeatureGates returns', async () => {
            await featureFlagClient.initialize(options);

            const mockedGetExperimentValue = (name: string, param: string, defaultValue: any) => {
                const expData = MockExperimentGates[name];
                if (!expData || expData.parameter !== param) {
                    return undefined;
                }
                return 'returned value';
            };

            jest.spyOn(mockClient, 'initializeCompleted').mockReturnValue(true);
            jest.spyOn(mockClient, 'getExperimentValue').mockImplementation(mockedGetExperimentValue);

            expect(featureFlagClient.checkExperimentValue(forceCastTo<Experiments>('some-very-real-experiment'))).toBe(
                'returned value',
            );
            expect(featureFlagClient.checkExperimentValue(forceCastTo<Experiments>('another-exp-name'))).toBe(
                'returned value',
            );
            expect(
                featureFlagClient.checkExperimentValue(forceCastTo<Experiments>('one-more-exp-name')),
            ).toBeUndefined();
        });

        it('if FeatureGates is not initialized, getExperimentValue returns the default value', async () => {
            await featureFlagClient.initialize(options);

            jest.spyOn(mockClient, 'initializeCompleted').mockReturnValue(false);
            jest.spyOn(mockClient, 'getExperimentValue');

            expect(featureFlagClient.checkExperimentValue(forceCastTo<Experiments>('some-very-real-experiment'))).toBe(
                'a default value',
            );
            expect(featureFlagClient.checkExperimentValue(forceCastTo<Experiments>('another-exp-name'))).toBe(
                'another default value',
            );
            expect(
                featureFlagClient.checkExperimentValue(forceCastTo<Experiments>('one-more-exp-name')),
            ).toBeUndefined();

            expect(mockClient.getExperimentValue).not.toHaveBeenCalled();
        });
    });

    describe('updateUser', () => {
        beforeEach(async () => {
            await featureFlagClient.initialize(options);
            jest.spyOn(featureFlagClient as any, 'isInitialized').mockReturnValue(true);
        });

        it('should update user only when the tenant changes', async () => {
            // after initialization, the client in use is the 'basic' client without tenantId information
            const baseClient = featureFlagClient['client'];

            // prevents (new FeatureGateClient()) to return the same object
            mockClient = { ...mockClient };

            // updates the user with tenantId='tenant-1'
            await featureFlagClient.updateUser({ tenantId: 'tenant-1' });
            // now the client in use should be the one with tenantId='tenant-1'
            expect(featureFlagClient['client']).not.toBe(baseClient);

            // prevents (new FeatureGateClient()) to return the same object
            mockClient = { ...mockClient };

            const tenant1Client = featureFlagClient['client'];

            // updates the user (again) with tenantId='tenant-1'
            await featureFlagClient.updateUser({ tenantId: 'tenant-1' });
            // the client in use hasn't changed
            expect(featureFlagClient['client']).toBe(tenant1Client);

            // prevents (new FeatureGateClient()) to return the same object
            mockClient = { ...mockClient };

            // updates the user with tenantId='tenant-2'
            await featureFlagClient.updateUser({ tenantId: 'tenant-2' });
            // the client in use is now different than both the base client, and the tenant1 client
            expect(featureFlagClient['client']).not.toBe(tenant1Client);
            expect(featureFlagClient['client']).not.toBe(baseClient);

            // prevents (new FeatureGateClient()) to return the same object
            mockClient = { ...mockClient };

            // updates the user with no tenantId anymore
            await featureFlagClient.updateUser({ tenantId: undefined });
            // the client in use is now the base client again
            expect(featureFlagClient['client']).toBe(baseClient);
        });

        it('should throw an error if initializeWithRetry fails', async () => {
            jest.spyOn(featureFlagClient as any, 'initializeWithRetry').mockRejectedValue(new Error('failz'));
            await expect(featureFlagClient.updateUser({ tenantId: 'tenant-4' })).rejects.toThrow('failz');
        });
    });

    describe('overrides', () => {
        it('if overrides are set, checkGate returns the overridden value', async () => {
            process.env.ATLASCODE_FF_OVERRIDES = `another-very-real-feature=false`;

            FeatureFlagClient['singleton'] = undefined;
            featureFlagClient = FeatureFlagClient.getInstance();
            await featureFlagClient.initialize(options);

            const mockedCheckGate = (name: string) => MockedFeatureGates_Features[name] ?? false;

            jest.spyOn(mockClient, 'initializeCompleted').mockReturnValue(true);
            jest.spyOn(mockClient, 'checkGate').mockImplementation(mockedCheckGate);

            expect(featureFlagClient.checkGate(forceCastTo<Features>('some-very-real-feature'))).toBeTruthy();
            expect(featureFlagClient.checkGate(forceCastTo<Features>('another-very-real-feature'))).toBeFalsy();
            expect(featureFlagClient.checkGate(forceCastTo<Features>('some-fake-feature'))).toBeFalsy();
        });

        it('if overrides are set, getExperimentValue returns the overridden value', async () => {
            process.env.ATLASCODE_EXP_OVERRIDES_STRING = `another-exp-name=another value`;

            FeatureFlagClient['singleton'] = undefined;
            featureFlagClient = FeatureFlagClient.getInstance();
            await featureFlagClient.initialize(options);

            const mockedGetExperimentValue = (name: string, param: string, defaultValue: any) => {
                const expData = MockExperimentGates[name];
                if (!expData || expData.parameter !== param) {
                    return undefined;
                }
                return 'returned value';
            };

            jest.spyOn(mockClient, 'initializeCompleted').mockReturnValue(true);
            jest.spyOn(mockClient, 'getExperimentValue').mockImplementation(mockedGetExperimentValue);

            expect(featureFlagClient.checkExperimentValue(forceCastTo<Experiments>('some-very-real-experiment'))).toBe(
                'returned value',
            );
            expect(featureFlagClient.checkExperimentValue(forceCastTo<Experiments>('another-exp-name'))).toBe(
                'another value',
            );
            expect(
                featureFlagClient.checkExperimentValue(forceCastTo<Experiments>('one-more-exp-name')),
            ).toBeUndefined();
        });
    });
});
