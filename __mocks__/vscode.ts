/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = {
    ...require('jest-mock-vscode').createVSCodeMock(jest),
    env: {
        uriScheme: 'vscode'
    },
    l10n: {
        t: (key: string, ...args: string[]) => key,
    }
}