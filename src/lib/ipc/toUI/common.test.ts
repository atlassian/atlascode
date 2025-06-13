import {
    CommonMessageType,
    HostErrorMessage,
    PMFMessage,
    UpdateExperimentValuesMessage,
    UpdateFeatureFlagsMessage,
} from './common';

describe('Common IPC types', () => {
    describe('CommonMessageType enum', () => {
        it('should have correct enum values', () => {
            expect(CommonMessageType.Error).toBe('error');
            expect(CommonMessageType.PMFStatus).toBe('pmfStatus');
            expect(CommonMessageType.UpdateFeatureFlags).toBe('updateFeatureFlags');
            expect(CommonMessageType.UpdateExperimentValues).toBe('updateExperimentValues');
        });
    });

    describe('Interface type validation', () => {
        it('should validate HostErrorMessage interface', () => {
            const errorMessage: HostErrorMessage = {
                reason: 'Test error reason',
            };
            expect(errorMessage.reason).toBe('Test error reason');
        });

        it('should validate PMFMessage interface', () => {
            const pmfMessage: PMFMessage = {
                showPMF: true,
            };
            expect(pmfMessage.showPMF).toBe(true);

            const pmfMessageFalse: PMFMessage = {
                showPMF: false,
            };
            expect(pmfMessageFalse.showPMF).toBe(false);
        });

        it('should validate UpdateFeatureFlagsMessage interface', () => {
            const featureFlagsMessage: UpdateFeatureFlagsMessage = {
                featureFlags: {
                    feature1: true,
                    feature2: false,
                    feature3: true,
                },
            };
            expect(featureFlagsMessage.featureFlags['feature1']).toBe(true);
            expect(featureFlagsMessage.featureFlags['feature2']).toBe(false);
            expect(featureFlagsMessage.featureFlags['feature3']).toBe(true);
        });

        it('should validate UpdateExperimentValuesMessage interface', () => {
            const experimentMessage: UpdateExperimentValuesMessage = {
                experimentValues: {
                    experiment1: 'value1',
                    experiment2: 42,
                    experiment3: { nested: 'object' },
                },
            };
            expect(experimentMessage.experimentValues['experiment1']).toBe('value1');
            expect(experimentMessage.experimentValues['experiment2']).toBe(42);
            expect(experimentMessage.experimentValues['experiment3']).toEqual({ nested: 'object' });
        });
    });
});
