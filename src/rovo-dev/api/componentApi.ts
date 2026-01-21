/**
 * Commmands supported by the rovodev component
 */
export const RovodevCommands = {
    RovodevAsk: 'atlascode.rovodev.askRovoDev',
    RovodevAskInteractive: 'atlascode.rovodev.askInteractive',
    RovodevAddToContext: 'atlascode.rovodev.addToContext',
    RovodevSessionHistory: 'atlascode.rovodev.sessionHistory',
    RovodevNewSession: 'atlascode.rovodev.newChatSession',
    RovodevShareFeedback: 'atlascode.rovodev.shareFeedback',
    RovodevLogout: 'atlascode.rovodev.logout',
    OpenRovoDevConfig: 'atlascode.openRovoDevConfig',
    OpenRovoDevMcpJson: 'atlascode.openRovoDevMcpJson',
    OpenRovoDevGlobalMemory: 'atlascode.openRovoDevGlobalMemory',
    OpenRovoDevLogFile: 'atlascode.openRovoDevLogFile',
    FocusRovoDevWindow: 'atlascode.views.rovoDev.webView.focus',
    RestartProcess: 'atlascode.rovodev.restartProcess',
} as const;

/**
 * Command context releavant to the rovodev component
 */
export const RovodevCommandContext = {
    RovoDevEnabled: 'atlascode:rovoDevEnabled',
    RovoDevTerminalEnabled: 'atlascode:rovoDevTerminalEnabled',
    RovoDevApiReady: 'atlascode:rovoDevApiReady',
} as const;

// Type safety in case we need to refer to these elsewhere
export type RovodevCommand = (typeof RovodevCommands)[keyof typeof RovodevCommands];
export type RovodevCommandContextItem = (typeof RovodevCommandContext)[keyof typeof RovodevCommandContext];
