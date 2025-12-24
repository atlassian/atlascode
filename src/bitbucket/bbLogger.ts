import { Logger, retrieveCallerName } from '../logger';

export class BitbucketLogger extends Logger {
    public static override error(ex: Error, errorMessage?: string, ...params: string[]): void {
        // `retrieveCallerName` must be called from the VERY FIRST FUNCTION that the called invoked from Logger.
        // If not, the function will return the name of a method inside Logger.
        const callerName = retrieveCallerName();
        this.errorInternal('Bitbucket', ex, callerName, errorMessage, ...params);
    }

    public override error(ex: Error, errorMessage?: string, ...params: string[]): void {
        // `retrieveCallerName` must be called from the VERY FIRST FUNCTION that the called invoked from Logger.
        // If not, the function will return the name of a method inside Logger.
        const callerName = retrieveCallerName();
        this.errorInternal('Bitbucket', ex, callerName, errorMessage, ...params);
    }
}
