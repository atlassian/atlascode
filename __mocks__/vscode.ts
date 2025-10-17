module.exports = {
    ...require('jest-mock-vscode').createVSCodeMock(jest),
    env: {
        uriScheme: 'vscode',
        openExternal: jest.fn(),
        clipboard: {
            writeText: jest.fn(),
            readText: jest.fn(),
        },
    },
    extensions: {
        getExtension: jest.fn(() => ({
            isActive: true,
            exports: {},
            activate: jest.fn().mockResolvedValue({}),
        })),
    },    
}