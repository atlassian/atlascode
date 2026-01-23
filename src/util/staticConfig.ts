import { parseExperimentOverrides, parseGateOverrides } from './featureFlags/overrideParser';
// @ts-ignore - imported for when overrides are added
// eslint-disable-next-line no-unused-vars
import { Experiments, Features } from './features';

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
    return FX3Config.apiKey !== '' && FX3Config.targetApp !== '' && FX3Config.timeout > 0;
};

/**
 * Feature flag and experiment overrides.
 *
 * Override precedence: code-based > environment variables > remote flags.
 *
 * Environment variables (comma-separated key=value pairs):
 * - ATLASCODE_FF_OVERRIDES: "flag1=true,flag2=false"
 * - ATLASCODE_EXP_OVERRIDES_BOOL: "exp1=true,exp2=false"
 * - ATLASCODE_EXP_OVERRIDES_STRING: "exp1=value1,exp2=value2"
 *
 * Code-based: uncomment and edit the examples below
 */
export const FeatureFlagOverrides = {
    gates: {
        ...parseGateOverrides(process.env.ATLASCODE_FF_OVERRIDES),
        // Uncomment to add code-based feature gate overrides:
        // [Features.RovoDevEnabled]: true,
    },
    experiments: {
        ...parseExperimentOverrides(
            process.env.ATLASCODE_EXP_OVERRIDES_BOOL,
            process.env.ATLASCODE_EXP_OVERRIDES_STRING,
        ),
        // Uncomment to add code-based experiment overrides:
        // [Experiments.AtlascodeNewSettingsExperiment]: ['setting1', 'setting2'],
    },
};
