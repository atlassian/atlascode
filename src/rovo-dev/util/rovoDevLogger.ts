import { Logger, retrieveCallerName } from '../../logger';

export class RovoDevLogger extends Logger {
    /**
     * Current RovoDev session ID for automatic error tracking.
     * Checked by base Logger.errorInternal via dynamic property access to add sessionId to Sentry tags.
     * Protected to allow base class access via (this.constructor as any)._rovoDevSessionId.
     */
    protected static _rovoDevSessionId: string | undefined;

    /**
     * Sets the current RovoDev session ID for automatic error tracking.
     * Called by RovoDevTelemetryProvider when sessions start/change.
     */
    public static setSessionId(sessionId: string | undefined): void {
        RovoDevLogger._rovoDevSessionId = sessionId;
    }

    public static override error(ex: Error, errorMessage?: string, ...params: string[]): void {
        // `retrieveCallerName` must be called from the VERY FIRST FUNCTION that the called invoked from Logger.
        // If not, the function will return the name of a method inside Logger.
        const callerName = retrieveCallerName();
        this.errorInternal('RovoDev', ex, callerName, errorMessage, RovoDevLogger._rovoDevSessionId, ...params);
    }

    public override error(ex: Error, errorMessage?: string, ...params: string[]): void {
        // `retrieveCallerName` must be called from the VERY FIRST FUNCTION that the called invoked from Logger.
        // If not, the function will return the name of a method inside Logger.
        const callerName = retrieveCallerName();
        this.errorInternal('RovoDev', ex, callerName, errorMessage, RovoDevLogger._rovoDevSessionId, ...params);
    }
}
