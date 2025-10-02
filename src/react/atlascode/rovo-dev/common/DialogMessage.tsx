import StatusErrorIcon from '@atlaskit/icon/core/status-error';
import StatusInfoIcon from '@atlaskit/icon/core/status-information';
import StatusWarningIcon from '@atlaskit/icon/core/status-warning';
import React from 'react';
import { RovoDevToolName } from 'src/rovo-dev/responseParserInterfaces';
import { ToolPermissionChoice } from 'src/rovo-dev/rovoDevApiClientInterfaces';

import {
    chatMessageStyles,
    errorMessageStyles,
    inChatButtonStyles,
    inChatSecondaryButtonStyles,
    messageContentStyles,
} from '../rovoDevViewStyles';
import { DialogMessage } from '../utils';
import { MarkedDown } from './common';

export const DialogMessageItem: React.FC<{
    msg: DialogMessage;
    isRetryAfterErrorButtonEnabled?: (uid: string) => boolean;
    retryAfterError?: () => void;
    onToolPermissionChoice?: (toolCallId: string, choice: ToolPermissionChoice) => void;
}> = ({ msg, isRetryAfterErrorButtonEnabled, retryAfterError, onToolPermissionChoice }) => {
    const [title, icon] = React.useMemo(() => {
        let title: string;
        let icon: React.JSX.Element;

        switch (msg.type) {
            case 'error':
                title = msg.title ?? 'Rovo Dev encountered an error';
                icon = <ErrorIcon title={title} />;
                return [title, icon];
            case 'warning':
                title = msg.title ?? 'Rovo Dev';
                icon = <WarningIcon title={title} />;
                return [title, icon];
            case 'info':
                title = msg.title ?? 'Rovo Dev';
                icon = <InfoIcon title={title} />;
                return [title, icon];
            case 'toolPermissionRequest':
                title = msg.title ?? 'Permission required';
                icon = <WarningIcon title={title} />;
                return [title, icon];
            default:
                // @ts-expect-error ts(2339) - `msg` here should be 'never'
                return [msg.title, <></>];
        }
    }, [msg.type, msg.title]);

    const showInDebugOnly = React.useMemo(() => msg.type === 'error' && msg.showOnlyInDebug, [msg]);

    return (
        <div className={showInDebugOnly ? 'debugOnly' : ''} style={{ ...chatMessageStyles, ...errorMessageStyles }}>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                {icon}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingTop: '2px',
                        paddingLeft: '2px',
                        width: 'calc(100% - 24px)',
                        overflowWrap: 'break-word',
                    }}
                >
                    <div style={messageContentStyles}>{title}</div>

                    {msg.text && (
                        <div style={messageContentStyles}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <MarkedDown value={msg.text} />
                            </div>
                        </div>
                    )}

                    {msg.type === 'toolPermissionRequest' && (
                        <ToolCall toolName={msg.toolName} toolArgs={msg.toolArgs} mcpServer={msg.mcpServer} />
                    )}

                    {msg.type === 'error' &&
                        msg.isRetriable &&
                        retryAfterError &&
                        isRetryAfterErrorButtonEnabled?.(msg.uid) && (
                            <div
                                style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: '8px' }}
                            >
                                <button style={inChatButtonStyles} onClick={retryAfterError}>
                                    Try again
                                </button>
                            </div>
                        )}
                    {msg.type === 'toolPermissionRequest' && onToolPermissionChoice && (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                width: '100%',
                                marginTop: '8px',
                                gap: '8px',
                            }}
                        >
                            <button
                                style={inChatSecondaryButtonStyles}
                                onClick={() => onToolPermissionChoice(msg.toolCallId, 'deny')}
                            >
                                Deny
                            </button>
                            <button
                                style={inChatButtonStyles}
                                onClick={() => onToolPermissionChoice(msg.toolCallId, 'allow')}
                            >
                                Allow
                            </button>
                        </div>
                    )}
                    {msg.statusCode && <div style={{ fontSize: 'smaller', textAlign: 'right' }}>{msg.statusCode}</div>}
                </div>
            </div>
        </div>
    );
};

const ErrorIcon: React.FC<{
    title: string;
}> = ({ title }) => (
    <div style={{ padding: '4px', color: 'var(--vscode-editorError-foreground)' }}>
        <StatusErrorIcon label={title} />
    </div>
);

