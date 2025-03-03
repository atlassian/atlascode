// tests for client.ts
enum MockFeatures {
    TestFeature = 'some-very-real-feature',
}

enum MockExperiments {
    TestExperiment = 'some-very-real-experiment',
}

const MockExperimentGates = {
    [MockExperiments.TestExperiment]: {
        parameter: 'isEnabled',
        defaultValue: false,
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
            checkGate: jest.fn(() => Promise.resolve(false)),
            getExperimentValue: jest.fn(() => Promise.resolve(false)),
        },
    };
});

import FeatureGates from '@atlaskit/feature-gate-js-client';
import { FeatureFlagClient, FeatureFlagClientOptions } from './client';
import { EventBuilderInterface } from './analytics';

class MockEventBuilder implements EventBuilderInterface {
    public featureFlagClientInitializedEvent = jest.fn(() => Promise.resolve({}));
    public featureFlagClientInitializationFailedEvent = jest.fn(() => Promise.resolve({}));
}

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
            expect(FeatureGates.checkGate).toHaveBeenCalled();
            expect(FeatureGates.getExperimentValue).toHaveBeenCalled();
        });

        it('should catch an error when the feature flag client fails to initialize', async () => {
            FeatureGates.initialize = jest.fn(() => Promise.reject('error'));
            await FeatureFlagClient.initialize(options);
            expect(FeatureGates.initialize).toHaveBeenCalled();
        });
    });
});
