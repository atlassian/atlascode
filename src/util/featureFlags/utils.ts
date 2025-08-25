import FeatureGateClient from '@atlaskit/feature-gate-js-client/client';

// Helper module to correctly mock FeatureGateClient in tests
// (jest has some issues with @atlaskit/feature-gate-js-client/client)
export { FeatureGateClient };
