import { RovoDevExceptionResponse } from './client';

export function buildExceptionDetails(response: RovoDevExceptionResponse): string {
    const sections: string[] = [];

    // Add error code and type
    if (response.type) {
        sections.push(`Error Code: ${response.type}`);
    }

    // Add full message
    if (response.message) {
        sections.push(`Message: ${response.message}`);
    }

    // Surface structured details for OS-level errors so users / support can see them clearly
    if (response.parsedOsError) {
        const { errno, errnoCode, errorDescription, sourcePath, destinationPath } = response.parsedOsError;
        const osDetails: string[] = [
            `Errno: ${errno} (${errnoCode})`,
            `Description: ${errorDescription}`,
        ];
        if (sourcePath) {
            osDetails.push(`Path: ${sourcePath}`);
        }
        if (destinationPath) {
            osDetails.push(`Destination Path: ${destinationPath}`);
        }
        sections.push(osDetails.join('\n'));
    }

    return sections.join('\n\n');
}

export function buildErrorDetails(error: Error & { gitErrorCode?: string }): string {
    const sections: string[] = [];

    // Add stack trace if available
    if (error.stack) {
        sections.push('Stack Trace:\n' + error.stack);
    }

    // Add error name and type
    if (error.name && error.name !== 'Error') {
        sections.push(`Error Type: ${error.name}`);
    }

    // Add git error code if available
    if (error.gitErrorCode) {
        sections.push(`Git Error Code: ${error.gitErrorCode}`);
    }

    return sections.join('\n\n');
}
