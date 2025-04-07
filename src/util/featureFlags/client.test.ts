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

jest.mock('@atlaskit/feature-gate-js-client', () => {
    return {
        ...jest.requireActual('@atlaskit/feature-gate-js-client'),
        default: {
            initialize: () => Promise.resolve(),
            initializeCompleted: () => false,
            checkGate: () => false,
            getExperimentValue: (key: string) => MockExperimentGates[key].defaultValue,
        },
    };
});

import FeatureGates from '@atlaskit/feature-gate-js-client';

import { forceCastTo } from '../../../testsutil';
import { ClientInitializedErrorType } from '../../analytics';
import { FeatureFlagClient, FeatureFlagClientInitError, FeatureFlagClientOptions } from './client';
import { Experiments, Features } from './features';

describe('FeatureFlagClient', () => {
    let analyticsClient: any;
    let options: FeatureFlagClientOptions;
    const originalEnv = process.env;

    beforeEach(() => {
        analyticsClient = {
            sendOperationalEvent: jest.fn(),
            sendTrackEvent: jest.fn(),
        };
        options = {
            analyticsClient,
            identifiers: {
                analyticsAnonymousId: 'some-id',
            },
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
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    describe('initialize', () => {
        it('should initialize the feature flag client', async () => {
            jest.spyOn(FeatureGates, 'initialize');

            await FeatureFlagClient.initialize(options);
            expect(FeatureGates.initialize).toHaveBeenCalled();
        });

        it('should catch an error when the feature flag client fails to initialize', async () => {
            jest.spyOn(FeatureGates, 'initialize').mockRejectedValue('error');

            let error: FeatureFlagClientInitError = undefined!;

            try {
                await FeatureFlagClient.initialize(options);
            } catch (err) {
                error = err;
            }

            expect(FeatureGates.initialize).toHaveBeenCalled();
            expect(error).toBeDefined();
            expect(error.errorType).toBe(ClientInitializedErrorType.Failed);
        });

        it('should catch an error when the feature flag client skipped initialization', async () => {
            jest.spyOn(FeatureGates, 'initialize');
            process.env.ATLASCODE_FX3_API_KEY = '';

            let error: FeatureFlagClientInitError = undefined!;

            try {
                await FeatureFlagClient.initialize(options);
            } catch (err) {
                error = err;
            }

            expect(FeatureGates.initialize).not.toHaveBeenCalled();
            expect(error).toBeDefined();
            expect(error.errorType).toBe(ClientInitializedErrorType.Skipped);
        });

        it("should catch an error when the analyticsAnonymousId isn't set", async () => {
            jest.spyOn(FeatureGates, 'initialize');
            options.identifiers.analyticsAnonymousId = '';

            let error: FeatureFlagClientInitError = undefined!;

            try {
                await FeatureFlagClient.initialize(options);
            } catch (err) {
                error = err;
            }

            expect(FeatureGates.initialize).not.toHaveBeenCalled();
            expect(error).toBeDefined();
            expect(error.errorType).toBe(ClientInitializedErrorType.IdMissing);
        });

        it('checkGate returns what FeatureGates returns', async () => {
            await FeatureFlagClient.initialize(options);

            const mockedCheckGate = (name: string) => MockedFeatureGates_Features[name] ?? false;

            jest.spyOn(FeatureGates, 'initializeCompleted').mockReturnValue(true);
            jest.spyOn(FeatureGates, 'checkGate').mockImplementation(mockedCheckGate);

            expect(FeatureFlagClient.checkGate(forceCastTo<Features>('some-very-real-feature'))).toBeTruthy();
            expect(FeatureFlagClient.checkGate(forceCastTo<Features>('another-very-real-feature'))).toBeTruthy();
            expect(FeatureFlagClient.checkGate(forceCastTo<Features>('some-fake-feature'))).toBeFalsy();
        });

        it('if overrides are set, checkGate returns the overridden value', async () => {
            process.env.ATLASCODE_FF_OVERRIDES = `another-very-real-feature=false`;

            await FeatureFlagClient.initialize(options);

            const mockedCheckGate = (name: string) => MockedFeatureGates_Features[name] ?? false;

            jest.spyOn(FeatureGates, 'initializeCompleted').mockReturnValue(true);
            jest.spyOn(FeatureGates, 'checkGate').mockImplementation(mockedCheckGate);

            expect(FeatureFlagClient.checkGate(forceCastTo<Features>('some-very-real-feature'))).toBeTruthy();
            expect(FeatureFlagClient.checkGate(forceCastTo<Features>('another-very-real-feature'))).toBeFalsy();
            expect(FeatureFlagClient.checkGate(forceCastTo<Features>('some-fake-feature'))).toBeFalsy();
        });

        it('if FeatureGates is not initialized, checkGate always returns false', async () => {
            await FeatureFlagClient.initialize(options);

            jest.spyOn(FeatureGates, 'initializeCompleted').mockReturnValue(false);
            jest.spyOn(FeatureGates, 'checkGate');

            expect(FeatureFlagClient.checkGate(forceCastTo<Features>('some-very-real-feature'))).toBeFalsy();
            expect(FeatureFlagClient.checkGate(forceCastTo<Features>('another-very-real-feature'))).toBeFalsy();
            expect(FeatureFlagClient.checkGate(forceCastTo<Features>('some-fake-feature'))).toBeFalsy();

            expect(FeatureGates.checkGate).not.toHaveBeenCalled();
        });

        it('checkExperimentValue returns what FeatureGates returns', async () => {
            await FeatureFlagClient.initialize(options);

            const mockedGetExperimentValue = (name: string, param: string, defaultValue: any) => {
                const expData = MockExperimentGates[name];
                if (!expData || expData.parameter !== param) {
                    return undefined;
                }
                return 'returned value';
            };

            jest.spyOn(FeatureGates, 'initializeCompleted').mockReturnValue(true);
            jest.spyOn(FeatureGates, 'getExperimentValue').mockImplementation(mockedGetExperimentValue);

            expect(FeatureFlagClient.checkExperimentValue(forceCastTo<Experiments>('some-very-real-experiment'))).toBe(
                'returned value',
            );
            expect(FeatureFlagClient.checkExperimentValue(forceCastTo<Experiments>('another-exp-name'))).toBe(
                'returned value',
            );
            expect(
                FeatureFlagClient.checkExperimentValue(forceCastTo<Experiments>('one-more-exp-name')),
            ).toBeUndefined();
        });

        it('if overrides are set, getExperimentValue returns the overridden value', async () => {
            process.env.ATLASCODE_EXP_OVERRIDES_STRING = `another-exp-name=another value`;

            await FeatureFlagClient.initialize(options);

            const mockedGetExperimentValue = (name: string, param: string, defaultValue: any) => {
                const expData = MockExperimentGates[name];
                if (!expData || expData.parameter !== param) {
                    return undefined;
                }
                return 'returned value';
            };

            jest.spyOn(FeatureGates, 'initializeCompleted').mockReturnValue(true);
            jest.spyOn(FeatureGates, 'getExperimentValue').mockImplementation(mockedGetExperimentValue);

            expect(FeatureFlagClient.checkExperimentValue(forceCastTo<Experiments>('some-very-real-experiment'))).toBe(
                'returned value',
            );
            expect(FeatureFlagClient.checkExperimentValue(forceCastTo<Experiments>('another-exp-name'))).toBe(
                'another value',
            );
            expect(
                FeatureFlagClient.checkExperimentValue(forceCastTo<Experiments>('one-more-exp-name')),
            ).toBeUndefined();
        });

        it('if FeatureGates is not initialized, getExperimentValue returns the default value', async () => {
            await FeatureFlagClient.initialize(options);

            jest.spyOn(FeatureGates, 'initializeCompleted').mockReturnValue(false);
            jest.spyOn(FeatureGates, 'getExperimentValue');

            expect(FeatureFlagClient.checkExperimentValue(forceCastTo<Experiments>('some-very-real-experiment'))).toBe(
                'a default value',
            );
            expect(FeatureFlagClient.checkExperimentValue(forceCastTo<Experiments>('another-exp-name'))).toBe(
                'another default value',
            );
            expect(
                FeatureFlagClient.checkExperimentValue(forceCastTo<Experiments>('one-more-exp-name')),
            ).toBeUndefined();

            expect(FeatureGates.getExperimentValue).not.toHaveBeenCalled();
        });
    });
});
