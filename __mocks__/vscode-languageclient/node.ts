// Mock for vscode-languageclient/node
export const LanguageClient = jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(true),
}));

export const TransportKind = {
    stdio: 0,
    ipc: 1,
    pipe: 2,
    socket: 3,
};

export enum ErrorAction {
    Continue = 1,
    Shutdown = 2,
}

export enum CloseAction {
    DoNotRestart = 1,
    Restart = 2,
}

export type LanguageClientOptions = {
    documentSelector?: any;
    synchronize?: any;
    diagnosticCollectionName?: string;
    outputChannel?: any;
    errorHandler?: any;
};

export type ServerOptions = {
    run?: any;
    debug?: any;
};
