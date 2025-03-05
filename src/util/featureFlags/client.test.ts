enum MockFeatures {
    TestFeature = 'some-very-real-feature',
}

enum MockExperiments {
    TestExperiment = 'some-very-real-experiment',
}

const MockExperimentGates: Record<string, any> = {
    [MockExperiments.TestExperiment]: {
        parameter: 'isEnabled',
        defaultValue: 'a default value',
    },
};

jest.mock('./features', () => {
    return {
        Features: MockFeatures,
        Experiments: MockExperiments,
        ExperimentGates: MockExperimentGates,
    };
});

jest.mock('@atlaskit/feature-gate-js-client', () => {
    return {
        ...jest.requireActual('@atlaskit/feature-gate-js-client'),
        default: {
            initialize: jest.fn(() => Promise.resolve()),
            checkGate: jest.fn(() => false),
            getExperimentValue: jest.fn((key) => MockExperimentGates[key].defaultValue),
        },
    };
});

import FeatureGates from '@atlaskit/feature-gate-js-client';
import { FeatureFlagClient, FeatureFlagClientOptions } from './client';
import { EventBuilderInterface } from './analytics';
import { Experiments, Features } from './features';

class MockEventBuilder implements EventBuilderInterface {
    public featureFlagClientInitializedEvent = jest.fn(() => Promise.resolve({}));
    public featureFlagClientInitializationFailedEvent = jest.fn(() => Promise.resolve({}));
}

describe('FeatureFlagClient', () => {
    const featureName = MockFeatures.TestFeature as unknown as Features;
    const experimentName = MockExperiments.TestExperiment as unknown as Experiments;

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
            eventBuilder: new MockEventBuilder(),
        };
        process.env = {
            ...originalEnv,
            ATLASCODE_FX3_TARGET_APP: 'some-app',
            ATLASCODE_FX3_API_KEY: 'some-key',
            ATLASCODE_FX3_ENVIRONMENT: 'Production',
            ATLASCODE_FX3_TIMEOUT: '2000',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('initialize', () => {
        it('should initialize the feature flag client', async () => {
            await FeatureFlagClient.initialize(options);
            expect(FeatureGates.initialize).toHaveBeenCalled();
        });

        it('should catch an error when the feature flag client fails to initialize', async () => {
            FeatureGates.initialize = jest.fn(() => Promise.reject('error'));
            await FeatureFlagClient.initialize(options);
            expect(FeatureGates.initialize).toHaveBeenCalled();
        });

        it('feature flags default values are correctly assigned', async () => {
            await FeatureFlagClient.initialize(options);
            expect(FeatureGates.checkGate).toHaveBeenCalled();
            expect(Object.keys(FeatureFlagClient.featureGates).length).toBe(1);
            expect(FeatureFlagClient.featureGates[featureName]).toBeDefined();
            expect(FeatureFlagClient.featureGates[featureName]).toBe(false);
        });

        it('feature flags overrides are correctly applied', async () => {
            process.env.ATLASCODE_FF_OVERRIDES = `${featureName}=true`;
            await FeatureFlagClient.initialize(options);
            expect(FeatureFlagClient.featureGates[featureName]).toBeDefined();
            expect(FeatureFlagClient.featureGates[featureName]).toBe(true);
        });

        it('experiments default values are correctly assigned', async () => {
            await FeatureFlagClient.initialize(options);
            expect(FeatureGates.getExperimentValue).toHaveBeenCalled();
            expect(Object.keys(FeatureFlagClient.experimentValues).length).toBe(1);
            expect(FeatureFlagClient.experimentValues[experimentName]).toBeDefined();
            expect(FeatureFlagClient.experimentValues[experimentName]).toBe('a default value');
        });

        it('experiments overrides are correctly applied', async () => {
            process.env.ATLASCODE_EXP_OVERRIDES_STRING = `${experimentName}=another value`;
            await FeatureFlagClient.initialize(options);
            expect(FeatureFlagClient.experimentValues[experimentName]).toBeDefined();
            expect(FeatureFlagClient.experimentValues[experimentName]).toBe('another value');
        });
    });
});
