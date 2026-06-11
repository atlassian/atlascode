/**
 * Rovodev static configuration values.
 * These values are set at build time via environment variables and baked
 * into the bundle by webpack's DefinePlugin.
 *
 * IMPORTANT: Each env var MUST be accessed as a LITERAL `process.env.X`
 * expression — DefinePlugin only performs string substitution on literal references.
 */
export const RovodevStaticConfig = {
    /** Is this a special BBY environment? Defaults to false */
    isBBY: process.env.ROVODEV_BBY === 'true',

    /** User ID override for BBY environment */
    bbyUserIdOverride: process.env.BBY_USERID || undefined,

    /** Has this sandbox been set up to accommodate a very large repo? Defaults to false */
    isSandboxVeryLargeRepo: process.env.SANDBOX_VERY_LARGE_REPO === 'true',

    /** Feature gate: rebrand "Rovo Dev" → "Jira Coding Agent" in Boysenberry environments. */
    get isRebrandJCA(): boolean {
        return process.env.ROVODEV_REBRAND_JCA === 'true';
    },
};

/**
 * Returns the user-facing product name.
 * In Boysenberry environments with the rebrand gate enabled, returns "Jira Coding Agent";
 * otherwise returns "Rovo Dev".
 */
export function getProductName(): string {
    return RovodevStaticConfig.isRebrandJCA ? 'Jira Coding Agent' : 'Rovo Dev';
}
