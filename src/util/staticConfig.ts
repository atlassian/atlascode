// Matches FeatureGateEnvironment from @atlaskit/feature-gate-js-client without direct dependency
const validEnvironments = ['production', 'staging', 'development'];
type Environment = 'production' | 'staging' | 'development';

const resolveEnvironment = (envValue: string | undefined) => {
    const envVar = envValue || '';
    if (validEnvironments.includes(envVar)) {
        return envVar as Environment;
    }
    return 'development' as Environment;
};

/**
 * Feature flag client static configuration for AtlasCode.
 */
export const FX3Config = {
    apiKey: process.env.ATLASCODE_FX3_API_KEY || '',
    environment: resolveEnvironment(process.env.ATLASCODE_FX3_ENVIRONMENT),
    targetApp: process.env.ATLASCODE_FX3_TARGET_APP || '',
    timeout: Number(process.env.ATLASCODE_FX3_TIMEOUT) || 1000,
} as const;

export const isFX3ConfigValid = () => {
    return (
        FX3Config.apiKey !== '' &&
        FX3Config.targetApp !== '' &&
        validEnvironments.includes(FX3Config.environment) &&
        FX3Config.timeout > 0
    );
};
