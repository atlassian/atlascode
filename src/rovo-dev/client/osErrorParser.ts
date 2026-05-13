/**
 * Parser for OS-level errors emitted by the Rovo Dev CLI.
 *
 * The CLI surfaces Python `OSError` (and similar) exceptions whose `message` typically
 * has the form:
 *   "[Errno 24] Too many open files: '/some/path/here'"
 *   "[Errno 28] No space left on device: 'src/foo.ts' -> '/tmp/some/cache/path'"
 *
 * The included path(s) make the message extremely high-cardinality, which makes it
 * hard to aggregate and group these errors in telemetry. This parser pulls the
 * structured fields (errno, errno code, paths) out into separate properties, and
 * produces a sanitized message with the paths stripped out so that grouping is
 * stable.
 */

/**
 * Common Python errno codes mapped from numeric errno value. Only the most common
 * ones are included - if the errno isn't found here we fall back to "ERRNO<n>".
 */
const ERRNO_CODES: Record<number, string> = {
    1: 'EPERM',
    2: 'ENOENT',
    5: 'EIO',
    9: 'EBADF',
    11: 'EAGAIN',
    12: 'ENOMEM',
    13: 'EACCES',
    16: 'EBUSY',
    17: 'EEXIST',
    18: 'EXDEV',
    20: 'ENOTDIR',
    21: 'EISDIR',
    22: 'EINVAL',
    23: 'ENFILE',
    24: 'EMFILE',
    27: 'EFBIG',
    28: 'ENOSPC',
    30: 'EROFS',
    31: 'EMLINK',
    32: 'EPIPE',
    36: 'ENAMETOOLONG',
    39: 'ENOTEMPTY',
    63: 'ENAMETOOLONG',
};

/**
 * Result of parsing an OS-level CLI error message.
 */
export interface ParsedOsError {
    /** The numeric errno value (e.g. 24, 28) */
    errno: number;
    /** The errno symbolic code (e.g. "EMFILE", "ENOSPC"), or "ERRNO<n>" if unknown */
    errnoCode: string;
    /** Short, low-cardinality description of the error (e.g. "Too many open files") */
    errorDescription: string;
    /** Source path involved in the error, if present */
    sourcePath?: string;
    /** Destination path involved in the error (e.g. for rename/copy ops), if present */
    destinationPath?: string;
    /** A sanitized version of the message with paths removed - safe for telemetry grouping */
    sanitizedMessage: string;
}

/**
 * The set of well-known exception type names that indicate this is an OS-level error.
 * Python's standard built-in exceptions for filesystem/OS errors all extend OSError.
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
//   "[Errno N] <description>: '<path>'"               (single path)
//   "[Errno N] <description>: '<src>' -> '<dst>'"     (src -> dst)
//   "[Errno N] <description>"                         (no paths)
// Paths may be quoted with single or double quotes.
const OS_ERROR_REGEX = /^\[Errno\s+(\d+)\]\s+([^:]+?)(?::\s+(['"])(.+?)\3(?:\s*->\s*(['"])(.+?)\5)?)?\s*$/;

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
 * Attempts to parse a CLI OS-level error message.
 *
 * Returns a `ParsedOsError` if the message matches the expected `[Errno N] ...` format,
 * otherwise `undefined`.
 *
 * @param message The raw exception message from the CLI
 */
export function parseOsErrorMessage(message: string | undefined): ParsedOsError | undefined {
    if (!message) {
        return undefined;
    }

    const match = OS_ERROR_REGEX.exec(message.trim());
    if (!match) {
        return undefined;
    }

    const errno = parseInt(match[1], 10);
    const errnoCode = ERRNO_CODES[errno] ?? `ERRNO${errno}`;
    const errorDescription = match[2].trim();
    const sourcePath = match[4];
    const destinationPath = match[6];

    // Build a sanitized message with paths replaced by placeholders so that the message
    // has bounded cardinality and is suitable for telemetry grouping.
    let sanitizedMessage = `[${errnoCode}] ${errorDescription}`;
    if (sourcePath !== undefined) {
        sanitizedMessage += destinationPath !== undefined ? ': <src> -> <dst>' : ': <path>';
    }

    return {
        errno,
        errnoCode,
        errorDescription,
        sourcePath,
        destinationPath,
        sanitizedMessage,
    };
}

/**
 * Convenience helper: given an exception's `type` and `message`, returns a parsed
 * OS error if the type+message look like an OS-level CLI error, or `undefined`.
 *
 * This will also attempt to parse messages whose `type` is unknown/missing but
 * whose message strongly looks like an OS error (i.e. starts with `[Errno ...]`).
 */
export function tryParseCliOsError(type: string | undefined, message: string | undefined): ParsedOsError | undefined {
    if (!message) {
        return undefined;
    }
    if (isOsErrorType(type) || /^\[Errno\s+\d+\]/.test(message.trim())) {
        return parseOsErrorMessage(message);
    }
    return undefined;
}
