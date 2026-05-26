/**
 * Rovodev static configuration values.
 * These values are set at build time via environment variables.
 */
export const RovodevStaticConfig = {
    /** Is this a special BBY environment? Defaults to false */
    isBBY: process.env.ROVODEV_BBY === 'true',

    /** User ID override for BBY environment */
    bbyUserIdOverride: process.env.BBY_USERID || undefined,

    /** Has this sandbox been set up to accommodate a very large repo? Defaults to false */
    isSandboxVeryLargeRepo: process.env.SANDBOX_VERY_LARGE_REPO === 'true',

    /**
     * Feature gate: rebrand "Rovo Dev" → "Jira Coding Agent" in Boysenberry environments.
     * Requires both `ROVODEV_REBRAND_JCA=true` (rollout gate) and `ROVODEV_BBY=true` (Boysenberry context).
     * The env var controls when the rebrand is rolled out; the BBY check ensures it only applies in Boysenberry.
     * Defined as a getter so it is evaluated lazily at call time rather than once at module load.
     */
    get isRebrandJCA(): boolean {
        return process.env.ROVODEV_REBRAND_JCA === 'true' && process.env.ROVODEV_BBY === 'true';
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
