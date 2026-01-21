/**
 * Sentry static configuration for AtlasCode.
 */
export const SentryConfigs = {
    enabled: process.env.SENTRY_ENABLED || '',
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.SENTRY_ENVIRONMENT || '',
    sampleRate: Number(process.env.SENTRY_SAMPLE_RATE) || 1000,
} as const;
