import { ExperimentGateValues, Experiments, FeatureGateValues, Features } from '../features';

/**
 * Parses boolean override settings from environment variable format.
 * Format: "key1=true,key2=false"
 */
export function parseBoolOverride<T extends string>(setting: string): { key: T; value: boolean } | undefined {
    const trimmed = setting.trim();

    // Must contain '=' to be valid
    if (!trimmed.includes('=')) {
        return undefined;
    }

    const [key, valueRaw] = trimmed.split('=', 2).map((x) => x.trim());

    if (key) {
        const value = (valueRaw || '').toLowerCase() === 'true';
        return { key: key as T, value };
    }
    return undefined;
}

/**
 * Parses string override settings from environment variable format.
 * Format: "key1=value1,key2=value2"
 */
export function parseStringOverride<T extends string>(setting: string): { key: T; value: string } | undefined {
    const [key, value] = setting
        .trim()
        .split('=', 2)
        .map((x) => x.trim());
    if (key && value) {
        return { key: key as T, value };
    }
    return undefined;
}

/**
 * Parses feature gate overrides from environment variable string.
 * Format: "flag1=true,flag2=false"
 */
export function parseGateOverrides(envValue?: string): Partial<FeatureGateValues> {
    const overrides: Partial<FeatureGateValues> = {};

    if (envValue) {
        const ffSplit = envValue
            .split(',')
            .map((s) => parseBoolOverride<Features>(s))
            .filter((x): x is { key: Features; value: boolean } => !!x);

        for (const { key, value } of ffSplit) {
            overrides[key] = value;
        }
    }

    return overrides;
}

/**
 * Parses experiment overrides from environment variable strings.
 * Format:
 * - boolEnvValue: "exp1=true,exp2=false"
 * - stringEnvValue: "exp1=value1,exp2=value2"
 */
export function parseExperimentOverrides(
    boolEnvValue?: string,
    stringEnvValue?: string,
): Partial<ExperimentGateValues> {
    const overrides: Partial<ExperimentGateValues> = {};

    if (boolEnvValue) {
        const boolExpSplit = boolEnvValue
            .split(',')
            .map((s) => parseBoolOverride<Experiments>(s))
            .filter((x): x is { key: Experiments; value: boolean } => !!x);

        for (const { key, value } of boolExpSplit) {
            overrides[key] = value;
        }
    }

    if (stringEnvValue) {
        const strExpSplit = stringEnvValue
            .split(',')
            .map((s) => parseStringOverride<Experiments>(s))
            .filter((x): x is { key: Experiments; value: string } => !!x);

        for (const { key, value } of strExpSplit) {
            overrides[key] = value;
        }
    }

    return overrides;
}