const WarningIcon: React.FC<{
    title: string;
}> = ({ title }) => (
    <div style={{ padding: '4px', color: 'var(--vscode-editorWarning-foreground)' }}>
        <StatusWarningIcon label={title} />
    </div>
);

const InfoIcon: React.FC<{
    title: string;
}> = ({ title }) => (
    <div style={{ padding: '4px', color: 'var(--vscode-editorInfo-foreground)' }}>
        <StatusInfoIcon label={title} />
    </div>
);

const toolCallCodeBlockStyles: React.CSSProperties = {
    maxWidth: '100%',
    textWrap: 'wrap',
    overflowWrap: 'break-word',
};

const fileListStyles: React.CSSProperties = {
    margin: '0',
    paddingLeft: '20px',
    overflow: 'hidden',
};

const friendlyToolName: Record<RovoDevToolName, string> = {
    create_file: 'Create file',
    delete_file: 'Delete file',
    move_file: 'Move file',
    find_and_replace_code: 'Find and replace code',
    open_files: 'Read files',
    expand_code_chunks: 'Expand chunks of code',
    expand_folder: 'Expand folder',
    grep: 'Search for',
    bash: 'Run command',
    create_technical_plan: 'Create a technical plan',
    mcp_invoke_tool: "Invoke an MCP server's tool",
};

const ToolCall: React.FC<{
    toolName: RovoDevToolName;
    toolArgs: string;
    mcpServer?: string;
}> = ({ toolName, toolArgs, mcpServer }) => {
    const jsonArgs = React.useMemo(() => {
        try {
            return toolArgs ? JSON.parse(toolArgs) : {};
        } catch {
            return {};
        }
    }, [toolArgs]);

    const toolFriendlyName = React.useMemo(() => friendlyToolName[toolName] ?? toolName, [toolName]);

    return (
        <div>
            <div style={{ fontWeight: '600' }}>{toolFriendlyName}</div>
            <ToolCallBody toolName={toolName} jsonArgs={jsonArgs} toolArgs={toolArgs} mcpServer={mcpServer} />
        </div>
    );
};

const ToolCallBody: React.FC<{
    toolName: string;
    jsonArgs: any;
    toolArgs: string;
    mcpServer?: string;
}> = ({ toolName, jsonArgs, toolArgs, mcpServer }) => {
    if (toolName === 'bash') {
        return (
            <pre style={{ margin: '0' }}>
                <code style={toolCallCodeBlockStyles}>{jsonArgs.command}</code>
            </pre>
        );
    } else if (toolName === 'grep') {
        return <code style={toolCallCodeBlockStyles}>{jsonArgs.content_pattern}</code>;
    } else if (toolName === 'create_technical_plan') {
        return null;
    } else if (toolName === 'mcp_invoke_tool') {
        return (
            <table style={{ border: '0' }}>
                <tr>
                    <td style={{ paddingLeft: '8px' }}>Server:</td>
                    <td style={{ paddingLeft: '8px' }}>{mcpServer}</td>
                </tr>
                <tr>
                    <td style={{ paddingLeft: '8px' }}>Tool:</td>
                    <td style={{ paddingLeft: '8px' }}>{jsonArgs.tool_name}</td>
                </tr>
            </table>
        );
    } else if (Array.isArray(jsonArgs.file_paths)) {
        return (
            <ul style={fileListStyles}>
                {jsonArgs.file_paths.map((file: string) => (
                    <li>{file}</li>
                ))}
            </ul>
        );
    } else if (jsonArgs.file_path && Array.isArray(jsonArgs.line_ranges)) {
        return (
            <ul style={fileListStyles}>
                {Array.isArray(jsonArgs.line_ranges) &&
                    jsonArgs.line_ranges.map((range: [number, number]) =>
                        range[0] >= 0 && range[1] > 0 ? (
                            <li>
                                {jsonArgs.file_path}:[{range[0]}-{range[1]}]
                            </li>
                        ) : (
                            <li>{jsonArgs.file_path}</li>
                        ),
                    )}
            </ul>
        );
    } else if (jsonArgs.file_path) {
        return (
            <ul style={fileListStyles}>
                <li>{jsonArgs.file_path}</li>
            </ul>
        );
    } else {
        return <div>{toolArgs}</div>;
    }
};
