import { isOsError, isOsErrorType, parseOsErrorMessage } from './osErrorParser';

describe('osErrorParser', () => {
    describe('isOsErrorType', () => {
        it('returns true for known OS error types', () => {
            expect(isOsErrorType('OSError')).toBe(true);
            expect(isOsErrorType('FileNotFoundError')).toBe(true);
            expect(isOsErrorType('PermissionError')).toBe(true);
            expect(isOsErrorType('BrokenPipeError')).toBe(true);
            expect(isOsErrorType('TimeoutError')).toBe(true);
        });

        it('returns false for unknown / non-OS types', () => {
            expect(isOsErrorType('ValueError')).toBe(false);
            expect(isOsErrorType('InvalidPromptError')).toBe(false);
            expect(isOsErrorType(undefined)).toBe(false);
            expect(isOsErrorType('')).toBe(false);
        });
    });

    describe('isOsError', () => {
        it('returns true when type is a known OS error type AND message starts with [Errno N]', () => {
            expect(isOsError('OSError', "[Errno 24] Too many open files: '/foo'")).toBe(true);
            expect(isOsError('FileNotFoundError', '[Errno 2] No such file or directory')).toBe(true);
        });

        it('returns false when type is unrelated, even if message looks like an OS error', () => {
            expect(isOsError('ValueError', '[Errno 24] Too many open files')).toBe(false);
        });

        it('returns false when message does not start with [Errno N]', () => {
            expect(isOsError('OSError', 'something else entirely')).toBe(false);
        });

        it('returns false when type or message is missing', () => {
            expect(isOsError(undefined, '[Errno 2] missing')).toBe(false);
            expect(isOsError('OSError', undefined)).toBe(false);
            expect(isOsError(undefined, undefined)).toBe(false);
        });
    });

    describe('parseOsErrorMessage', () => {
        it('parses a single-path message ([Errno 24] Too many open files)', () => {
            const result = parseOsErrorMessage(
                'OSError',
                "[Errno 24] Too many open files: '/workspace/a5cb5e0e-a782-4954-b234-53bde2403ea2/repository/.agents/skills/a11y-guidelines/scripts'",
                undefined,
            );

            expect(result).toEqual({
                event_kind: 'exception',
                type: 'OSError',
                title: undefined,
                message: '[Errno 24] Too many open files',
                params: [
                    "'/workspace/a5cb5e0e-a782-4954-b234-53bde2403ea2/repository/.agents/skills/a11y-guidelines/scripts'",
                ],
            });
        });

        it('parses a src -> dst message ([Errno 28] No space left on device)', () => {
            const result = parseOsErrorMessage(
                'OSError',
                "[Errno 28] No space left on device: 'adminhub/packages/pages/atlassian-intelligence/integration-tests/atlassian-intelligence.test.ts' -> '/workspace/.tmp/rovodev_cache_0v3qp38q/773d03063c7d6fd54ba18127ce6c6a67732633199551663a0b2651f152a6d6dc'",
                undefined,
            );

            expect(result).toEqual({
                event_kind: 'exception',
                type: 'OSError',
                title: undefined,
                message: '[Errno 28] No space left on device',
                params: [
                    "'adminhub/packages/pages/atlassian-intelligence/integration-tests/atlassian-intelligence.test.ts' -> '/workspace/.tmp/rovodev_cache_0v3qp38q/773d03063c7d6fd54ba18127ce6c6a67732633199551663a0b2651f152a6d6dc'",
                ],
            });
        });

        it('parses an Errno-only message (no extras)', () => {
            const result = parseOsErrorMessage('OSError', '[Errno 13] Permission denied', undefined);

            expect(result).toEqual({
                event_kind: 'exception',
                type: 'OSError',
                title: undefined,
                message: '[Errno 13] Permission denied',
                params: undefined,
            });
        });

        it('parses a broken pipe message (no path)', () => {
            const result = parseOsErrorMessage('BrokenPipeError', '[Errno 32] Broken pipe', undefined);

            expect(result).toEqual({
                event_kind: 'exception',
                type: 'BrokenPipeError',
                title: undefined,
                message: '[Errno 32] Broken pipe',
                params: undefined,
            });
        });

        it('preserves the provided title in the parsed response', () => {
            const result = parseOsErrorMessage('OSError', '[Errno 13] Permission denied', 'Something failed');

            expect(result).toEqual({
                event_kind: 'exception',
                type: 'OSError',
                title: 'Something failed',
                message: '[Errno 13] Permission denied',
                params: undefined,
            });
        });

        it('falls back to OSError when type is empty', () => {
            const result = parseOsErrorMessage('', '[Errno 2] No such file or directory', undefined);

            expect(result?.type).toBe('OSError');
        });

        it('returns null for non-matching messages', () => {
            expect(parseOsErrorMessage('OSError', 'Some random unrelated error', undefined)).toBeNull();
            expect(parseOsErrorMessage('OSError', '', undefined)).toBeNull();
        });

        it('handles unknown / large errno values without crashing', () => {
            const result = parseOsErrorMessage('OSError', "[Errno 9999] Something weird: '/tmp/foo'", undefined);
            expect(result).toEqual({
                event_kind: 'exception',
                type: 'OSError',
                title: undefined,
                message: '[Errno 9999] Something weird',
                params: ["'/tmp/foo'"],
            });
        });
    });
});
