module.exports = {
    ...require('jest-mock-vscode').createVSCodeMock(jest),
    env: {
        uriScheme: 'vscode'
    }
}