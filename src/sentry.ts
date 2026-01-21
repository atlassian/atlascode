/**
 * Sentry Error Tracking Service
 *
 * This service provides a singleton interface for capturing errors to Sentry.
 * It is initialized early in the extension lifecycle and captures errors logged
 * via Logger.error() automatically.
 */
import * as Sentry from '@sentry/node';
import { extensions } from 'vscode';

import { ExtensionId } from './constants';
import { Logger } from './logger';
import { RovodevStaticConfig } from './rovo-dev/api/rovodevStaticConfig';

export interface SentryConfig {
    enabled?: boolean; // Enable/disable Sentry (default: false)
    featureFlagEnabled?: boolean; // Feature flag status
    dsn?: string; // Sentry DSN URL (required if enabled)
    environment?: string; // Environment name (default: 'development')
    sampleRate?: number; // Sample rate 0.0-1.0 (default: 1.0)
    atlasCodeVersion?: string; // Version tag for events
    machineId?: string; // VS Code machine ID for tracking
    appInstanceId?: string; // Extension instance ID for tracking
}

export interface ErrorContext {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    breadcrumbs?: any[];
}

export class SentryService {
    private static _instance: SentryService;
    private initialized = false;
    private config: SentryConfig | null = null;
    private sentryClient: any = null;
    private analyticsCallback: ((error: string) => void) | undefined;

    private constructor() {}

    public static getInstance(): SentryService {
        if (!this._instance) {
            this._instance = new SentryService();
        }
        return this._instance;
    }

    /**
     * Initialize Sentry with the provided configuration.
     * This method detects the runtime environment and loads the appropriate SDK.
     *
     * @param config - Sentry configuration
     */
    public async initialize(config: SentryConfig, analyticsCallback?: (error: string) => void): Promise<void> {
        Logger.info('Sentry trying to be initialized for Node.js environment.');

        // If not enabled, silently return without initializing
        if (!config.enabled || !config.dsn || !config.featureFlagEnabled) {
            Logger.debug(
                'Sentry not enabled or missing configuration, skipping initialization.',
                JSON.stringify(config),
            );
            return;
        }
        this.analyticsCallback = analyticsCallback;

        try {
            this.config = config;

            // For Node.js environment (VS Code extension)
            Sentry.init({
                dsn: config.dsn,
                environment: config.environment || 'development',
                sampleRate: config.sampleRate ?? 1.0,
                tracesSampleRate: 0, // Disable transaction tracing
            });
            this.sentryClient = Sentry;
            Logger.debug('Sentry initialized for Node.js environment.');

            this.initialized = true;
        } catch (error) {
            // Silently fail - don't break extension startup
            Logger.debug(new Error('Failed to initialize Sentry:'), error);
            console.error('Failed to initialize Sentry:', error);
            this.initialized = false;
        }
    }

    /**
     * Capture an exception and send it to Sentry.
     * This method is called automatically by Logger.error().
     *
     * @param error - The error to capture
     * @param context - Additional context about the error
     */
    public captureException(error: Error, context?: ErrorContext): void {
        if (!this.initialized || !this.sentryClient) {
            return;
        }

        try {
            const scope = this.sentryClient.captureException(error, (scope: any) => {
                // Add tags
                if (context?.tags) {
                    Object.entries(context.tags).forEach(([key, value]) => {
                        scope.setTag(key, value);
                    });
                }

                // Set platform tag (in future, we might have 'web' or 'node' platforms)
                scope.setTag('platform', 'vscode');

                // Add version tag
                const atlascodeVersion = extensions.getExtension(ExtensionId)?.packageJSON.version;
                scope.setTag('atlascodeVersion', atlascodeVersion);

                // Add tracking tags for atlascode/rovodev transactions
                if (this.config?.machineId) {
                    scope.setTag('machineId', this.config.machineId);
                }
                if (this.config?.appInstanceId) {
                    scope.setTag('appInstanceId', this.config.appInstanceId);
                }

                scope.setTag('rovoDevEnv', RovodevStaticConfig.isBBY ? 'BBY' : 'IDE');

                // Add extra context
                if (context?.extra) {
                    scope.setContext('additional context', context.extra);
                }

                return scope;
            });

            return scope;
        } catch (err) {
            // Silently fail - don't break error logging
            console.error('Failed to capture exception in Sentry:', err);
            if (this.analyticsCallback) {
                this.analyticsCallback((err as Error).message);
            }
        }
    }

    /**
     * Check if Sentry is initialized and ready to capture errors.
     */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Get the current Sentry configuration.
     */
    public getConfig(): SentryConfig | null {
        return this.config;
    }
}

export const sentry = SentryService.getInstance();
