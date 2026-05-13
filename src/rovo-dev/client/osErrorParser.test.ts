import { isOsErrorType, parseOsErrorMessage, tryParseCliOsError } from './osErrorParser';

describe('osErrorParser', () => {
    describe('isOsErrorType', () => {
        it('returns true for known OS error types', () => {
            expect(isOsErrorType('OSError')).toBe(true);
            expect(isOsErrorType('FileNotFoundError')).toBe(true);
            expect(isOsErrorType('PermissionError')).toBe(true);
            expect(isOsErrorType('TimeoutError')).toBe(true);
        });

        it('returns false for unknown / non-OS types', () => {
            expect(isOsErrorType('ValueError')).toBe(false);
            expect(isOsErrorType('InvalidPromptError')).toBe(false);
            expect(isOsErrorType(undefined)).toBe(false);
            expect(isOsErrorType('')).toBe(false);
        });
    });

    describe('parseOsErrorMessage', () => {
        it('parses a single-path message ([Errno 24] Too many open files)', () => {
            const result = parseOsErrorMessage(
                "[Errno 24] Too many open files: '/workspace/a5cb5e0e-a782-4954-b234-53bde2403ea2/repository/.agents/skills/a11y-guidelines/scripts'",
            );

            expect(result).toEqual({
                errno: 24,
                errnoCode: 'EMFILE',
                errorDescription: 'Too many open files',
                sourcePath:
                    '/workspace/a5cb5e0e-a782-4954-b234-53bde2403ea2/repository/.agents/skills/a11y-guidelines/scripts',
                destinationPath: undefined,
                sanitizedMessage: '[EMFILE] Too many open files: <path>',
            });
        });

        it('parses a src -> dst message ([Errno 28] No space left on device)', () => {
            const result = parseOsErrorMessage(
                "[Errno 28] No space left on device: 'adminhub/packages/pages/atlassian-intelligence/integration-tests/atlassian-intelligence.test.ts' -> '/workspace/.tmp/rovodev_cache_0v3qp38q/773d03063c7d6fd54ba18127ce6c6a67732633199551663a0b2651f152a6d6dc'",
            );

            expect(result).toEqual({
                errno: 28,
                errnoCode: 'ENOSPC',
                errorDescription: 'No space left on device',
                sourcePath:
                    'adminhub/packages/pages/atlassian-intelligence/integration-tests/atlassian-intelligence.test.ts',
                destinationPath:
                    '/workspace/.tmp/rovodev_cache_0v3qp38q/773d03063c7d6fd54ba18127ce6c6a67732633199551663a0b2651f152a6d6dc',
                sanitizedMessage: '[ENOSPC] No space left on device: <src> -> <dst>',
            });
        });

        it('parses an Errno-only message (no path)', () => {
            const result = parseOsErrorMessage('[Errno 13] Permission denied');

            expect(result).toEqual({
                errno: 13,
                errnoCode: 'EACCES',
                errorDescription: 'Permission denied',
                sourcePath: undefined,
                destinationPath: undefined,
                sanitizedMessage: '[EACCES] Permission denied',
            });
        });

        it('falls back to ERRNO<n> for unknown errno values', () => {
            const result = parseOsErrorMessage("[Errno 9999] Something weird: '/tmp/foo'");
            expect(result?.errnoCode).toBe('ERRNO9999');
            expect(result?.sanitizedMessage).toBe('[ERRNO9999] Something weird: <path>');
        });

        it('returns undefined for non-matching messages', () => {
            expect(parseOsErrorMessage('Some random unrelated error')).toBeUndefined();
            expect(parseOsErrorMessage('')).toBeUndefined();
            expect(parseOsErrorMessage(undefined)).toBeUndefined();
        });

        it('handles double-quoted paths', () => {
            const result = parseOsErrorMessage('[Errno 2] No such file or directory: "/some/path"');
            expect(result?.sourcePath).toBe('/some/path');
            expect(result?.errnoCode).toBe('ENOENT');
        });
    });

    describe('tryParseCliOsError', () => {
        it('parses when type is a known OS error type', () => {
            const result = tryParseCliOsError('OSError', "[Errno 24] Too many open files: '/foo'");
            expect(result?.errnoCode).toBe('EMFILE');
            expect(result?.sourcePath).toBe('/foo');
        });

        it('parses even if type is unknown but message starts with [Errno N]', () => {
            const result = tryParseCliOsError('SomeRandomError', '[Errno 28] No space left on device');
            expect(result?.errnoCode).toBe('ENOSPC');
        });

        it('returns undefined when type is unrelated and message is not Errno-style', () => {
            expect(tryParseCliOsError('ValueError', 'invalid literal for int()')).toBeUndefined();
        });

        it('returns undefined when message is missing', () => {
            expect(tryParseCliOsError('OSError', undefined)).toBeUndefined();
        });
    });
});
