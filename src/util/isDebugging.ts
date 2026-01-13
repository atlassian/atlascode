export const isDebuggingRegex = /^--(debug|inspect)\b(-brk\b|(?!-))=?/;

let _isDebugging: boolean | undefined;

export function isDebugging() {
    if (_isDebugging === undefined) {
        try {
            const args = process.execArgv;

            _isDebugging = args ? args.some((arg) => isDebuggingRegex.test(arg)) : false;
        } catch {
            _isDebugging = false;
        }
    }

    return _isDebugging;
}
