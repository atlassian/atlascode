import { RovoDevExceptionResponse } from './responseParserInterfaces';

/**
 * The set of well-known exception type names that indicate this is an OS-level error.
 * Python's standard built-in exceptions for filesystem/OS errors all extend OSError, and
 * inherit `OSError.__str__()` which produces messages of the form
 *   "[Errno N] <description>"
 *   "[Errno N] <description>: '<path>'"
 *   "[Errno N] <description>: '<src>' -> '<dst>'"
 */
const OS_ERROR_TYPES: ReadonlySet<string> = new Set([
    'OSError',
    'IOError',
    'FileNotFoundError',
    'FileExistsError',
    'IsADirectoryError',
    'NotADirectoryError',
    'PermissionError',
    'BlockingIOError',
    'ChildProcessError',
    'BrokenPipeError',
    'ConnectionError',
    'ConnectionAbortedError',
    'ConnectionRefusedError',
    'ConnectionResetError',
    'InterruptedError',
    'TimeoutError',
]);

// Matches messages of the form:
//   "[Errno N] <description>"               (description only)
//   "[Errno N] <description>: <extras>"     (description plus extras - usually one or two paths)
// `extras` is captured verbatim - we don't try to further split it into individual paths.
const OS_ERROR_REGEX = /^\[Errno\s+(\d+)\]\s+([^:]+?)(?::\s+(.+))?\s*$/;

/**
 * Returns true if the given exception type name corresponds to a known OS-level error type.
 */
export function isOsErrorType(type: string | undefined): boolean {
    if (!type) {
        return false;
    }
    return OS_ERROR_TYPES.has(type);
}

/**
 * Returns true if this exception looks like a CLI OS-level error worth parsing - i.e. its
 * type is a known OSError subclass AND its message starts with the `[Errno N]` prefix.
 */
export const isOsError = (type: string | undefined, message: string | undefined): boolean => {
    return isOsErrorType(type) && Boolean(message && /^\[Errno\s+\d+\]/.test(message.trim()));
};

/**
 * Attempts to parse a CLI OS-level error message into a low-cardinality
 * `RovoDevExceptionResponse`.
 *
 * The returned response uses a sanitized message of the form `"[Errno N] <description>"`,
 * with any high-cardinality details (e.g. filenames / paths) moved into the `params`
 * array as additional telemetry context. This keeps the message suitable for grouping
 * while preserving the underlying details for debugging.
 *
 * Returns `null` if the message does not match the expected `[Errno N] ...` shape.
 */
export function parseOsErrorMessage(
    type: string,
    message: string,
    title: string | undefined,
): RovoDevExceptionResponse | null {
    if (!message) {
        return null;
    }

    const match = OS_ERROR_REGEX.exec(message.trim());
    if (!match) {
        return null;
    }

    const errno = parseInt(match[1], 10);
    const description = match[2].trim();
    const extras = match[3]?.trim();

    return {
        event_kind: 'exception',
        type: type || 'OSError',
        title: title,
        message: `[Errno ${errno}] ${description}`,
        params: extras ? [extras] : undefined,
    };
}
