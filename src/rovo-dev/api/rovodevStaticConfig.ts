export const ROVO_DEV_PRODUCT_NAME = 'Rovo Dev';
export const JIRA_CODING_AGENT_PRODUCT_NAME = 'Jira Coding Agent';
export const ROVODEV_STATIC_CONFIG_GLOBAL = '__ROVODEV_STATIC_CONFIG__';

export interface RovoDevWebviewStaticConfig {
    productName: string;
    isRebrandJCA: boolean;
}

function getRuntimeEnv(): NodeJS.ProcessEnv | undefined {
    return typeof process !== 'undefined' ? process.env : undefined;
}

function getInjectedWebviewStaticConfig(): RovoDevWebviewStaticConfig | undefined {
    const browserGlobal = globalThis as typeof globalThis & {
        window?: Record<string, RovoDevWebviewStaticConfig | undefined>;
    };

    return browserGlobal.window?.[ROVODEV_STATIC_CONFIG_GLOBAL];
}

/**
 * `ROVODEV_REBRAND_JCA` is intentionally a runtime env var.
 * Unlike `ROVODEV_BBY`, which is baked into the separate Boysenberry build,
 * devai-sandbox sets this rollout flag after the shared BBY AtlasCode artifact
 * is built. Do not include it in webpack.env.config.js DefinePlugin env vars.
 */
export function isRebrandJCAEnabled(env: NodeJS.ProcessEnv | undefined = getRuntimeEnv()): boolean {
    return env?.ROVODEV_REBRAND_JCA === 'true';
}

export function getRovoDevWebviewStaticConfig(): RovoDevWebviewStaticConfig {
    const isRebrandJCA = isRebrandJCAEnabled();

    return {
        productName: isRebrandJCA ? JIRA_CODING_AGENT_PRODUCT_NAME : ROVO_DEV_PRODUCT_NAME,
        isRebrandJCA,
    };
}

/**
 * Rovodev static configuration values.
 */
export const RovodevStaticConfig = {
    /** Is this a special BBY environment? Defaults to false */
    isBBY: process.env.ROVODEV_BBY === 'true',

    /** User ID override for BBY environment */
    bbyUserIdOverride: process.env.BBY_USERID || undefined,

    /** Has this sandbox been set up to accommodate a very large repo? Defaults to false */
    isSandboxVeryLargeRepo: process.env.SANDBOX_VERY_LARGE_REPO === 'true',

    /**
     * Feature gate: rebrand "Rovo Dev" → "Jira Coding Agent".
     * Set `ROVODEV_REBRAND_JCA=true` to enable. In webviews, this is injected by
     * the extension host before the React bundle loads so first render is correct.
     */
    get isRebrandJCA(): boolean {
        return getInjectedWebviewStaticConfig()?.isRebrandJCA ?? isRebrandJCAEnabled();
    },
};

/**
 * Returns the user-facing product name.
 */
export function getProductName(): string {
    return (
        getInjectedWebviewStaticConfig()?.productName ??
        (RovodevStaticConfig.isRebrandJCA ? JIRA_CODING_AGENT_PRODUCT_NAME : ROVO_DEV_PRODUCT_NAME)
    );
}
