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
