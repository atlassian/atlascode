module.exports = {
    ...require('jest-mock-vscode').createVSCodeMock(jest),
    env: {
        uriScheme: 'vscode',
        openExternal: jest.fn(),
        clipboard: {
            writeText: jest.fn(),
            readText: jest.fn(),
        },
    }
}