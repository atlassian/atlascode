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
};
