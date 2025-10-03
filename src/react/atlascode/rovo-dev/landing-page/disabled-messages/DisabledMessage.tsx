import * as React from 'react';
import { State } from 'src/rovo-dev/rovoDevTypes';

import { DialogMessageItem } from '../../common/DialogMessage';
import { McpConsentChoice } from '../../rovoDevViewMessages';
import { inChatButtonStyles, inChatSecondaryButtonStyles } from '../../rovoDevViewStyles';

const messageOuterStyles: React.CSSProperties = {
    marginTop: '24px',
};

export const DisabledMessage: React.FC<{
    currentState: State;
    onLoginClick: () => void;
    onOpenFolder: () => void;
    onMcpChoice: (choice: McpConsentChoice, serverName?: string) => void;
}> = ({ currentState, onLoginClick, onOpenFolder, onMcpChoice }) => {
    if (currentState.state === 'Disabled' && currentState.subState === 'NeedAuth') {
        return (
            <div style={messageOuterStyles}>
                <div>Create an API token and add it here to use Rovo Dev beta</div>
                <button style={{ ...inChatButtonStyles, marginTop: '8px' }} onClick={onLoginClick}>
                    Add API Token
                </button>
            </div>
        );
    }

    if (currentState.state === 'Disabled' && currentState.subState === 'NoWorkspaceOpen') {
        return (
            <div style={messageOuterStyles}>
                <div>Please open a folder to start a chat session with Rovo Dev.</div>
                <button style={{ ...inChatButtonStyles, marginTop: '12px' }} onClick={onOpenFolder}>
                    Open folder
                </button>
            </div>
        );
    }

    if (currentState.state === 'Disabled' && currentState.subState === 'EntitlementCheckFailed') {
        return (
            <div style={{ ...messageOuterStyles, width: '100%' }}>
                <DialogMessageItem
                    msg={{
                        source: 'RovoDevDialog',
                        type: 'error',
                        title: currentState.detail.title,
                        text: currentState.detail.message,
                        statusCode: `Failure code: ${currentState.detail.payload.status}`,
                        uid: '',
                    }}
                />
            </div>
        );
    }

    if (currentState.state === 'Initializing' && currentState.subState === 'MCPAcceptance') {
        return (
            <div className="form-container" style={{ ...messageOuterStyles, textAlign: 'left', gap: '18px' }}>
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
                            <td
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    width: '100%',
                                    gap: '8px',
                                }}
                            >
                                <button
                                    style={inChatSecondaryButtonStyles}
                                    onClick={() => onMcpChoice('deny', serverName)}
                                >
                                    Deny
                                </button>
                                <button style={inChatButtonStyles} onClick={() => onMcpChoice('accept', serverName)}>
                                    Allow
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
        );
    }

    return null;
};
