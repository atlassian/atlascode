import * as React from 'react';
import { State } from 'src/rovo-dev/rovoDevTypes';

import { McpConsentChoice } from './rovoDevViewMessages';
import { inChatButtonStyles } from './rovoDevViewStyles';

const RovoDevImg = () => {
    return (
        <svg id="rovoDevLogo" width="52" height="58" viewBox="0 0 52 58" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M17.8855 3.68506L3.28863 12.1115C1.2503 13.2832 0 15.4486 0 17.801V40.2208C0 42.5639 1.25768 44.7388 3.28996 45.9111L6.75086 47.909L22.7086 57.121C24.7046 58.2722 27.1608 58.2927 29.173 57.1822C29.2095 57.1539 29.2482 57.1278 29.2893 57.1041C30.7232 56.277 31.7717 54.9506 32.2647 53.4185C32.4654 52.785 32.5714 52.1158 32.5714 51.4307V42.7462L24.1249 37.8724L21.691 36.468C19.0191 34.9315 17.3796 32.0906 17.3796 29.0109V6.59111C17.3796 5.68508 17.5228 4.79866 17.793 3.95969C17.8223 3.86756 17.8532 3.776 17.8855 3.68506Z"
            />
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M29.2914 0.879121C27.2954 -0.27227 24.8394 -0.292673 22.827 0.817917C22.7906 0.846179 22.7471 0.874978 22.7061 0.898682C21.2738 1.72636 20.2269 3.05224 19.7346 4.58379C19.5344 5.2166 19.4286 5.88509 19.4286 6.56941V15.2539L27.6135 19.9768L30.3097 21.5325C32.982 23.069 34.6204 25.9092 34.6204 28.9892V51.409C34.6204 52.3163 34.4768 53.2039 34.2059 54.0439C34.1769 54.1349 34.1464 54.2253 34.1145 54.3151L48.7114 45.8886C50.7497 44.7169 52 42.5515 52 40.1991V17.7793C52 15.4362 50.742 13.2612 48.7098 12.0889L44.9876 9.94016L29.2914 0.879121Z"
            />
        </svg>
    );
};

export const RovoDevLanding: React.FC<{
    currentState: State;
    onLoginClick: () => void;
    onOpenFolder: () => void;
    onMcpChoice: (choice: McpConsentChoice, serverName?: string) => void;
}> = ({ currentState, onLoginClick, onOpenFolder, onMcpChoice }) => {
    if (process.env.ROVODEV_BBY) {
        return null;
    }

    return (
        <div
            style={{
                display: 'flex',
                flexFlow: 'column',
                gap: '12px',
                alignItems: 'center',
                textAlign: 'center',
                padding: '12px 0',
                marginBottom: '12px',
            }}
        >
            <div>
                <RovoDevImg />
            </div>
            <div style={{ fontSize: '15px' }}>Welcome to Rovo Dev Beta</div>
            <div style={{ fontSize: '12px', maxWidth: '270px' }}>
                Rovo Dev can help you understand context of your repository, suggest and make updates.
            </div>

            {currentState.state === 'Disabled' && currentState.subState === 'NeedAuth' && (
                <div style={{ marginTop: '24px' }}>
                    <div>
                        <a
                            href="https://id.atlassian.com/manage-profile/security/api-token"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Create an API token
                        </a>{' '}
                        and then add it here to use RovoDev beta
                    </div>
                    <button style={{ ...inChatButtonStyles, marginTop: '8px' }} onClick={onLoginClick}>
                        Add API Token
                    </button>
                </div>
            )}

            {currentState.state === 'Disabled' && currentState.subState === 'NoWorkspaceOpen' && (
                <div style={{ marginTop: '24px' }}>
                    <div>Please open a folder to start a chat session with Rovo Dev.</div>
                    <button style={{ ...inChatButtonStyles, marginTop: '12px' }} onClick={onOpenFolder}>
                        Open folder
                    </button>
                </div>
            )}

            {currentState.state === 'Initializing' && currentState.subState === 'MCPAcceptance' && (
                <div className="form-container" style={{ marginTop: '24px', textAlign: 'left', gap: '18px' }}>
                    <div className="form-header">
                        <span className="codicon codicon-mcp"></span>
                        Third-party MCP server
                    </div>
                    <div>
                        Would you like to allow the use of the following third-party MCP{' '}
                        {currentState.mcpIds.length > 1 ? 'servers' : 'server'}?
                    </div>
                    <table style={{ border: '0' }}>
                        {currentState.mcpIds.map((serverName) => (
                            <tr>
                                <td style={{ width: '100%' }}>{serverName}</td>
                                <td>
                                    <button
                                        style={inChatButtonStyles}
                                        onClick={() => onMcpChoice('accept', serverName)}
                                    >
                                        Allow
                                    </button>
                                </td>
                                <td>
                                    <button style={inChatButtonStyles} onClick={() => onMcpChoice('deny', serverName)}>
                                        Deny
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </table>
                    {currentState.mcpIds.length > 1 && (
                        <div style={{ width: '100%', textAlign: 'right' }}>
                            <button style={inChatButtonStyles} onClick={() => onMcpChoice('acceptAll')}>
                                Allow all
                            </button>
                        </div>
                    )}
                    <div>When integrating with third-party products, please comply with their terms of use.</div>
                </div>
            )}
        </div>
    );
};
